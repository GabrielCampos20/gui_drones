"""
start.py — Inicializa todos os serviços do gui_drones em ordem:
  1. Banco de dados (Docker)
  2. Prisma generate + migrate
  3. Backend (Node/Express)
  4. Frontend (Vite/React)

Uso:
  python start.py        (Windows e Linux)
"""

import subprocess
import threading
import sys
import os
import signal
import time
import shutil
import socket

# ─── Detecção de SO ───────────────────────────────────────────────────────────

IS_WINDOWS = sys.platform == "win32"

# ─── Caminhos ─────────────────────────────────────────────────────────────────

ROOT        = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

# ─── Cores ANSI ───────────────────────────────────────────────────────────────

class Color:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    CYAN    = "\033[96m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    RED     = "\033[91m"
    BLUE    = "\033[94m"
    MAGENTA = "\033[95m"

def log(prefix: str, color: str, message: str):
    print(f"{color}{Color.BOLD}[{prefix}]{Color.RESET} {message}", flush=True)

def info(msg):    log("INFO", Color.CYAN,   msg)
def success(msg): log("OK",   Color.GREEN,  msg)
def warn(msg):    log("WARN", Color.YELLOW, msg)
def error(msg):   log("ERRO", Color.RED,    msg)

# ─── Resolução de executáveis ─────────────────────────────────────────────────

def resolve(name: str) -> str:
    """
    Retorna o caminho completo do executável.
    No Windows, procura <name>.cmd no PATH antes do <name> puro.
    """
    if IS_WINDOWS:
        candidate = shutil.which(name + ".cmd")
        if candidate:
            return candidate
    found = shutil.which(name)
    if found:
        return found
    return name  # fallback — deixa o SO tentar e falhar com mensagem clara


NPM  = resolve("npm")
NPX  = resolve("npx")
DC   = resolve("docker-compose")   # docker-compose (v1) ou docker compose (v2) via wrapper

# ─── Processos em execução (para cleanup) ─────────────────────────────────────

running_procs: list[subprocess.Popen] = []

def cleanup(sig=None, frame=None):
    print(f"\n{Color.YELLOW}{Color.BOLD}Encerrando serviços...{Color.RESET}")
    for proc in running_procs:
        try:
            if IS_WINDOWS:
                # Envia CTRL_BREAK ao grupo de processos — encerra sem prompt de batch
                os.kill(proc.pid, signal.CTRL_BREAK_EVENT)  # type: ignore[attr-defined]
            else:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception:
            pass
        # Aguarda até 1s para encerrar graciosamente, depois força
        try:
            proc.wait(timeout=1)
        except Exception:
            proc.kill()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, cleanup)

# ─── Utilitários ──────────────────────────────────────────────────────────────

def run_step(label: str, cmd: list[str], cwd: str) -> bool:
    """Roda um comando de forma síncrona. Retorna True se OK."""
    info(f"Executando: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            text=True,
            capture_output=True,
            # shell=False no Windows também funciona quando o caminho é resolvido
            # via shutil.which — mantemos False para segurança em ambos os SOs
        )
        if result.returncode != 0:
            error(f"{label} falhou (código {result.returncode})")
            output = (result.stderr or result.stdout or "").strip()
            if output:
                print(Color.RED + output + Color.RESET)
            return False
        success(f"{label} concluído.")
        return True
    except FileNotFoundError as e:
        error(f"Executável não encontrado: {e}")
        return False


def stream_proc(label: str, color: str, proc: subprocess.Popen):
    """Lê stdout de um processo em background e imprime com prefixo colorido."""
    prefix = f"{color}{Color.BOLD}[{label}]{Color.RESET}"
    try:
        for line in proc.stdout:  # type: ignore
            print(f"{prefix} {line}", end="", flush=True)
    except Exception:
        pass


