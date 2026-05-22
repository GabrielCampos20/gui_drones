import PageShell from '../../components/ui/PageShell'
import SimulatorCard from '../../components/ui/SimulatorCard'

const simulators = [
    {
        title: 'Drone Delivery Sim',
        description:
            'A straightforward drone delivery simulator where drones transport packages between designated points. Perfect for learning the basics of autonomous delivery systems.',
        route: '/simuladores/drone-delivery/configuracao',
    },
    {
        title: 'Shared Drone Delivery Sim',
        description:
            'An advanced simulator featuring shared drones across multiple warehouses. Optimize delivery routes and resource allocation in a complex logistics network.',
        route: '/simuladores/shared-drone-delivery/configuracao',
    },
]

export default function HomePage() {
    return (
        <PageShell title="Simulador de Drones" description="Escolha um simulador para acessar sua configuração específica.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {simulators.map((simulator) => (
                    <SimulatorCard
                        key={simulator.route}
                        title={simulator.title}
                        description={simulator.description}
                        route={simulator.route}
                        onClick={() => {
                            console.log(`Selected simulator: ${simulator.title}`)
                        }}
                    />
                ))}
            </div>
        </PageShell>
    )
}
