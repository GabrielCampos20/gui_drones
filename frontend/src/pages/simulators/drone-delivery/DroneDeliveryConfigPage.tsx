import { useEffect, useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as z from 'zod'
import PageShell from '../../../components/ui/PageShell'
import Modal from '../../../components/ui/Modal'
import { executionsApi } from '../../../services/executions'
import { useLanguage } from '../../../contexts/LanguageContext'

type DroneDeliveryFormValues = {
    droneCount: number
    drones: number[]
    arMin: number
    arMax: number
    xPointQuantity: number
    maxQueueSize: number
    totalPackages: number
    simulationNumber: number
}

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
    const { t } = useLanguage()

    const schema = useMemo(() => {
        return z.object({
            droneCount: z.number().int().positive(),
            drones: z.array(z.number().int().positive()),
            arMin: z.number().positive(),
            arMax: z.number().positive(),
            xPointQuantity: z.number().int().positive(),
            maxQueueSize: z.number().int().positive(),
            totalPackages: z.number().int().positive(),
            simulationNumber: z.number().int().positive(),
        }).refine(data => data.arMax > data.arMin, {
            message: t('ar_max_error'),
            path: ["arMax"],
        })
    }, [t])

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<DroneDeliveryFormValues>({
        resolver: zodResolver(schema),
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
        const propertiesContent = [
            `drones=${data.drones.join(',')}`,
            `ar.min=${formatNumberPreserveDecimal(data.arMin)}`,
            `ar.max=${formatNumberPreserveDecimal(data.arMax)}`,
            `xPointQuantity=${data.xPointQuantity}`,
            `maxQueueSize=${data.maxQueueSize}`,
            `totalPackages=${data.totalPackages}`,
            `simulationNumber=${data.simulationNumber}`,
        ].join('\n')

        try {
            const { data: execution } = await executionsApi.start('drone-delivery', propertiesContent)
            navigate(`/simuladores/execucao/${execution.id}`)
        } catch (error) {
            console.error('Erro ao iniciar a simulação:', error)
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

    return (
        <PageShell title={t('config_title')} description={t('config_subtitle_dd')}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Formulário (2/3 width) */}
                <div
                    className="lg:col-span-2 p-6 rounded-lg border"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('drone_config_count')}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    {...register('droneCount', intFieldOptions(1))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                                {errors.droneCount ? (
                                    <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>
                                        {t('invalid_drone_count')}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('ar_min')}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    {...register('arMin', floatFieldOptions(0.001))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('ar_max')}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    {...register('arMax', floatFieldOptions(5.0))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('max_queue_size')}
                                </label>
                                <input
                                    type="number"
                                    {...register('maxQueueSize', intFieldOptions(100))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('total_packages')}
                                </label>
                                <input
                                    type="number"
                                    {...register('totalPackages', intFieldOptions(1000))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                            </div>

                            <div>
                                <label className={labelClass} style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('simulation_number')}
                                </label>
                                <input
                                    type="number"
                                    {...register('simulationNumber', intFieldOptions(50))}
                                    className="w-full rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('drones_label')}
                            </label>

                            <div className="space-y-2">
                                {Array.from({ length: droneCount }).map((_, index) => (
                                    <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-2">
                                        <label className="w-full md:w-32 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                            {t('config_label')} {index + 1}
                                        </label>
                                        <input
                                            type="number"
                                            {...register(`drones.${index}`, intFieldOptions(1))}
                                            className="w-full flex-1 rounded-md px-3 py-2 bg-(--color-surface) border border-(--color-border) focus:outline-none focus:border-(--color-cyan-primary) text-(--color-text-primary)"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {Object.keys(errors).length > 0 && (
                            <div className="p-4 rounded-md border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
                                <p className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>
                                    {t('fix_errors')}
                                </p>
                                <ul className="list-disc pl-5 text-sm" style={{ color: '#ef4444' }}>
                                    {errors.droneCount && <li>{t('drone_config_count')}: {t('invalid_drone_count')}</li>}
                                    {errors.arMin && <li>ar.min: {t('invalid_value')}</li>}
                                    {errors.arMax && <li>ar.max: {errors.arMax.message || t('invalid_value')}</li>}
                                    {errors.xPointQuantity && <li>xPointQuantity: {t('invalid_value')}</li>}
                                    {errors.maxQueueSize && <li>maxQueueSize: {t('invalid_value')}</li>}
                                    {errors.totalPackages && <li>totalPackages: {t('invalid_value')}</li>}
                                    {errors.simulationNumber && <li>simulationNumber: {t('invalid_value')}</li>}
                                    {errors.drones && <li>{t('invalid_drone_config_values')}</li>}
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
                                {t('voltar')}
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
                                {isSubmitting ? t('starting') : t('start_sim')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar (1/3 width) */}
                <div className="space-y-6">
                    {/* Descrição do Simulador */}
                    <div className="p-6 rounded-lg border text-(--color-text-primary)" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                        <h3 className="text-lg font-bold mb-3">{t('dd_desc_title')}</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                            {t('dd_desc_text')}
                        </p>
                    </div>

                    {/* Explicação das Métricas */}
                    <aside className="p-6 rounded-lg border text-(--color-text-primary)" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                        <h3 className="text-lg font-bold mb-4">{t('guide_title')}</h3>
                        <div className="space-y-4">
                            {renderGuideItem('guide_ar')}
                            {renderGuideItem('guide_queue')}
                            {renderGuideItem('guide_drones')}
                            {renderGuideItem('guide_total_packages')}
                            {renderGuideItem('guide_runs')}
                        </div>
                    </aside>
                </div>
            </div>

            {/* Modal de Erro */}
            <Modal
                isOpen={isErrorModalOpen}
                title={t('error_start_title')}
                description={t('error_start_desc')}
                variant="info"
                confirmText="OK"
                onConfirm={() => setIsErrorModalOpen(false)}
            />
        </PageShell>
    )
}