def start_service(label: str, color: str, cmd: list[str], cwd: str) -> subprocess.Popen:
    """Inicia um serviço em background e registra para cleanup."""
    info(f"Iniciando {label}...")

    kwargs: dict = dict(
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    if IS_WINDOWS:
        # CREATE_NEW_PROCESS_GROUP permite enviar CTRL_BREAK_EVENT sem prompt de batch
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        # No Linux, cria um process group próprio para killpg funcionar
        kwargs["start_new_session"] = True

    proc = subprocess.Popen(cmd, **kwargs)
    running_procs.append(proc)

    t = threading.Thread(target=stream_proc, args=(label, color, proc), daemon=True)
    t.start()
    return proc


def wait_for_postgres(max_attempts: int = 15) -> bool:
    """Aguarda o PostgreSQL aceitar conexões via docker-compose exec."""
    info("Aguardando PostgreSQL ficar pronto...")
    for attempt in range(1, max_attempts + 1):
        check = subprocess.run(
            [DC, "exec", "-T", "db", "pg_isready", "-U", "postgres"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if check.returncode == 0:
            success("PostgreSQL pronto.")
            return True
        warn(f"Aguardando... ({attempt}/{max_attempts})")
        time.sleep(2)
    return False

def is_postgres_port_open() -> bool:
    """Verifica se a porta 5432 já está aberta localmente (PostgreSQL nativo rodando)."""
    try:
        with socket.create_connection(("localhost", 5432), timeout=1):
            return True
    except OSError:
        return False

# ─── Verificações de dependência ──────────────────────────────────────────────

def check_deps():
    deps = {"npm": NPM, "npx": NPX}
    if not is_postgres_port_open():
        deps["docker-compose ou docker"] = DC
    
    missing = []
    for name, path in deps.items():
        if not shutil.which(path):
            missing.append(name)
    if missing:
        error("Dependências não encontradas no PATH:")
        for m in missing:
            print(f"  {Color.RED}✗ {m}{Color.RESET}")
        print(f"\n  Instale as dependências e tente novamente.")
        sys.exit(1)

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    # Habilita suporte a cores ANSI no terminal Windows (PowerShell/CMD)
    if IS_WINDOWS:
        os.system("")

    print(f"""
{Color.CYAN}{Color.BOLD}
╔══════════════════════════════════════╗
║        🚁  gui_drones  startup       ║
║  SO: {"Windows" if IS_WINDOWS else "Linux/macOS":<30}║
╚══════════════════════════════════════╝
{Color.RESET}""")

    # Verifica dependências antes de começar
    check_deps()

    # 1. Docker — banco de dados
    if is_postgres_port_open():
        success("PostgreSQL local nativo detectado na porta 5432. Pulando inicialização do Docker.")
    else:
        info("Subindo o banco de dados (Docker)...")
        ok = run_step("Docker DB", [DC, "up", "-d", "db"], cwd=ROOT)
        if not ok:
            error("Não foi possível subir o banco. Verifique se o Docker está rodando ou se tem um PostgreSQL nativo ativo.")
            sys.exit(1)

        # 2. Aguarda PostgreSQL
        if not wait_for_postgres():
            error("PostgreSQL não respondeu a tempo. Verifique os logs: docker-compose logs db")
            sys.exit(1)

    # 3. Prisma generate
    ok = run_step("Prisma Generate", [NPX, "prisma", "generate"], cwd=BACKEND_DIR)
    if not ok:
        sys.exit(1)

    # 4. Prisma migrate deploy
    ok = run_step("Prisma Migrate", [NPX, "prisma", "migrate", "deploy"], cwd=BACKEND_DIR)
    if not ok:
        sys.exit(1)

    # 5. Backend
    start_service("BACKEND",  Color.BLUE,    [NPM, "run", "dev"], cwd=BACKEND_DIR)

    # Pausa para o backend inicializar antes do frontend
    time.sleep(3)

    # 6. Frontend
    start_service("FRONTEND", Color.MAGENTA, [NPM, "run", "dev"], cwd=FRONTEND_DIR)

    print(f"""
{Color.GREEN}{Color.BOLD}
  ✓ Todos os serviços estão rodando!

    Frontend  →  http://localhost:5173
    Backend   →  http://localhost:3000
    Banco     →  localhost:5432

  Pressione Ctrl+C para encerrar tudo.
{Color.RESET}""")

    # Mantém o script vivo e monitora os processos
    while True:
        time.sleep(2)
        for proc in list(running_procs):
            if proc.poll() is not None:
                warn(f"Um serviço encerrou inesperadamente (PID {proc.pid}). Verifique os logs acima.")
                running_procs.remove(proc)


if __name__ == "__main__":
    main()
