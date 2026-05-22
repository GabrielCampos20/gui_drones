import { useState } from 'react'
import SimulatorSelectionScreen from './components/SimulatorSelectionScreen'
import DroneDeliveryConfig from './pages/DroneDeliveryConfig'

function App() {
  const [route, setRoute] = useState<'home' | 'drone-config'>('home')

  const handleSelect = (page?: string) => {
    if (!page) return
    // Map filename to internal route key
    if (page.includes('DroneDeliveryConfig')) setRoute('drone-config')
    else if (page.includes('SharedDroneConfig')) {
      // placeholder for future simulator
      console.log('Shared drone config selected')
    }
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        
      </div>

      {route === 'home' ? <SimulatorSelectionScreen onSelect={handleSelect} /> : <DroneDeliveryConfig />}
    </>
  )
}

export default App
