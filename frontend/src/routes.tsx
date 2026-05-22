import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/home/HomePage'
import DroneDeliveryConfigPage from './pages/simulators/drone-delivery/DroneDeliveryConfigPage'
import SharedDroneConfigPage from './pages/simulators/shared-drone-delivery/SharedDroneConfigPage'

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/simuladores/drone-delivery/configuracao" element={<DroneDeliveryConfigPage />} />
                <Route path="/simuladores/shared-drone-delivery/configuracao" element={<SharedDroneConfigPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
