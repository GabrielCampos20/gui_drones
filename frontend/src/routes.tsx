import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import PrivateRoute from './components/ui/PrivateRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/home/HomePage'
import DroneDeliveryConfigPage from './pages/simulators/drone-delivery/DroneDeliveryConfigPage'
import SharedDroneConfigPage from './pages/simulators/shared-drone-delivery/SharedDroneConfigPage'

function GuestRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()
    if (isLoading) return null
    return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes — redirect to home if already logged in */}
                <Route
                    path="/login"
                    element={
                        <GuestRoute>
                            <LoginPage />
                        </GuestRoute>
                    }
                />
                <Route
                    path="/cadastro"
                    element={
                        <GuestRoute>
                            <RegisterPage />
                        </GuestRoute>
                    }
                />

                {/* Protected routes */}
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <HomePage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/simuladores/drone-delivery/configuracao"
                    element={
                        <PrivateRoute>
                            <DroneDeliveryConfigPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/simuladores/shared-drone-delivery/configuracao"
                    element={
                        <PrivateRoute>
                            <SharedDroneConfigPage />
                        </PrivateRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
