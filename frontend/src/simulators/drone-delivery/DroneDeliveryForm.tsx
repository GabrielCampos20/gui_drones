import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const DroneConfigSchema = z.object({
    droneCount: z.number().int().min(1),
    drones: z.array(z.number().int().min(0)),
    arMin: z.number().positive(),
    arMax: z.number().positive(),
    xPointQuantity: z.number().int().min(1),
    maxQueueSize: z.number().int().min(1),
    totalPackages: z.number().int().min(1),
    simulationNumber: z.number().int().min(1),
})

type DroneConfigForm = z.infer<typeof DroneConfigSchema>

function formatNumberPreserveDecimal(n: number) {
    // If integer, add .0 to match example like 5.0
    if (Number.isInteger(n)) return `${n}.0`
    return String(n)
}

export default function DroneDeliveryForm() {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
    } = useForm<DroneConfigForm>({
        resolver: zodResolver(DroneConfigSchema),
        shouldUnregister: true,
        defaultValues: {
            droneCount: 3,
            drones: [100, 200, 300],
            arMin: 0.001,
            arMax: 5.0,
            xPointQuantity: 20,
            maxQueueSize: 100,
            totalPackages: 1000,
            simulationNumber: 50,
        },
    })

    const droneCountRaw = watch('droneCount')
    const dronesWatch = watch('drones')

    const registerInt = (name: 'droneCount' | 'xPointQuantity' | 'maxQueueSize' | 'totalPackages' | 'simulationNumber' | `drones.${number}`, fallback: number) =>
        register(name, {
            setValueAs: (value) => {
                if (value === '' || value === null || typeof value === 'undefined') return fallback
                const parsed = Number(value)
                return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
            },
        })

    const registerFloat = (name: 'arMin' | 'arMax', fallback: number) =>
        register(name, {
            setValueAs: (value) => {
                if (value === '' || value === null || typeof value === 'undefined') return fallback
                const parsed = Number(value)
                return Number.isFinite(parsed) ? parsed : fallback
            },
        })

    // keep the field array length in sync with droneCount
    useEffect(() => {
        const targetCount = Math.max(1, Math.floor(Number(droneCountRaw) || 0))
        if (targetCount < 1) return

        const current = Array.isArray(dronesWatch) ? dronesWatch : []
        const currentLen = current.length

        if (currentLen === targetCount) return

        if (currentLen < targetCount) {
            const newArray = current.concat(Array(targetCount - currentLen).fill(0))
            setValue('drones' as const, newArray)
        } else {
            // truncate
            const newArray = current.slice(0, targetCount)
            setValue('drones' as const, newArray)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [droneCountRaw])

    const onSubmit = (data: DroneConfigForm) => {
        // build drones line with trailing comma
        const dronesLine = `drones=${data.drones.join(',')},`

        const arMinLine = `ar.min=${formatNumberPreserveDecimal(data.arMin)}`
        const arMaxLine = `ar.max=${formatNumberPreserveDecimal(data.arMax)}`
        const xPointLine = `xPointQuantity=${data.xPointQuantity}`
        const maxQueueLine = `maxQueueSize=${data.maxQueueSize}`
        const totalPackagesLine = `totalPackages=${data.totalPackages}`
        const simulationNumberLine = `simulationNumber=${data.simulationNumber}`

        const final = [
            dronesLine,
            arMinLine,
            arMaxLine,
            xPointLine,
            maxQueueLine,
            totalPackagesLine,
            simulationNumberLine,
        ].join('\n')

        console.log(final)
        // future: send to API
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Qtd de Configurações de Drones
                    </label>
                    <input
                        type="number"
                        min={1}
                        {...registerInt('droneCount', 1)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        ar.min
                    </label>
                    <input
                        type="number"
                        step="any"
                        {...registerFloat('arMin', 0.001)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        ar.max
                    </label>
                    <input
                        type="number"
                        step="any"
                        {...registerFloat('arMax', 5.0)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        xPointQuantity
                    </label>
                    <input
                        type="number"
                        {...registerInt('xPointQuantity', 20)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        maxQueueSize
                    </label>
                    <input
                        type="number"
                        {...registerInt('maxQueueSize', 100)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        totalPackages
                    </label>
                    <input
                        type="number"
                        {...registerInt('totalPackages', 1000)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        simulationNumber
                    </label>
                    <input
                        type="number"
                        {...registerInt('simulationNumber', 50)}
                        className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Drones (configurações)
                </label>

                <div className="space-y-2">
                    {Array.from({ length: Math.max(1, Math.floor(Number(droneCountRaw) || 0)) }).map((_, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-2">
                            <label className="w-full md:w-32 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                Configuração {idx + 1}
                            </label>
                            <input
                                type="number"
                                {...registerInt(`drones.${idx}`, 0)}
                                className="w-full flex-1 rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    className="px-4 py-2 rounded-md"
                    style={{
                        backgroundColor: 'var(--color-cyan-primary)',
                        color: 'var(--color-background)',
                    }}
                >
                    Gerar Properties
                </button>

                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Campos obrigatórios — verifique valores antes de gerar.
                </div>
            </div>
        </form>
    )
}
