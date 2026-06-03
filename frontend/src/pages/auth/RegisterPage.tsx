import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { toast } from 'sonner'

type RegisterFormValues = {
    name: string
    password: string
    confirmPassword: string
}

export default function RegisterPage() {
    const { register: registerUser } = useAuth()
    const { t, language } = useLanguage()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const RegisterSchema = z
        .object({
            name: z.string().min(2, t('invalid_data')),
            password: z.string().min(6, t('invalid_data')),
            confirmPassword: z.string().min(1, t('invalid_data')),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: language === 'en' ? 'Passwords do not match' : 'As senhas não coincidem',
            path: ['confirmPassword'],
        })

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({ resolver: zodResolver(RegisterSchema) })

    async function onSubmit(data: RegisterFormValues) {
        setIsSubmitting(true)
        try {
            await registerUser(data.name, data.password)
            toast.success(language === 'en' ? 'Account created! Welcome.' : 'Conta criada! Bem-vindo.')
            navigate('/', { replace: true })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : ''
            const isUserTaken = message.includes('already in use') || message.includes('já está em uso') || message.includes('409')
            toast.error(isUserTaken ? t('user_taken') : t('register_error'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputStyle = (hasError: boolean) => ({
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${hasError ? 'var(--color-error)' : 'var(--color-border)'}`,
        color: 'var(--color-text-primary)',
        outline: 'none',
    })

    const handleFocus = (hasError: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
        if (!hasError) e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
    }

    const handleBlur = (hasError: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
        if (!hasError) e.currentTarget.style.borderColor = 'var(--color-border)'
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-12"
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
                        {t('register_title')}
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {t('register_subtitle')}
                    </p>
                </div>

                {/* Card */}
                <div
                    className="p-8 rounded-xl border"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="register-form">
                        {/* Name */}
                        <div>
                            <label
                                htmlFor="register-name"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('username')}
                            </label>
                            <input
                                id="register-name"
                                type="text"
                                autoComplete="username"
                                placeholder={t('username')}
                                {...register('name')}
                                className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                                style={inputStyle(!!errors.name)}
                                onFocus={handleFocus(!!errors.name)}
                                onBlur={handleBlur(!!errors.name)}
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
                                htmlFor="register-password"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {t('password')}
                            </label>
                            <input
                                id="register-password"
                                type="password"
                                autoComplete="new-password"
                                placeholder={language === 'en' ? 'Min. 6 characters' : 'Mín. 6 caracteres'}
                                {...register('password')}
                                className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                                style={inputStyle(!!errors.password)}
                                onFocus={handleFocus(!!errors.password)}
                                onBlur={handleBlur(!!errors.password)}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="register-confirm-password"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {language === 'en' ? 'Confirm password' : 'Confirmar senha'}
                            </label>
                            <input
                                id="register-confirm-password"
                                type="password"
                                autoComplete="new-password"
                                placeholder={language === 'en' ? 'Repeat password' : 'Repita a senha'}
                                {...register('confirmPassword')}
                                className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                                style={inputStyle(!!errors.confirmPassword)}
                                onFocus={handleFocus(!!errors.confirmPassword)}
                                onBlur={handleBlur(!!errors.confirmPassword)}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            id="register-submit"
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
                            {isSubmitting ? t('loading') : t('register_button')}
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
                        {t('already_member')}{' '}
                        <Link
                            to="/login"
                            id="goto-login"
                            className="font-medium transition-colors"
                            style={{ color: 'var(--color-cyan-light)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-cyan-primary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-cyan-light)')}
                        >
                            {t('enter')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
