# 🚁 GUI Drones — Plataforma de Simulação de Entrega por Drones

Interface web full-stack para configurar e executar simuladores de entrega por drones. O usuário configura os parâmetros da simulação pelo navegador, o backend gera o arquivo de configuração, executa o simulador Java (`.jar`) e armazena os resultados no banco de dados PostgreSQL.

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Simuladores Disponíveis](#simuladores-disponíveis)
- [Autenticação](#autenticação)
- [Banco de Dados](#banco-de-dados)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Como Rodar](#como-rodar)
- [Rotas da API (Backend)](#rotas-da-api-backend)
- [Rotas do Frontend](#rotas-do-frontend)
- [Contribuindo](#contribuindo)

---

## Visão Geral

A plataforma permite que usuários autenticados:

1. Escolham entre diferentes simuladores de entrega por drones
2. Configurem os parâmetros de simulação via formulário web
3. Disparem a execução do simulador Java no servidor
4. Consultem os resultados gerados (logs, CSVs de métricas)

---

## Arquitetura

```
gui_drones/
├── frontend/          # React + Vite (porta 5173)
├── backend/           # Node.js + Express (porta 3000)
├── sims/              # Simulador Java (.jar) + config.properties
├── docker-compose.yml # Orquestração dos 3 serviços
├── start.py           # Script de inicialização completa (recomendado)
├── .env               # Variáveis de ambiente da raiz (Docker)
└── README.md
```

### Fluxo de dados

```
Browser → Frontend (React) → Backend (Express) → Executa .jar → PostgreSQL
                                                              ↘ Arquivos CSV/Log
```

---

## Tecnologias

### Frontend

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19 | Framework de UI |
| Vite | 8 | Bundler e dev server |
| TypeScript | 6 | Tipagem estática |
| TailwindCSS | 4 | Estilização |
| React Router DOM | 7 | Roteamento SPA |
| React Hook Form | 7 | Gerenciamento de formulários |
| Zod | 3 | Validação de schemas |
| Axios | 1 | Requisições HTTP |
| Sonner | 1 | Notificações (toasts) |
| Lucide React | 1 | Ícones |

### Backend

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | — | Runtime |
| Express | 5 | Framework HTTP |
| TypeScript | 6 | Tipagem estática |
| Prisma | 7 | ORM e migrações |
| PostgreSQL | 16 | Banco de dados |
| bcrypt | — | Hash de senhas |
| jsonwebtoken | — | Geração e validação de JWT |
| Zod | 3 | Validação de entradas |
| dotenv | — | Variáveis de ambiente |
| CORS | — | Cross-origin requests |

### Infraestrutura

| Tecnologia | Uso |
|---|---|
| Docker + Docker Compose | Orquestração dos serviços |
| PostgreSQL 16 (Alpine) | Banco de dados via container |
| Java (`.jar`) | Motor dos simuladores |

---

## Estrutura de Pastas

```
gui_drones/
│
├── frontend/
│   └── src/
│       ├── contexts/
│       │   └── AuthContext.tsx          # Estado global de autenticação (sessão em memória)
│       ├── components/
│       │   └── ui/
│       │       ├── PageShell.tsx        # Layout base + header com usuário logado e nav
│       │       ├── SimulatorCard.tsx    # Card de seleção de simulador
│       │       └── PrivateRoute.tsx     # Guard de rotas protegidas
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx        # Tela de login
│       │   │   └── RegisterPage.tsx     # Tela de cadastro
│       │   ├── home/
│       │   │   └── HomePage.tsx         # Seleção de simulador
│       │   ├── history/
│       │   │   └── HistoryPage.tsx      # Histórico de execuções com tabela e status
│       │   ├── simulators/
│       │   │   ├── SimulationStatusPage.tsx          # Feedback de execução com polling
│       │   │   ├── drone-delivery/
│       │   │   │   └── DroneDeliveryConfigPage.tsx   # Formulário Drone Delivery
│       │   │   └── shared-drone-delivery/
│       │   │       └── SharedDroneConfigPage.tsx     # Formulário Shared Drone (em desenvolvimento)
│       │   └── NotFoundPage.tsx             # Página 404 customizada
│       ├── services/
│       │   └── executions.ts            # Serviço de API para execuções (axios)
│       ├── App.tsx                      # Raiz da aplicação (AuthProvider + Toaster)
│       ├── routes.tsx                   # Definição de rotas (públicas e protegidas)
│       ├── main.tsx                     # Entry point React
│       ├── index.css                    # Tokens de design (CSS custom properties)
│       └── .env.example                 # Exemplo de variáveis de ambiente
│
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts                # Singleton do Prisma Client
│   │   ├── routes/
│   │   │   └── auth.ts                  # Rotas POST /auth/register e /auth/login
│   │   └── index.ts                     # Entry point Express (cors + rotas)
│   ├── prisma/
│   │   ├── schema.prisma                # Schema do banco (User + Execution)
│   │   └── migrations/                  # Histórico de migrações
│   ├── prisma.config.ts
│   ├── .env                             # Variáveis locais (DATABASE_URL, JWT_SECRET)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── sims/
│   ├── DroneDeliverySim.jar             # Simulador Java (motor)
│   └── config.properties                # Parâmetros padrão da simulação
│
├── docker-compose.yml
├── start.py                             # Script Python de inicialização
├── .env                                 # Variáveis Docker Compose
└── README.md
```

---

## Simuladores Disponíveis

### 1. Drone Delivery Sim
Simulador básico de entrega de pacotes por drones entre pontos designados.

**Parâmetros configuráveis:**

| Parâmetro | Descrição |
|---|---|
| `drones` | Lista de configurações de drones (ex: `100,200,300`) |
| `ar.min` | Taxa de chegada mínima (float) |
| `ar.max` | Taxa de chegada máxima (float) |
| `xPointQuantity` | Quantidade de pontos no eixo X |
| `maxQueueSize` | Tamanho máximo da fila |
| `totalPackages` | Total de pacotes na simulação |
| `simulationNumber` | Número de execuções da simulação |

### 2. Shared Drone Delivery Sim *(em desenvolvimento)*
Simulador avançado com drones compartilhados entre múltiplos armazéns, focado em otimização de rotas e alocação de recursos.

---

## Autenticação

O sistema utiliza **JWT** com sessão **apenas em memória** — sem persistência entre sessões.

### Comportamento de sessão

> A sessão é armazenada somente em memória (sem `localStorage`). Toda vez que o app é aberto ou recarregado, o usuário precisa fazer login novamente.

### Fluxo

```
App iniciado → sempre redireciona para /login (sem sessão salva)
Login/Cadastro bem-sucedido → token em memória + axios header → redireciona para /
Logout → token removido da memória → redireciona para /login
```

### Header de usuário logado

Após o login, todas as páginas protegidas exibem um **header fixo** no topo com:
- **Nome do usuário** logado (com ícone de pessoa)
- **Botão "Sair"** que encerra a sessão e redireciona para `/login`

### Token

Após login, o token JWT é automaticamente injetado em todas as requisições `axios`:

```
Authorization: Bearer <token>
```

### Tipo `User`

```ts
type User = {
    id: string
    name: string
}
```

### Contexto de Autenticação (`AuthContext`)

Disponibiliza para toda a aplicação:

```ts
const { user, token, isAuthenticated, isLoading, login, register, logout } = useAuth()

// Assinaturas
login(name: string, password: string): Promise<void>
register(name: string, password: string): Promise<void>
logout(): void
```

---

## Banco de Dados

**PostgreSQL 16** gerenciado via **Prisma ORM**.

### Modelo `User`

Armazena os usuários cadastrados:

```prisma
model User {
  id           String      @id @default(cuid())
  name         String      @unique
  passwordHash String
  createdAt    DateTime    @default(now())

  executions   Execution[]
}
```

### Modelo `Execution`

Registra cada execução do simulador (vinculada ao usuário que disparou):

```prisma
model Execution {
  id                    String    @id @default(cuid())
  simulator             String    // "drone-delivery" | "shared-drone-delivery"
  propertiesContent     String    // Conteúdo do config.properties usado
  startedAt             DateTime  @default(now())
  finishedAt            DateTime?

  logPath               String?   // Caminho do arquivo de log
  queueTimeCsvPath      String?   // CSV — tempo de fila
  missionTimeCsvPath    String?   // CSV — tempo de missão
  flightTimeCsvPath     String?   // CSV — tempo de voo
  dropProbabilityCsvPath String?  // CSV — probabilidade de queda

  userId  String?
  user    User?   @relation(fields: [userId], references: [id])
}
```

### Migrações aplicadas

| Migration | Descrição |
|---|---|
| `20260522193522_init` | Criação da tabela `Execution` |
| `add_user` | Criação da tabela `User` + relação com `Execution` |

---

## Variáveis de Ambiente

### `.env` (raiz — usado pelo Docker Compose)

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=drone_sim
DATABASE_URL=postgresql://postgres:postgres@db:5432/drone_sim
```

### `backend/.env` (desenvolvimento local)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/drone_sim"
JWT_SECRET="drone-sim-secret-change-in-production"
```

> ⚠️ Troque o valor de `JWT_SECRET` em produção por uma string longa e aleatória.

### `frontend/.env` (opcional)

```env
VITE_API_URL=http://localhost:3000
```

> Se `VITE_API_URL` não for definido, o frontend usará `http://localhost:3000` como padrão.

---

## Como Rodar

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/) instalado e **aberto**
- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.8+ (para o script de startup)

---

### ⚡ Modo Rápido — `start.py` (recomendado)

O script `start.py` inicializa todos os serviços em ordem com um único comando:

```bash
python start.py
```

**O que ele faz, em ordem:**

| Passo | Ação |
|---|---|
| 1 | Verifica dependências (`docker-compose`, `npm`, `npx`) |
| 2 | Sobe o container do PostgreSQL (`docker-compose up -d db`) |
| 3 | Aguarda o banco ficar pronto (`pg_isready`) |
| 4 | Executa `prisma generate` |
| 5 | Executa `prisma migrate deploy` (aplica migrações pendentes) |
| 6 | Inicia o backend em background (porta 3000) |
| 7 | Inicia o frontend em background (porta 5173) |

O output de cada serviço aparece prefixado e colorido no mesmo terminal:
- `[BACKEND]` → azul
- `[FRONTEND]` → magenta

Pressione **Ctrl+C** para encerrar todos os serviços de uma vez (sem prompts no Windows).

---

### Modo Manual (passo a passo)

**1. Banco de dados:**

```bash
# Na raiz do projeto (Docker Desktop deve estar aberto)
docker-compose up -d db
```

**2. Backend:**

```bash
cd backend
npm install
# Certifique-se que backend/.env existe com DATABASE_URL e JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run dev
```

**3. Frontend:**

```bash
cd frontend
npm install
npm run dev
```

---

## Rotas da API (Backend)

### Autenticação

| Método | Rota | Body | Resposta |
|---|---|---|---|
| `POST` | `/auth/register` | `{ name, password }` | `{ token, user: { id, name } }` |
| `POST` | `/auth/login` | `{ name, password }` | `{ token, user: { id, name } }` |

### Saúde

| Método | Rota | Resposta |
|---|---|---|
| `GET` | `/` | `{ status: "ok" }` |
| `GET` | `/health` | `{ status: "healthy" }` |

> ⚠️ As rotas de simulação (`POST /execucoes`, `GET /execucoes`, `GET /execucoes/:id`) estão em desenvolvimento pelo backend.

---

## Rotas do Frontend

| Rota | Acesso | Descrição |
|---|---|---|
| `/login` | Público | Tela de login |
| `/cadastro` | Público | Tela de cadastro |
| `/` | Protegido | Home — seleção de simulador |
| `/simuladores/drone-delivery/configuracao` | Protegido | Configuração do Drone Delivery Sim |
| `/simuladores/shared-drone-delivery/configuracao` | Protegido | Configuração do Shared Drone Sim |
| `/historico` | Protegido | Histórico de execuções |
| `/simuladores/execucao/:id` | Protegido | Status e resultados de uma execução |
| `*` (qualquer outra) | Público | Página 404 customizada |

---

## Contribuindo

O projeto usa **Git Flow** simplificado:

- `main` — branch de produção
- `joao-marcos` — branch de desenvolvimento ativo

### Workflow sugerido

```bash
# Crie uma branch a partir de main ou da branch ativa
git checkout -b feature/nome-da-feature

# Faça suas alterações, commit e push
git add .
git commit -m "feat: descrição da feature"
git push origin feature/nome-da-feature

# Abra um Pull Request para main
```

---

> Projeto acadêmico — Simulação de Entrega por Drones com interface web moderna.
