import PageShell from '../../components/ui/PageShell'
import SimulatorCard from '../../components/ui/SimulatorCard'
import { useLanguage } from '../../contexts/LanguageContext'

export default function HomePage() {
    const { t } = useLanguage()

    const simulators = [
        {
            title: t('drone_delivery_title'),
            description: t('drone_delivery_desc'),
            route: '/simuladores/drone-delivery/configuracao',
        },
        {
            title: t('shared_drone_title'),
            description: t('shared_drone_desc'),
            route: '/simuladores/shared-drone-delivery/configuracao',
        },
    ]

    return (
        <PageShell title={t('home_title')} description={t('home_subtitle')}>
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
