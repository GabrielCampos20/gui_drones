import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { ReactNode } from 'react'

type Props = { children: ReactNode }

export default function PrivateRoute({ children }: Props) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-background)' }}
            >
                <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'var(--color-cyan-primary)', borderTopColor: 'transparent' }}
                />
            </div>
        )
    }

    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
