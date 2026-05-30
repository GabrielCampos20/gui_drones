import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as z from 'zod'
import PageShell from '../../../components/ui/PageShell'
import Modal from '../../../components/ui/Modal'
import { executionsApi } from '../../../services/executions'

const SharedDroneSchema = z.object({
    type: z.enum(['STATIONARY', 'TRANSIENT']),
    queueCapacity: z.number().int().positive(),
    dronesPerWarehouse: z.number().int().positive(),
    meanServiceTime: z.number().positive(),
    pickupTime: z.number().positive(),
    flightTime: z.number().positive(),
    transferTime: z.number().positive(),
    phaseDuration: z.number().positive(),
    backlogThreshold: z.number().int().positive(),
    migrateBatch: z.number().int().positive(),
    baseSeed: z.number().int().positive(),
    
    // transient
    transientSimTime: z.number().positive(),
    transientSampleStep: z.number().positive(),
    transientWarmupTime: z.number().min(0),
    transientMeanInterarrival: z.number().positive(),
    transientRuns: z.number().int().positive(),
    transientSmaWindow: z.number().int().positive(),

    // stationary
    stationarySimTime: z.number().positive(),
    stationaryWarmupTime: z.number().min(0),
    stationarySampleStep: z.number().positive(),
    stationaryMinAr: z.number().positive(),
    stationaryMaxAr: z.number().positive(),
    stationaryArStep: z.number().positive(),
    stationaryReplicas: z.number().int().positive(),
}).refine(data => data.stationaryMaxAr > data.stationaryMinAr, {
    message: "maxAr deve ser maior que minAr",
    path: ["stationaryMaxAr"]
})

type FormValues = z.infer<typeof SharedDroneSchema>

const intField = (fallback: number) => ({
    setValueAs: (value: unknown) => {
        if (value === '' || value === null || typeof value === 'undefined') return fallback
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
    },
})

const floatField = (fallback: number) => ({
    setValueAs: (value: unknown) => {
        if (value === '' || value === null || typeof value === 'undefined') return fallback
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : fallback
    },
})

const formatNumber = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value))

