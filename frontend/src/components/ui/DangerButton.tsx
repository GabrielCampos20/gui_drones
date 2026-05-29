import type { ReactNode } from 'react'

interface DangerButtonProps {
    onClick: () => void
    disabled?: boolean
    isLoading?: boolean
    loadingLabel?: string
    /** Classes extras do Tailwind (ex: padding, tamanho). */
    className?: string
    children: ReactNode
}

/** Botão de ação destrutiva padronizado — substitui o padrão onMouseEnter/Leave repetido. */
export default function DangerButton({
    onClick,
    disabled = false,
    isLoading = false,
    loadingLabel = 'Aguarde...',
    className = 'px-3 py-1.5',
    children,
}: DangerButtonProps) {
    const isDisabled = disabled || isLoading

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`flex items-center gap-2 rounded-lg text-sm border transition-colors ${className}`}
            style={{
                borderColor: '#ef4444',
                color: '#ef4444',
                backgroundColor: 'transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
            }}
            onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.backgroundColor = 'transparent'
            }}
        >
            {isLoading ? loadingLabel : children}
        </button>
    )
}
