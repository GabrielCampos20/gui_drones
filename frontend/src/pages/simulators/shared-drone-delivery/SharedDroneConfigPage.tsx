import PageShell from '../../../components/ui/PageShell'

export default function SharedDroneConfigPage() {
    return (
        <PageShell
            title="Configuração de Simulação"
            description="Shared Drone Delivery Sim — página preparada para a próxima configuração."
        >
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Esta rota já está disponível via React Router DOM e pronta para receber o formulário específico.
                </p>
            </div>
        </PageShell>
    )
}
