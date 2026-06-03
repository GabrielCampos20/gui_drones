import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from 'sonner'

type LoginFormValues = {
    name: string
    password: string
}

export default function LoginPage() {
    const { login } = useAuth()
    const { t, language } = useLanguage()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const LoginSchema = z.object({
        name: z.string().min(2, t('invalid_data')),
        password: z.string().min(1, t('invalid_data')),
    })

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({ resolver: zodResolver(LoginSchema) })

    async function onSubmit(data: LoginFormValues) {
        setIsSubmitting(true)
        try {
            await login(data.name, data.password)
            navigate('/', { replace: true })
        } catch {
            toast.error(t('login_error'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                stroke="var(--color-cyan-primary)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h1
                        className="text-3xl font-bold tracking-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {t('login_title')}
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {t('login_subtitle')}
                    </p>
                </div>

                {/* Card */}
                <div
                    className="p-8 rounded-xl border"
                    style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                    }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="login-form">
                        {/* Name */}
                        <div>
                            <label
                                htmlFor="login-name"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('username')}
                            </label>
                            <input
                                id="login-name"
                                type="text"
                                autoComplete="username"
                                placeholder={t('username')}
                                {...register('name')}
                                className="w-full rounded-lg px-3.5 py-2.5 text-sm transition-colors"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: `1px solid ${errors.name ? 'var(--color-error)' : 'var(--color-border)'}`,
                                    color: 'var(--color-text-primary)',
                                    outline: 'none',
                                }}
                                onFocus={(e) => {
                                    if (!errors.name)
                                        e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
                                }}
                                onBlur={(e) => {
                                    if (!errors.name)
                                        e.currentTarget.style.borderColor = 'var(--color-border)'
                                }}
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="login-password"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('password')}
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                {...register('password')}
                                className="w-full rounded-lg px-3.5 py-2.5 text-sm transition-colors"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: `1px solid ${errors.password ? 'var(--color-error)' : 'var(--color-border)'}`,
                                    color: 'var(--color-text-primary)',
                                    outline: 'none',
                                }}
                                onFocus={(e) => {
                                    if (!errors.password)
                                        e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
                                }}
                                onBlur={(e) => {
                                    if (!errors.password)
                                        e.currentTarget.style.borderColor = 'var(--color-border)'
                                }}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity mt-2 cursor-pointer"
                            style={{
                                backgroundColor: 'var(--color-cyan-primary)',
                                color: 'var(--color-background)',
                                opacity: isSubmitting ? 0.6 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting ? t('loading') : t('enter')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {language === 'en' ? 'or' : 'ou'}
                        </span>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                    </div>

                    <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {t('no_account')}{' '}
                        <Link
                            to="/cadastro"
                            id="goto-register"
                            className="font-medium transition-colors"
                            style={{ color: 'var(--color-cyan-light)' }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.color = 'var(--color-cyan-primary)')
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.color = 'var(--color-cyan-light)')
                            }
                        >
                            {t('register_here')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
