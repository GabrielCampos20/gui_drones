import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import SimulatorSelectionScreen from './components/SimulatorSelectionScreen'
import DroneDeliveryConfig from './pages/DroneDeliveryConfig'
import SharedDroneConfig from './pages/SharedDroneConfig'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimulatorSelectionScreen />} />
        <Route path="/simuladores/drone-delivery/configuracao" element={<DroneDeliveryConfig />} />
        <Route path="/simuladores/shared-drone-delivery/configuracao" element={<SharedDroneConfig />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
