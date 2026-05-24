import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'

type PageShellProps = {
    title: string
    description?: string
    children: ReactNode
}

export default function PageShell({ title, description, children }: PageShellProps) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    function handleLogout() {
        logout()
        toast.success('Sessão encerrada.')
        navigate('/login', { replace: true })
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>

            {/* Header — indicativo de usuário */}
            <header
                className="w-full border-b px-6 py-3 flex items-center justify-between"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                }}
            >
                {/* Logo / nome do app */}
                <div className="flex items-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                            stroke="var(--color-cyan-primary)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                        GUI Drones
                    </span>
                </div>

                {/* Usuário logado + logout */}
                {user && (
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{
                                backgroundColor: 'var(--color-card)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <User size={14} style={{ color: 'var(--color-cyan-primary)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                {user.name}
                            </span>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="Sair"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                            style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-error)'
                                e.currentTarget.style.color = 'var(--color-error)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-border)'
                                e.currentTarget.style.color = 'var(--color-text-muted)'
                            }}
                        >
                            <LogOut size={14} />
                            <span>Sair</span>
                        </button>
                    </div>
                )}
            </header>

            {/* Conteúdo da página */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-6xl">
                    <div className="text-center mb-16">
                        <h1
                            className="text-4xl md:text-5xl font-bold tracking-tight"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {title}
                        </h1>
                        {description ? (
                            <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--color-text-muted)' }}>
                                {description}
                            </p>
                        ) : null}
                    </div>

                    {children}
                </div>
            </main>
        </div>
    )
}
