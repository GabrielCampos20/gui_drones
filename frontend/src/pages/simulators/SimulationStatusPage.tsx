import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, AlertCircle, FileText, ArrowLeft, Clock } from 'lucide-react'
import PageShell from '../../components/ui/PageShell'
import {
    executionsApi,
    simulatorLabel,
    formatDuration,
    type Execution,
} from '../../services/executions'

// ─── Spinner animado ──────────────────────────────────────────────────────────

function Spinner() {
    return (
        <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto"
            style={{
                borderColor: 'var(--color-cyan-primary)',
                borderTopColor: 'transparent',
            }}
        />
    )
}

// ─── Arquivo de resultado ─────────────────────────────────────────────────────

function ResultFile({ label, path }: { label: string; path: string | null }) {
    if (!path) return null
    const filename = path.split('/').pop() ?? path
    return (
        <a
            href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/files/${encodeURIComponent(path)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-cyan-light)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
        >
            <FileText size={14} />
            <span>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {label}:{' '}
                </span>
                {filename}
            </span>
        </a>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000

export default function SimulationStatusPage() {
    const { id } = useParams<{ id: string }>()
    const [execution, setExecution] = useState<Execution | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [elapsed, setElapsed] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Contador de tempo decorrido
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    // Polling para verificar o status
    useEffect(() => {
        if (!id) return

        async function poll() {
            try {
                const { data } = await executionsApi.getById(id!)
                setExecution(data)
                setError(null)

                // Para o polling quando concluir
                if (data.finishedAt && intervalRef.current) {
                    clearInterval(intervalRef.current)
                    if (timerRef.current) clearInterval(timerRef.current)
                }
            } catch {
                setError('Não foi possível conectar ao backend. Aguardando...')
            }
        }

        poll()
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [id])

    const isDone = !!execution?.finishedAt
    const isError = !isDone && elapsed > 300 // mais de 5 min sem resposta

    // ─── Conteúdo do status ───────────────────────────────────────────────────

    const simulatorName = execution
        ? simulatorLabel(execution.simulator)
        : 'Simulador'

    return (
        <PageShell
            title="Execução em andamento"
            description={`${simulatorName} — acompanhe o progresso da simulação.`}
        >
            <div
                className="max-w-2xl mx-auto p-8 rounded-xl border"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
                {/* Estado: concluída */}
                {isDone && (
                    <div className="text-center mb-8">
                        <CheckCircle
                            size={56}
                            className="mx-auto mb-4"
                            style={{ color: 'var(--color-success)' }}
                        />
                        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Simulação concluída!
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Duração total:{' '}
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                {formatDuration(execution!.startedAt, execution!.finishedAt)}
                            </span>
                        </p>
                    </div>
                )}

                {/* Estado: rodando */}
                {!isDone && !isError && (
                    <div className="text-center mb-8">
                        <div className="mb-6">
                            <Spinner />
                        </div>
                        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {error ? 'Conectando...' : 'Simulação em andamento'}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            {error ?? 'Aguarde enquanto o simulador processa os dados.'}
                        </p>
                        <div
                            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-sm"
                            style={{
                                backgroundColor: 'rgba(0,194,255,0.08)',
                                color: 'var(--color-cyan-primary)',
                                border: '1px solid rgba(0,194,255,0.2)',
                            }}
                        >
                            <Clock size={13} />
                            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} decorrido
                        </div>
                    </div>
                )}

                {/* Estado: timeout */}
                {isError && !isDone && (
                    <div className="text-center mb-8">
                        <AlertCircle
                            size={56}
                            className="mx-auto mb-4"
                            style={{ color: 'var(--color-warning)' }}
                        />
                        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Tempo excedido
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            A simulação está demorando mais do que o esperado. Verifique os logs do backend.
                        </p>
                    </div>
                )}

                {/* ID da execução */}
                {id && (
                    <div
                        className="mb-6 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                        <p className="text-xs mb-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            ID da execução
                        </p>
                        <p className="text-sm font-mono" style={{ color: 'var(--color-cyan-light)' }}>
                            {id}
                        </p>
                    </div>
                )}

                {/* Arquivos de resultado */}
                {isDone && execution && (
                    <div className="mb-6">
                        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                            Arquivos gerados
                        </p>
                        <div className="space-y-2">
                            <ResultFile label="Log" path={execution.logPath} />
                            <ResultFile label="Tempo de fila" path={execution.queueTimeCsvPath} />
                            <ResultFile label="Tempo de missão" path={execution.missionTimeCsvPath} />
                            <ResultFile label="Tempo de voo" path={execution.flightTimeCsvPath} />
                            <ResultFile label="Prob. de queda" path={execution.dropProbabilityCsvPath} />
                        </div>
                        {!execution.logPath &&
                            !execution.queueTimeCsvPath &&
                            !execution.missionTimeCsvPath && (
                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    Nenhum arquivo disponível.
                                </p>
                            )}
                    </div>
                )}

                {/* Parâmetros usados */}
                {execution?.propertiesContent && (
                    <div className="mb-6">
                        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            Parâmetros utilizados
                        </p>
                        <pre
                            className="text-xs p-3 rounded-lg overflow-x-auto"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                fontFamily: 'monospace',
                            }}
                        >
                            {execution.propertiesContent}
                        </pre>
                    </div>
                )}

                {/* Ações */}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <Link
                        to="/historico"
                        className="flex items-center gap-2 text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                        <ArrowLeft size={14} />
                        Ver histórico
                    </Link>

                    {isDone && (
                        <Link
                            to="/"
                            className="px-4 py-2 rounded-lg text-sm font-medium"
                            style={{
                                backgroundColor: 'var(--color-cyan-primary)',
                                color: 'var(--color-background)',
                            }}
                        >
                            Nova simulação
                        </Link>
                    )}
                </div>
            </div>
        </PageShell>
    )
}
