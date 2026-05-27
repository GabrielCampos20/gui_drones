import { AlertTriangle, Info } from 'lucide-react'

export type ModalVariant = 'danger' | 'info'

export interface ModalProps {
    isOpen: boolean
    title: string
    description: string
    variant?: ModalVariant
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel?: () => void
    isLoading?: boolean
}

export default function Modal({
    isOpen,
    title,
    description,
    variant = 'info',
    confirmText = 'OK',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    isLoading = false,
}: ModalProps) {
    if (!isOpen) return null

    const isDanger = variant === 'danger'

    return (
        <div
            className="animate-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // Very subtle overlay
            }}
        >
            <div
                className="animate-modal-content w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
                style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                }}
            >
                <div className="flex flex-col items-center text-center">
                    <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 194, 255, 0.1)',
                            color: isDanger ? '#ef4444' : 'var(--color-cyan-primary)',
                        }}
                    >
                        {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
                    </div>

                    <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {title}
                    </h3>

                    <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {description}
                    </p>

                    <div className="flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-center">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
                            style={{
                                backgroundColor: isDanger ? '#ef4444' : 'var(--color-cyan-primary)',
                                color: 'var(--color-background)',
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isLoading ? 'Aguarde...' : confirmText}
                        </button>

                        {onCancel && (
                            <button
                                onClick={onCancel}
                                disabled={isLoading}
                                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                                style={{
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text-secondary)',
                                    backgroundColor: 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                            >
                                {cancelText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