export default function SharedDroneConfigPage() {
    const navigate = useNavigate()
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(SharedDroneSchema),
        defaultValues: {
            type: 'STATIONARY',
            queueCapacity: 40,
            dronesPerWarehouse: 20,
            meanServiceTime: 0.5,
            pickupTime: 2.0,
            flightTime: 75.0,
            transferTime: 2.5,
            phaseDuration: 500.0,
            backlogThreshold: 10,
            migrateBatch: 3,
            baseSeed: 42,

            transientSimTime: 6000.0,
            transientSampleStep: 150.0,
            transientWarmupTime: 0.0,
            transientMeanInterarrival: 2.77,
            transientRuns: 1,
            transientSmaWindow: 3,

            stationarySimTime: 50000.0,
            stationaryWarmupTime: 10000.0,
            stationarySampleStep: 500.0,
            stationaryMinAr: 0.08,
            stationaryMaxAr: 0.3831578947368421,
            stationaryArStep: 0.03789473684210526,
            stationaryReplicas: 500,
        },
    })

    const simulationType = useWatch({ control, name: 'type' })

    const onSubmit = async (data: FormValues) => {
        const props: string[] = []
        
        props.push(`simulation.type=${data.type}`)
        props.push(`queueCapacity=${data.queueCapacity}`)
        props.push(`dronesPerWarehouse=${data.dronesPerWarehouse}`)
        props.push(`meanServiceTime=${formatNumber(data.meanServiceTime)}`)
        props.push(`pickupTime=${formatNumber(data.pickupTime)}`)
        props.push(`flightTime=${formatNumber(data.flightTime)}`)
        props.push(`transferTime=${formatNumber(data.transferTime)}`)
        props.push(`phaseDuration=${formatNumber(data.phaseDuration)}`)
        props.push(`backlogThreshold=${data.backlogThreshold}`)
        props.push(`migrateBatch=${data.migrateBatch}`)
        props.push(`baseSeed=${data.baseSeed}`)

        if (data.type === 'TRANSIENT') {
            props.push(`transient.simTime=${formatNumber(data.transientSimTime)}`)
            props.push(`transient.sampleStep=${formatNumber(data.transientSampleStep)}`)
            props.push(`transient.warmupTime=${formatNumber(data.transientWarmupTime)}`)
            props.push(`transient.meanInterarrival=${formatNumber(data.transientMeanInterarrival)}`)
            props.push(`transient.runs=${data.transientRuns}`)
            props.push(`transient.smaWindow=${data.transientSmaWindow}`)
        } else {
            props.push(`stationary.simTime=${formatNumber(data.stationarySimTime)}`)
            props.push(`stationary.warmupTime=${formatNumber(data.stationaryWarmupTime)}`)
            props.push(`stationary.sampleStep=${formatNumber(data.stationarySampleStep)}`)
            props.push(`stationary.minAr=${formatNumber(data.stationaryMinAr)}`)
            props.push(`stationary.maxAr=${formatNumber(data.stationaryMaxAr)}`)
            props.push(`stationary.arStep=${formatNumber(data.stationaryArStep)}`)
            props.push(`stationary.replicas=${data.stationaryReplicas}`)
        }

        try {
            const { data: execution } = await executionsApi.start('shared-drone-delivery', props.join('\n'))
            navigate(`/simuladores/execucao/${execution.id}`)
        } catch (error) {
            console.error('Erro ao iniciar simulação:', error)
            setIsErrorModalOpen(true)
        }
    }

    const inputClass = "w-full p-2 rounded border bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-cyan-primary)] outline-none transition-shadow"
    const labelClass = "block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"

    return (
        <PageShell
            title="Shared Drone Delivery Sim"
            description="Configure os parâmetros para o simulador de drones com logística compartilhada."
        >
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-[var(--color-card)] border-[var(--color-border)]">
                    <Link to="/" className="text-[var(--color-cyan-primary)] hover:underline flex items-center gap-2">
                        <ArrowLeft size={16} />
                        Voltar para Simuladores
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--color-cyan-primary)] text-black font-semibold rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Iniciando...' : 'Iniciar Simulação'}
                    </button>
                </div>

                {/* Tipo de Simulação */}
                <div className="p-6 rounded-lg border bg-[var(--color-card)] border-[var(--color-border)]">
                    <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Modo de Simulação</h3>
                    <div>
                        <label className={labelClass}>simulation.type</label>
                        <select {...register('type')} className={inputClass}>
                            <option value="STATIONARY">Estacionária (STATIONARY)</option>
                            <option value="TRANSIENT">Transiente (TRANSIENT)</option>
                        </select>
                    </div>
                </div>

                {/* Parâmetros Gerais */}
                <div className="p-6 rounded-lg border bg-[var(--color-card)] border-[var(--color-border)]">
                    <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Parâmetros Gerais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>queueCapacity</label>
                            <input type="number" {...register('queueCapacity', intField(40))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>dronesPerWarehouse</label>
                            <input type="number" {...register('dronesPerWarehouse', intField(20))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>meanServiceTime (minutos)</label>
                            <input type="number" step="0.1" {...register('meanServiceTime', floatField(0.5))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>pickupTime (minutos)</label>
                            <input type="number" step="0.1" {...register('pickupTime', floatField(2.0))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>flightTime (minutos)</label>
                            <input type="number" step="0.1" {...register('flightTime', floatField(75.0))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>transferTime (minutos)</label>
                            <input type="number" step="0.1" {...register('transferTime', floatField(2.5))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>phaseDuration (minutos)</label>
                            <input type="number" step="0.1" {...register('phaseDuration', floatField(500.0))} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Parâmetros Transientes */}
                {simulationType === 'TRANSIENT' && (
                    <div className="p-6 rounded-lg border bg-[var(--color-card)] border-[var(--color-border)]">
                        <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Parâmetros Transientes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>simTime (minutos)</label>
                                <input type="number" step="0.1" {...register('transientSimTime', floatField(6000.0))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>warmupTime (minutos)</label>
                                <input type="number" step="0.1" {...register('transientWarmupTime', floatField(0.0))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>meanInterarrival</label>
                                <input type="number" step="0.01" {...register('transientMeanInterarrival', floatField(2.77))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>runs</label>
                                <input type="number" {...register('transientRuns', intField(1))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>smaWindow</label>
                                <input type="number" {...register('transientSmaWindow', intField(3))} className={inputClass} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Parâmetros Estacionários */}
                {simulationType === 'STATIONARY' && (
                    <div className="p-6 rounded-lg border bg-[var(--color-card)] border-[var(--color-border)]">
                        <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Parâmetros Estacionários</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>simTime (minutos)</label>
                                <input type="number" step="0.1" {...register('stationarySimTime', floatField(50000.0))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>warmupTime (minutos)</label>
                                <input type="number" step="0.1" {...register('stationaryWarmupTime', floatField(10000.0))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>minAr</label>
                                <input type="number" step="0.0001" {...register('stationaryMinAr', floatField(0.08))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>maxAr</label>
                                <input type="number" step="0.0001" {...register('stationaryMaxAr', floatField(0.383157894))} className={inputClass} />
                                {errors.stationaryMaxAr && <p className="text-red-500 text-sm mt-1">{errors.stationaryMaxAr.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>replicas</label>
                                <input type="number" {...register('stationaryReplicas', intField(500))} className={inputClass} />
                            </div>
                        </div>
                    </div>
                )}

            </form>

            <Modal
                isOpen={isErrorModalOpen}
                title="Erro"
                description="Ocorreu um erro ao tentar iniciar a simulação. Verifique o console ou a rede."
                variant="danger"
                confirmText="Fechar"
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
