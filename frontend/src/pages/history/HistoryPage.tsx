import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Clock, PlayCircle, CheckCircle, RefreshCw, AlertCircle, Trash2 } from 'lucide-react'
import PageShell from '../../components/ui/PageShell'
import Modal from '../../components/ui/Modal'
import BackLink from '../../components/ui/BackLink'
import DangerButton from '../../components/ui/DangerButton'
import {
    executionsApi,
    simulatorLabel,
    executionStatus,
    formatDuration,
    type Execution,
} from '../../services/executions'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'running' | 'done' }) {
    const isRunning = status === 'running'
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
                backgroundColor: isRunning
                    ? 'rgba(0, 194, 255, 0.1)'
                    : 'rgba(34, 197, 94, 0.1)',
                color: isRunning
                    ? 'var(--color-cyan-primary)'
                    : 'var(--color-success)',
                border: `1px solid ${isRunning ? 'rgba(0,194,255,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}
        >
            {isRunning ? (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            ) : (
                <CheckCircle size={11} />
            )}
            {isRunning ? 'Em andamento' : 'Concluída'}
        </span>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-xl border"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
            <PlayCircle size={48} style={{ color: 'var(--color-text-muted)' }} className="mb-4" />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Nenhuma execução encontrada
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Execute um simulador para ver o histórico aqui.
            </p>
            <Link
                to="/"
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-cyan-primary)', color: 'var(--color-background)' }}
            >
                Ir para os simuladores
            </Link>
        </div>
    )
}

// ─── Offline state ────────────────────────────────────────────────────────────

function OfflineState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-xl border"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
            <AlertCircle size={48} style={{ color: 'var(--color-warning)' }} className="mb-4" />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Backend indisponível
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Não foi possível conectar ao servidor. Verifique se o backend está rodando.
            </p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                }}
            >
                <RefreshCw size={14} />
                Tentar novamente
            </button>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOffline, setIsOffline] = useState(false)
    
    // Modal states
    const [isClearing, setIsClearing] = useState(false)
    const [isClearModalOpen, setIsClearModalOpen] = useState(false)
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

    const load = useCallback(async () => {
        setIsLoading(true)
        setIsOffline(false)
        try {
            const { data } = await executionsApi.list()
            setExecutions(data)
        } catch {
            setIsOffline(true)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Auto-polling: atualiza silenciosamente a cada 5s enquanto houver execuções em andamento.
    useEffect(() => {
        const hasRunning = executions.some(e => !e.finishedAt)
        if (!hasRunning || isOffline || isLoading) return

        const id = setInterval(async () => {
            try {
                const { data } = await executionsApi.list()
                setExecutions(data)
            } catch { /* silencioso — erros são tratados pelo load principal */ }
        }, 5000)

        return () => clearInterval(id)
    }, [executions, isOffline, isLoading])

    useEffect(() => { load() }, [load])

    function confirmClearAll() {
        setIsClearModalOpen(true)
    }

    async function executeClearAll() {
        setIsClearing(true)
        try {
            await executionsApi.clearAll()
            await load()
            setIsClearModalOpen(false)
        } catch (error) {
            console.error('Erro ao limpar histórico:', error)
            setIsClearModalOpen(false)
            setIsErrorModalOpen(true)
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <PageShell
            title="Histórico de Execuções"
            description="Acompanhe todas as simulações realizadas."
        >
            {/* Header actions */}
            <div className="flex items-center justify-between mb-6">
                <BackLink to="/" />

                <div className="flex items-center gap-3">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {!isLoading && !isOffline && `${executions.length} execução(ões) encontrada(s)`}
                    </p>
                    
                    {!isLoading && !isOffline && executions.length > 0 && (
                        <DangerButton
                            onClick={confirmClearAll}
                            disabled={isClearing || isLoading}
                            isLoading={isClearing}
                            loadingLabel="Limpando..."
                        >
                            <Trash2 size={13} />
                            Limpar
                        </DangerButton>
                    )}

                    <button
                        onClick={load}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-opacity"
                        style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'transparent',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.5 : 1,
                        }}
                    >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-16 rounded-xl animate-pulse"
                            style={{ backgroundColor: 'var(--color-card)' }}
                        />
                    ))}
                </div>
            )}

            {/* Offline */}
            {!isLoading && isOffline && <OfflineState onRetry={load} />}

            {/* Empty */}
            {!isLoading && !isOffline && executions.length === 0 && <EmptyState />}

            {/* Table */}
            {!isLoading && !isOffline && executions.length > 0 && (
                <div
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--color-border)' }}
                >
                    {/* Table header */}
                    <div
                        className="grid grid-cols-5 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-muted)',
                            borderBottom: '1px solid var(--color-border)',
                        }}
                    >
                        <span>Simulador</span>
                        <span>Iniciada em</span>
                        <span>Duração</span>
                        <span>Status</span>
                        <span className="text-right">Ações</span>
                    </div>

                    {/* Rows */}
                    {executions.map((exec, index) => (
                        <div
                            key={exec.id}
                            className="grid grid-cols-5 items-center px-5 py-4 transition-colors"
                            style={{
                                backgroundColor: 'var(--color-card)',
                                borderTop: index > 0 ? '1px solid var(--color-border)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--color-card)'
                            }}
                        >
                            {/* Simulator */}
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {simulatorLabel(exec.simulator)}
                            </span>

                            {/* Started at */}
                            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                <Clock size={12} />
                                {new Date(exec.startedAt).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </span>

                            {/* Duration */}
                            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                {formatDuration(exec.startedAt, exec.finishedAt)}
                            </span>

                            {/* Status */}
                            <StatusBadge status={executionStatus(exec)} />

                            {/* Actions */}
                            <div className="flex justify-end">
                                <Link
                                    to={`/simuladores/execucao/${exec.id}`}
                                    className="text-xs font-medium transition-colors"
                                    style={{ color: 'var(--color-cyan-light)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'var(--color-cyan-primary)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'var(--color-cyan-light)'
                                    }}
                                >
                                    Ver detalhes →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Limpar Histórico */}
            <Modal
                isOpen={isClearModalOpen}
                title="Limpar Histórico"
                description="Tem certeza que deseja excluir todo o histórico de execuções? Esta ação não pode ser desfeita e todas as simulações e arquivos relacionados serão perdidos."
                variant="danger"
                confirmText="Sim, excluir tudo"
                cancelText="Não, cancelar"
                onConfirm={executeClearAll}
                onCancel={() => setIsClearModalOpen(false)}
                isLoading={isClearing}
            />

            {/* Modal de Erro */}
            <Modal
                isOpen={isErrorModalOpen}
                title="Erro ao limpar"
                description="Não foi possível se comunicar com o banco de dados para limpar o histórico. Verifique a conexão do servidor."
                variant="info"
                confirmText="OK"
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
