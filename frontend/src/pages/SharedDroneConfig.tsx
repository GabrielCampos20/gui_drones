export default function SharedDroneConfig() {
    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div className="w-full max-w-3xl">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Configuração de Simulação
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Shared Drone Delivery Sim — página preparada para a próxima configuração.
                    </p>
                </div>

                <div
                    className="p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Esta rota já está disponível via React Router DOM e pronta para receber o formulário específico.
                    </p>
                </div>
            </div>
        </div>
    )
}
