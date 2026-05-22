import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SimulatorCard {
    title: string
    description: string
    page?: string
    route: string
}
const SimulatorSelectionScreen = () => {
    const simulators: SimulatorCard[] = [
        {
            title: 'Drone Delivery Sim',
            description:
                'A straightforward drone delivery simulator where drones transport packages between designated points. Perfect for learning the basics of autonomous delivery systems.',
            page: 'DroneDeliveryConfig.tsx',
            route: '/simuladores/drone-delivery/configuracao',
        },
        {
            title: 'Shared Drone Delivery Sim',
            description:
                'An advanced simulator featuring shared drones across multiple warehouses. Optimize delivery routes and resource allocation in a complex logistics network.',
            page: 'SharedDroneConfig.tsx',
            route: '/simuladores/shared-drone-delivery/configuracao',
        },

    ]

    const handleSimulatorClick = (simulator: SimulatorCard) => {
        console.log(`Selected simulator: ${simulator.title}`)
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div className="w-full max-w-6xl">
                {/* Title */}
                <div className="text-center mb-16">
                    <h1
                        className="text-5xl font-bold tracking-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Simulador de Drones
                    </h1>
                </div>

                {/* Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {simulators.map((simulator) => (
                        <Link
                            key={simulator.route}
                            to={simulator.route}
                            onClick={() => handleSimulatorClick(simulator)}
                            className="group cursor-pointer block"
                        >
                            <div
                                className="h-full p-8 rounded-lg border-2 transition-all duration-300"
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)'
                                }}
                            >
                                {/* Card Content */}
                                <h2
                                    className="text-2xl font-semibold mb-4"
                                    style={{
                                        color: 'var(--color-text-primary)',
                                    }}
                                >
                                    {simulator.title}
                                </h2>

                                <p
                                    className="mb-6 leading-relaxed"
                                    style={{
                                        color: 'var(--color-text-secondary)',
                                    }}
                                >
                                    {simulator.description}
                                </p>

                                {/* Action Text */}
                                <div
                                    className="flex items-center gap-2 font-medium transition-colors duration-300"
                                    style={{
                                        color: 'var(--color-cyan-light)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'var(--color-cyan-primary)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'var(--color-cyan-light)'
                                    }}
                                >
                                    <span>Launch Simulator</span>
                                    <ArrowRight
                                        size={20}
                                        className="transition-transform duration-300 group-hover:translate-x-1"
                                    />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SimulatorSelectionScreen
