import type { ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, History } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from 'sonner'

type PageShellProps = {
    title: string
    description?: string
    children: ReactNode
}

export default function PageShell({ title, description, children }: PageShellProps) {
    const { user, logout } = useAuth()
    const { language, setLanguage, t } = useLanguage()
    const navigate = useNavigate()

    function handleLogout() {
        logout()
        toast.success(t('logout_success'))
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
                        {t('app_title')}
                    </span>
                </div>

                {/* Seletor de Idioma + Usuário logado */}
                <div className="flex items-center gap-4">
                    {/* Botões toggle de idioma */}
                    <div
                        className="flex items-center rounded-lg border overflow-hidden"
                        style={{ borderColor: 'var(--color-border)' }}
                    >
                        <button
                            onClick={() => setLanguage('en')}
                            className="px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
                            style={{
                                backgroundColor: language === 'en' ? 'var(--color-cyan-primary)' : 'transparent',
                                color: language === 'en' ? 'var(--color-background)' : 'var(--color-text-muted)',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('pt')}
                            className="px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
                            style={{
                                backgroundColor: language === 'pt' ? 'var(--color-cyan-primary)' : 'transparent',
                                color: language === 'pt' ? 'var(--color-background)' : 'var(--color-text-muted)',
                            }}
                        >
                            PT
                        </button>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3">
                            {/* Link para histórico */}
                            <Link
                                to="/historico"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-muted)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
                                    e.currentTarget.style.color = 'var(--color-cyan-light)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)'
                                    e.currentTarget.style.color = 'var(--color-text-muted)'
                                }}
                            >
                                <History size={14} />
                                <span>{t('history')}</span>
                            </Link>
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
                                title={t('logout')}
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
                                <span>{t('logout')}</span>
                            </button>
                        </div>
                    )}
                </div>
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
