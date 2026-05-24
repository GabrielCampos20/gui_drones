import { Link } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'

export default function NotFoundPage() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            {/* Número 404 em destaque */}
            <div
                className="text-[10rem] font-black leading-none select-none mb-2"
                style={{
                    background: 'linear-gradient(135deg, var(--color-cyan-primary), var(--color-cyan-light))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: 0.85,
                }}
            >
                404
            </div>

            <AlertTriangle
                size={36}
                className="mb-4"
                style={{ color: 'var(--color-warning)' }}
            />

            <h1
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: 'var(--color-text-primary)' }}
            >
                Página não encontrada
            </h1>
            <p
                className="text-sm mb-8 text-center max-w-sm"
                style={{ color: 'var(--color-text-muted)' }}
            >
                A rota que você tentou acessar não existe ou foi movida.
            </p>

            <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-80"
                style={{
                    backgroundColor: 'var(--color-cyan-primary)',
                    color: 'var(--color-background)',
                }}
            >
                <Home size={16} />
                Voltar para o início
            </Link>
        </div>
    )
}
