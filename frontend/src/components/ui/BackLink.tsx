import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackLinkProps {
    to: string
    label?: string
}

/** Link de navegação "voltar" padronizado — substitui o padrão onMouseEnter/Leave repetido. */
export default function BackLink({ to, label = 'Voltar' }: BackLinkProps) {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
            <ArrowLeft size={14} />
            {label}
        </Link>
    )
}
