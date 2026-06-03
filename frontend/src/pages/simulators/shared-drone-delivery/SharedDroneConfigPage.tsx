import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as z from 'zod'
import PageShell from '../../../components/ui/PageShell'
import Modal from '../../../components/ui/Modal'
import { executionsApi } from '../../../services/executions'
import { useLanguage } from '../../../contexts/LanguageContext'

type FormValues = {
    type: 'STATIONARY' | 'TRANSIENT'
    queueCapacity: number
    dronesPerWarehouse: number
    meanServiceTime: number
    pickupTime: number
    flightTime: number
    transferTime: number
    phaseDuration: number
    backlogThreshold: number
    migrateBatch: number
    baseSeed: number
    
    // transient
    transientSimTime: number
    transientSampleStep: number
    transientWarmupTime: number
    transientMeanInterarrival: number
    transientRuns: number
    transientSmaWindow: number

    // stationary
    stationarySimTime: number
    stationaryWarmupTime: number
    stationarySampleStep: number
    stationaryMinAr: number
    stationaryMaxAr: number
    stationaryArStep: number
    stationaryReplicas: number
}

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
    const { t } = useLanguage()

    const schema = useMemo(() => {
        return z.object({
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
            message: t('max_ar_error'),
            path: ["stationaryMaxAr"]
        })
    }, [t])

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
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

    const renderGuideItem = (key: Parameters<typeof t>[0]) => {
        const parts = t(key).split(': ')
        const title = parts[0]
        const desc = parts.slice(1).join(': ')
        return (
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-cyan-primary)' }}>{title}</h4>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>{desc}</p>
            </div>
        )
    }

    const labelClass = "block text-sm font-medium mb-1 md:h-14 md:flex md:items-end"
    const styleLabel = { color: 'var(--color-text-secondary)' }
    const inputClass = "w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"

    return (
        <PageShell
            title={t('config_title')}
            description={t('config_subtitle_sd')}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Formulário (2/3 width) */}
                <div
                    className="lg:col-span-2 p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Modo de Simulação */}
                        <div>
                            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('sim_mode')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('sim_type')}</label>
                                    <select {...register('type')} className={inputClass}>
                                        <option value="STATIONARY">{t('stationary')}</option>
                                        <option value="TRANSIENT">{t('transient')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <hr style={{ borderColor: 'var(--color-border)', opacity: 0.3 }} />

                        {/* Parâmetros Gerais */}
                        <div>
                            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('general_params')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('queue_capacity')}</label>
                                    <input type="number" min={1} {...register('queueCapacity', intField(40))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('drones_per_warehouse')}</label>
                                    <input type="number" min={1} {...register('dronesPerWarehouse', intField(20))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('mean_service_time')}</label>
                                    <input type="number" step="any" {...register('meanServiceTime', floatField(0.5))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('pickup_time')}</label>
                                    <input type="number" step="any" {...register('pickupTime', floatField(2.0))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('flight_time')}</label>
                                    <input type="number" step="any" {...register('flightTime', floatField(75.0))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('transfer_time')}</label>
                                    <input type="number" step="any" {...register('transferTime', floatField(2.5))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('phase_duration')}</label>
                                    <input type="number" step="any" {...register('phaseDuration', floatField(500.0))} className={inputClass} />
                                </div>

                                <div>
                                    <label className={labelClass} style={styleLabel}>{t('base_seed')}</label>
                                    <input type="number" min={1} {...register('baseSeed', intField(42))} className={inputClass} />
                                </div>
                            </div>
                        </div>

                        <hr style={{ borderColor: 'var(--color-border)', opacity: 0.3 }} />

                        {/* Parâmetros Específicos do Modo */}
                        {simulationType === 'TRANSIENT' ? (
                            <div>
                                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('mode_params_transient')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sim_time')}</label>
                                        <input type="number" step="any" {...register('transientSimTime', floatField(6000.0))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('warmup_time')}</label>
                                        <input type="number" step="any" {...register('transientWarmupTime', floatField(0.0))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('mean_interarrival')}</label>
                                        <input type="number" step="any" {...register('transientMeanInterarrival', floatField(2.77))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sim_runs')}</label>
                                        <input type="number" min={1} {...register('transientRuns', intField(1))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sma_window')}</label>
                                        <input type="number" min={1} {...register('transientSmaWindow', intField(3))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sample_step')}</label>
                                        <input type="number" step="any" {...register('transientSampleStep', floatField(150.0))} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('mode_params_stationary')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sim_time')}</label>
                                        <input type="number" step="any" {...register('stationarySimTime', floatField(50000.0))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('warmup_time')}</label>
                                        <input type="number" step="any" {...register('stationaryWarmupTime', floatField(10000.0))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('min_ar')}</label>
                                        <input type="number" step="any" {...register('stationaryMinAr', floatField(0.08))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('max_ar')}</label>
                                        <input type="number" step="any" {...register('stationaryMaxAr', floatField(0.3831578947368421))} className={inputClass} />
                                        {errors.stationaryMaxAr && <p className="text-red-500 text-sm mt-1">{errors.stationaryMaxAr.message}</p>}
                                    </div>

                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('replicas')}</label>
                                        <input type="number" min={1} {...register('stationaryReplicas', intField(500))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass} style={styleLabel}>{t('sample_step')}</label>
                                        <input type="number" step="any" {...register('stationarySampleStep', floatField(500.0))} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
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
                                <ArrowLeft size={16} />
                                {t('voltar_simuladores')}
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
                                style={{
                                    backgroundColor: 'var(--color-cyan-primary)',
                                    color: 'var(--color-background)',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.5 : 1,
                                }}
                            >
                                {isSubmitting ? t('starting') : t('start_sim')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar (1/3 width) */}
                <div className="space-y-6">
                    {/* Descrição do Simulador */}
                    <div className="p-6 rounded-lg border text-(--color-text-primary)" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                        <h3 className="text-lg font-bold mb-3">{t('sd_desc_title')}</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                            {t('sd_desc_text')}
                        </p>
                    </div>

                    {/* Explicação das Métricas */}
                    <aside className="p-6 rounded-lg border text-(--color-text-primary)" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                        <h3 className="text-lg font-bold mb-4">{t('guide_title')}</h3>
                        <div className="space-y-4">
                            {renderGuideItem('guide_queue_sd')}
                            {renderGuideItem('guide_drones_sd')}
                            {renderGuideItem('guide_phase_sd')}
                            {renderGuideItem('guide_times_sd')}
                            {renderGuideItem('guide_base_seed')}

                            {simulationType === 'TRANSIENT' ? (
                                <>
                                    {renderGuideItem('guide_sd_sim_time_transient')}
                                    {renderGuideItem('guide_sd_warmup_time_transient')}
                                    {renderGuideItem('guide_sd_mean_interarrival')}
                                    {renderGuideItem('guide_sd_runs_transient')}
                                    {renderGuideItem('guide_sd_sma_window')}
                                    {renderGuideItem('guide_sd_sample_step_transient')}
                                </>
                            ) : (
                                <>
                                    {renderGuideItem('guide_sd_sim_time_stationary')}
                                    {renderGuideItem('guide_sd_warmup_time_stationary')}
                                    {renderGuideItem('guide_sd_min_ar')}
                                    {renderGuideItem('guide_sd_max_ar')}
                                    {renderGuideItem('guide_sd_replicas')}
                                    {renderGuideItem('guide_sd_sample_step_stationary')}
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <Modal
                isOpen={isErrorModalOpen}
                title={t('error_start_title')}
                description={t('error_start_desc')}
                variant="danger"
                confirmText={t('cancel')}
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
