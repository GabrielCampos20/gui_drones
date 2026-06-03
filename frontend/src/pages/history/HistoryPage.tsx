import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Clock, PlayCircle, CheckCircle, RefreshCw, AlertCircle, Trash2 } from 'lucide-react'
import PageShell from '../../components/ui/PageShell'
import Modal from '../../components/ui/Modal'
import BackLink from '../../components/ui/BackLink'
import DangerButton from '../../components/ui/DangerButton'
import { useLanguage } from '../../contexts/LanguageContext'
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
    const { t } = useLanguage()
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
            {isRunning ? t('status_active') : t('status_success')}
        </span>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    const { t } = useLanguage()
    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-xl border"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
            <PlayCircle size={48} style={{ color: 'var(--color-text-muted)' }} className="mb-4" />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('history_empty')}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {t('history_empty_sub')}
            </p>
            <Link
                to="/"
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-cyan-primary)', color: 'var(--color-background)' }}
            >
                {t('voltar_simuladores')}
            </Link>
        </div>
    )
}

// ─── Offline state ────────────────────────────────────────────────────────────

function OfflineState({ onRetry }: { onRetry: () => void }) {
    const { t } = useLanguage()
    return (
        <div
            className="flex flex-col items-center justify-center py-20 rounded-xl border"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
            <AlertCircle size={48} style={{ color: 'var(--color-warning)' }} className="mb-4" />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('backend_offline')}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {t('backend_offline_desc')}
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
                {t('retry')}
            </button>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOffline, setIsOffline] = useState(false)
    const { t, language } = useLanguage()
    
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
            title={t('history_title')}
            description={t('history_desc')}
        >
            {/* Header actions */}
            <div className="flex items-center justify-between mb-6">
                <BackLink to="/" />

                <div className="flex items-center gap-3">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {!isLoading && !isOffline && `${executions.length} ${t('executions_found')}`}
                    </p>
                    
                    {!isLoading && !isOffline && executions.length > 0 && (
                        <DangerButton
                            onClick={confirmClearAll}
                            disabled={isClearing || isLoading}
                            isLoading={isClearing}
                            loadingLabel={t('clearing')}
                        >
                            <Trash2 size={13} />
                            {t('clear')}
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
                        {t('refresh')}
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
                        <span>{t('table_sim')}</span>
                        <span>{t('table_date')}</span>
                        <span>{t('table_duration')}</span>
                        <span>{t('table_status')}</span>
                        <span className="text-right">{t('table_actions')}</span>
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
                                {new Date(exec.startedAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
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
                                    {t('view_details')} →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Limpar Histórico */}
            <Modal
                isOpen={isClearModalOpen}
                title={t('confirm_clear_title')}
                description={t('confirm_clear_desc')}
                variant="danger"
                confirmText={t('confirm')}
                cancelText={t('cancel')}
                onConfirm={executeClearAll}
                onCancel={() => setIsClearModalOpen(false)}
                isLoading={isClearing}
            />

            {/* Modal de Erro */}
            <Modal
                isOpen={isErrorModalOpen}
                title={t('error_clear_title')}
                description={t('error_clear')}
                variant="info"
                confirmText="OK"
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
