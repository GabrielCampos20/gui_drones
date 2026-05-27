import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as z from 'zod'
import axios from 'axios'
import PageShell from '../../../components/ui/PageShell'
import Modal from '../../../components/ui/Modal'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const DroneDeliverySchema = z.object({
    droneCount: z.number().int().positive(),
    drones: z.array(z.number().int().positive()),
    arMin: z.number().positive(),
    arMax: z.number().positive(),
    xPointQuantity: z.number().int().positive(),
    maxQueueSize: z.number().int().positive(),
    totalPackages: z.number().int().positive(),
    simulationNumber: z.number().int().positive(),
}).refine(data => data.arMax > data.arMin, {
    message: "ar.max deve ser obrigatoriamente maior que ar.min",
    path: ["arMax"],
})

type DroneDeliveryFormValues = z.infer<typeof DroneDeliverySchema>

const intFieldOptions = (fallback: number) => ({
    setValueAs: (value: unknown) => {
        if (value === '' || value === null || typeof value === 'undefined') return fallback
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
    },
})

const floatFieldOptions = (fallback: number) => ({
    setValueAs: (value: unknown) => {
        if (value === '' || value === null || typeof value === 'undefined') return fallback
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : fallback
    },
})

const formatNumberPreserveDecimal = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value))

export default function DroneDeliveryConfigPage() {
    const navigate = useNavigate()
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<DroneDeliveryFormValues>({
        resolver: zodResolver(DroneDeliverySchema),
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

    const droneCountRaw = useWatch({ control, name: 'droneCount', defaultValue: 3 })
    const drones = useWatch({ control, name: 'drones', defaultValue: [100, 200, 300] })
    const droneCount = Math.max(1, Math.trunc(Number(droneCountRaw) || 0))

    useEffect(() => {
        const current = Array.isArray(drones) ? drones : []

        if (current.length === droneCount) return

        if (current.length < droneCount) {
            setValue('drones', current.concat(Array(droneCount - current.length).fill(100))) // fill 100 instead of 0 to avoid validation errors
            return
        }

        setValue('drones', current.slice(0, droneCount))
    }, [droneCount, drones, setValue])

    const onSubmit = async (data: DroneDeliveryFormValues) => {
        const final = [
            `drones=${data.drones.join(',')}`,
            `ar.min=${formatNumberPreserveDecimal(data.arMin)}`,
            `ar.max=${formatNumberPreserveDecimal(data.arMax)}`,
            `xPointQuantity=${data.xPointQuantity}`,
            `maxQueueSize=${data.maxQueueSize}`,
            `totalPackages=${data.totalPackages}`,
            `simulationNumber=${data.simulationNumber}`,
        ].join('\n')

        try {
            const response = await axios.post(`${API_URL}/execucoes`, { 
                simulator: 'drone-delivery', 
                propertiesContent: final 
            })
            navigate(`/simuladores/execucao/${response.data.id}`)
        } catch (error) {
            console.error('Erro ao iniciar a simulação:', error)
            setIsErrorModalOpen(true)
        }
    }

    return (
        <PageShell title="Configuração de Simulação" description="Drone Delivery Sim — ajuste os parâmetros da simulação abaixo.">
            <div
                className="p-6 rounded-lg border"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                Qtd de Configurações de Drones
                            </label>
                            <input
                                type="number"
                                min={1}
                                {...register('droneCount', intFieldOptions(1))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                            {errors.droneCount ? (
                                <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>
                                    Informe uma quantidade válida.
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                ar.min
                            </label>
                            <input
                                type="number"
                                step="any"
                                {...register('arMin', floatFieldOptions(0.001))}
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
                                {...register('arMax', floatFieldOptions(5.0))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                xPointQuantity
                            </label>
                            <input
                                type="number"
                                {...register('xPointQuantity', intFieldOptions(20))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                maxQueueSize
                            </label>
                            <input
                                type="number"
                                {...register('maxQueueSize', intFieldOptions(100))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                totalPackages
                            </label>
                            <input
                                type="number"
                                {...register('totalPackages', intFieldOptions(1000))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                simulationNumber
                            </label>
                            <input
                                type="number"
                                {...register('simulationNumber', intFieldOptions(50))}
                                className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            Drones (configurações)
                        </label>

                        <div className="space-y-2">
                            {Array.from({ length: droneCount }).map((_, index) => (
                                <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-2">
                                    <label className="w-full md:w-32 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        Configuração {index + 1}
                                    </label>
                                    <input
                                        type="number"
                                        {...register(`drones.${index}`, intFieldOptions(1))}
                                        className="w-full flex-1 rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary)"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <div className="p-4 rounded-md border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
                            <p className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>
                                Corrija os erros abaixo antes de iniciar:
                            </p>
                            <ul className="list-disc pl-5 text-sm" style={{ color: '#ef4444' }}>
                                {errors.droneCount && <li>Qtd de Drones: {errors.droneCount.message || 'Valor inválido'}</li>}
                                {errors.arMin && <li>ar.min: {errors.arMin.message || 'Valor inválido'}</li>}
                                {errors.arMax && <li>ar.max: {errors.arMax.message || 'Valor inválido'}</li>}
                                {errors.xPointQuantity && <li>xPointQuantity: {errors.xPointQuantity.message || 'Valor inválido'}</li>}
                                {errors.maxQueueSize && <li>maxQueueSize: {errors.maxQueueSize.message || 'Valor inválido'}</li>}
                                {errors.totalPackages && <li>totalPackages: {errors.totalPackages.message || 'Valor inválido'}</li>}
                                {errors.simulationNumber && <li>simulationNumber: {errors.simulationNumber.message || 'Valor inválido'}</li>}
                                {errors.drones && <li>Configurações de Drones: Contém valores inválidos (devem ser maiores que 0).</li>}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Link
                            to="/"
                            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors"
                            style={{
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-text-secondary)'
                                e.currentTarget.style.color = 'var(--color-text-secondary)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-border)'
                                e.currentTarget.style.color = 'var(--color-text-muted)'
                            }}
                        >
                            <ArrowLeft size={14} />
                            Voltar
                        </Link>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-opacity"
                            style={{
                                backgroundColor: 'var(--color-cyan-primary)',
                                color: 'var(--color-background)',
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting && (
                                <span
                                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                                    style={{ borderColor: 'var(--color-background)', borderTopColor: 'transparent' }}
                                />
                            )}
                            {isSubmitting ? 'Iniciando...' : 'Iniciar Simulação'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal de Erro */}
            <Modal
                isOpen={isErrorModalOpen}
                title="Erro ao iniciar"
                description="Falha ao iniciar a simulação. Verifique a conexão com o servidor e tente novamente."
                variant="info"
                confirmText="OK"
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
