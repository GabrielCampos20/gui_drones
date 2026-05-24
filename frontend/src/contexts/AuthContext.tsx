import { createContext, useContext, useState, type ReactNode } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
    id: string
    name: string
}

type AuthContextType = {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (name: string, password: string) => Promise<void>
    register: (name: string, password: string) => Promise<void>
    logout: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    // Sessão apenas em memória — sempre inicia deslogado ao abrir o app
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)

    function persist(newToken: string, newUser: User) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        setToken(newToken)
        setUser(newUser)
    }

    async function login(name: string, password: string) {
        const { data } = await axios.post(`${API_URL}/auth/login`, { name, password })
        persist(data.token, data.user)
    }

    async function register(name: string, password: string) {
        const { data } = await axios.post(`${API_URL}/auth/register`, { name, password })
        persist(data.token, data.user)
    }

    function logout() {
        delete axios.defaults.headers.common['Authorization']
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading: false,   // sem restore assíncrono, nunca fica "carregando"
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
