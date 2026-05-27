/**
 * DroneArena — Real-time drone delivery visualisation.
 * Redesigned as an aeronautical dashboard.
 *
 * - 5 drones always circulating (Origem → Destino → Origem).
 * - SSE consumed via fetch + ReadableStream.
 * - Drop events trigger a crash animation.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, AlertTriangle, Crosshair, MapPin } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOTAL_DRONES = 5

/** Track percentage margins */
const TRACK_LEFT  = 16   // %
const TRACK_RIGHT = 84   // %
const TRACK_SPAN  = TRACK_RIGHT - TRACK_LEFT   // 68 %

/** Duration for a full Origem→Destino leg (ms). */
const LEG_DURATION_MS = 3800

// ─── Types ────────────────────────────────────────────────────────────────────

type DronePhase = 'forward' | 'return'
type DroneStatus = 'active' | 'crashing' | 'entering'

interface DroneState {
    id: number
    lane: number
    progress: number
    phase: DronePhase
    status: DroneStatus
    lastTick: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialDrones(): DroneState[] {
    const now = performance.now()
    return Array.from({ length: TOTAL_DRONES }, (_, i) => ({
        id:       i,
        lane:     i,
        progress: i / TOTAL_DRONES,
        phase:    i % 2 === 0 ? 'forward' : 'return',
        status:   'active',
        lastTick: now,
    }))
}

let _nextId = TOTAL_DRONES
function nextDroneId() { return _nextId++ }

// ─── Component ────────────────────────────────────────────────────────────────

interface DroneArenaProps {
    executionId: string
}

export default function DroneArena({ executionId }: DroneArenaProps) {
    const [drones, setDrones]           = useState<DroneState[]>(buildInitialDrones)
    const [packagesLost, setPackagesLost] = useState(0)
    const [simStatus, setSimStatus]     = useState<'running' | 'done' | 'error'>('running')

    const rafRef = useRef<number | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    // ─── Animation loop ───────────────────────────────────────────────────────

    const tick = useCallback((now: number) => {
        setDrones((prev) => prev.map((drone) => {
            if (drone.status === 'crashing') return drone

            const elapsed  = now - drone.lastTick
            const delta    = elapsed / LEG_DURATION_MS
            let   progress = drone.progress + delta
            let   phase    = drone.phase

            if (progress >= 1) {
                progress = progress - 1
                phase    = phase === 'forward' ? 'return' : 'forward'
            }

            return { ...drone, progress, phase, lastTick: now }
        }))

        rafRef.current = requestAnimationFrame(tick)
    }, [])

    useEffect(() => {
        rafRef.current = requestAnimationFrame(tick)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [tick])

    // ─── SSE via fetch + ReadableStream ───────────────────────────────────────

    const handleLine = useCallback((line: string) => {
        if (/has been dropped/i.test(line)) {
            setPackagesLost((n) => n + 1)

            setDrones((prev) => {
                const candidateIdx = prev.findIndex(
                    (d) => d.phase === 'forward' && d.status === 'active'
                )
                if (candidateIdx === -1) return prev

                const crashed = { ...prev[candidateIdx], status: 'crashing' as DroneStatus }
                const next    = [...prev]
                next[candidateIdx] = crashed

                setTimeout(() => {
                    setDrones((d) => {
                        const withoutCrash = d.filter((x) => x.id !== crashed.id)
                        const newDrone: DroneState = {
                            id:       nextDroneId(),
                            lane:     crashed.lane,
                            progress: 0,
                            phase:    'forward',
                            status:   'entering',
                            lastTick: performance.now(),
                        }
                        setTimeout(() => {
                            setDrones((dd) =>
                                dd.map((x) => x.id === newDrone.id ? { ...x, status: 'active' } : x)
                            )
                        }, 600)
                        return [...withoutCrash, newDrone]
                    })
                }, 900)

                return next
            })
        }
    }, [])

    useEffect(() => {
        const controller  = new AbortController()
        abortRef.current  = controller

        ;(async () => {
            try {
                const res = await fetch(`${API_URL}/execucoes/stream`, {
                    signal: controller.signal,
                })

                if (!res.ok || !res.body) { setSimStatus('error'); return }

                const reader  = res.body.getReader()
                const decoder = new TextDecoder()
                let   buffer  = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    const frames = buffer.split('\n\n')
                    buffer       = frames.pop() ?? ''

                    for (const frame of frames) {
                        if (/^event:\s*done/m.test(frame)) {
                            setSimStatus('done')
                            reader.cancel()
                            return
                        }
                        for (const raw of frame.split('\n')) {
                            if (raw.startsWith('data:')) {
                                const payload = raw.slice(5).trim()
                                try {
                                    const evt = JSON.parse(payload)
                                    if (evt.type === 'simulation_end') {
                                        setSimStatus('done')
                                        reader.cancel()
                                        return
                                    }
                                    if (evt.type === 'package_drop') {
                                        handleLine('has been dropped')
                                    }
                                } catch {
                                    handleLine(payload)
                                }
                            }
                        }
                    }
                }

                setSimStatus('done')
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== 'AbortError') setSimStatus('error')
            }
        })()

        return () => controller.abort()
    }, [executionId, handleLine])

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            className="w-full rounded-xl border overflow-hidden mb-6"
            style={{
                backgroundColor: 'var(--color-surface)',
                borderColor:     'var(--color-border)',
                fontFamily:      '"Inter", "JetBrains Mono", monospace',
            }}
        >
            {/* ── Top Status Bar ─────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b relative overflow-hidden"
                style={{ borderColor: 'var(--color-border)', backgroundColor: '#11151c' }}
            >
                {/* Decorative scanning line */}
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, var(--color-cyan-primary) 50%, transparent 100%)',
                        height: '1px',
                        bottom: 0,
                        top: 'auto',
                    }}
                />

                <div className="flex items-center gap-3">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                            backgroundColor:
                                simStatus === 'done'  ? 'var(--color-success)'
                                : simStatus === 'error' ? 'var(--color-error)'
                                : 'var(--color-cyan-primary)',
                            animation:
                                simStatus === 'running'
                                    ? 'pulse-dot 1.5s ease-in-out infinite'
                                    : 'none',
                        }}
                    />
                    <span
                        className="text-xs font-bold tracking-[0.15em] uppercase"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        {simStatus === 'done'  ? 'OPERAÇÃO CONCLUÍDA'
                         : simStatus === 'error' ? 'FALHA DE TELEMETRIA'
                         : 'MONITORAMENTO EM TEMPO REAL'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                            Pacotes Perdidos
                        </span>
                        <span
                            className="text-2xl font-bold tabular-nums leading-none mt-0.5"
                            style={{ color: packagesLost > 0 ? 'var(--color-error)' : 'var(--color-cyan-deep)' }}
                        >
                            {packagesLost.toString().padStart(3, '0')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Arena / Radar View ────────────────────────────────────────── */}
            <div
                className="relative w-full select-none"
                style={{ height: '320px', backgroundColor: '#0d1117' }}
            >
                {/* Radar Grid Background */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, #ffffff 1px, transparent 1px),
                            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Main Flight Corridor (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line
                        x1={`${TRACK_LEFT}%`} y1="50%"
                        x2={`${TRACK_RIGHT}%`} y2="50%"
                        stroke="var(--color-border)"
                        strokeWidth="1.5"
                        strokeDasharray="4 6"
                        opacity="0.6"
                    />
                    <line
                        x1={`${TRACK_LEFT}%`} y1="35%"
                        x2={`${TRACK_RIGHT}%`} y2="35%"
                        stroke="var(--color-cyan-primary)"
                        strokeWidth="1"
                        strokeDasharray="1 10"
                        opacity="0.1"
                    />
                    <line
                        x1={`${TRACK_LEFT}%`} y1="65%"
                        x2={`${TRACK_RIGHT}%`} y2="65%"
                        stroke="var(--color-text-muted)"
                        strokeWidth="1"
                        strokeDasharray="1 10"
                        opacity="0.1"
                    />
                </svg>

                {/* Nodes */}
                <MapNode side="left"  label="BASE ORIGEM" active={simStatus === 'running'} trackLeft={TRACK_LEFT} />
                <MapNode side="right" label="ALVO DESTINO" active={simStatus === 'running'} trackLeft={TRACK_RIGHT} />

                {/* Drones */}
                {drones.map((drone) => (
                    <DroneToken
                        key={drone.id}
                        drone={drone}
                        totalLanes={TOTAL_DRONES}
                        trackLeft={TRACK_LEFT}
                        trackSpan={TRACK_SPAN}
                    />
                ))}

                {/* Simulation Done Overlay */}
                {simStatus === 'done' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none z-10">
                        <div className="px-6 py-3 rounded-lg border flex items-center gap-3" style={{ borderColor: 'var(--color-success)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                            <Crosshair size={18} style={{ color: 'var(--color-success)' }} />
                            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--color-success)' }}>
                                Simulação Finalizada
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Legend ─────────────────────────────────────────────────── */}
            <div
                className="flex items-center gap-8 px-6 py-3 border-t"
                style={{ borderColor: 'var(--color-border)', backgroundColor: '#11151c' }}
            >
                <LegendItem icon={<Navigation size={12} fill="currentColor" />} color="var(--color-cyan-primary)" label="Em trânsito (com pacote)" />
                <LegendItem icon={<Navigation size={12} />} color="var(--color-text-muted)" label="Retorno" />
                <LegendItem icon={<AlertTriangle size={12} />} color="var(--color-error)" label="Queda" />
            </div>
        </div>
    )
}

// ─── Components ───────────────────────────────────────────────────────────────

function MapNode({ side, label, active, trackLeft }: { side: 'left' | 'right'; label: string; active: boolean; trackLeft: number }) {
    return (
        <div
            className="absolute top-1/2 flex flex-col items-center gap-3"
            style={{
                left: `${trackLeft}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
            }}
        >
            <div
                className="relative flex items-center justify-center"
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface)',
                    border: `1.5px solid ${active ? 'var(--color-cyan-deep)' : 'var(--color-border)'}`,
                    boxShadow: active ? '0 0 20px 2px rgba(14, 165, 233, 0.15)' : 'none',
                    transition: 'all 0.6s ease',
                }}
            >
                {active && (
                    <div
                        className="absolute inset-0 rounded-full border border-cyan-500/30"
                        style={{ animation: 'node-breathe 2.5s ease-out infinite' }}
                    />
                )}
                {side === 'left' ? (
                    <Crosshair size={22} style={{ color: active ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)' }} />
                ) : (
                    <MapPin size={22} style={{ color: active ? 'var(--color-cyan-light)' : 'var(--color-text-muted)' }} />
                )}
            </div>
            <span
                className="text-[10px] font-bold tracking-[0.2em] px-2 py-1 rounded"
                style={{
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)'
                }}
            >
                {label}
            </span>
        </div>
    )
}

function DroneToken({ drone, totalLanes, trackLeft, trackSpan }: { drone: DroneState; totalLanes: number; trackLeft: number; trackSpan: number }) {
    const isForward  = drone.phase === 'forward'
    const isCrashing = drone.status === 'crashing'
    const isEntering = drone.status === 'entering'

    const ARENA_HEIGHT = 320
    // Keep drones grouped around the center (height 160)
    const spanHeight = 120
    const topPx = (ARENA_HEIGHT / 2) - (spanHeight / 2) + ((spanHeight / (totalLanes - 1)) * drone.lane)

    const rawProgress = isForward ? drone.progress : 1 - drone.progress
    const leftPct     = trackLeft + rawProgress * trackSpan

    const color = isCrashing ? 'var(--color-error)' : isForward ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)'
    const rotation = isCrashing ? 0 : isForward ? 90 : -90
    
    // Slight vertical bobbing based on progress
    const bobbing = !isCrashing ? Math.sin(rawProgress * Math.PI * 8) * 3 : 0

    const animation = isCrashing
        ? 'drone-crash 0.9s cubic-bezier(0.4,0,1,1) forwards'
        : isEntering
        ? 'drone-enter 0.6s ease-out forwards'
        : 'none'

    return (
        <div
            className="absolute flex items-center justify-center"
            style={{
                top: `${topPx}px`,
                left: `${leftPct}%`,
                transform: `translate(-50%, calc(-50% + ${bobbing}px)) rotate(${rotation}deg)`,
                zIndex: isCrashing ? 6 : isForward ? 5 : 3,
                animation,
                transition: 'left 0.1s linear, top 0.3s ease',
                color,
            }}
        >
            <div className="relative">
                {isCrashing ? (
                    <AlertTriangle size={20} />
                ) : (
                    <Navigation
                        size={isForward ? 20 : 16}
                        fill={isForward ? color : 'none'}
                        strokeWidth={isForward ? 1.5 : 2}
                        opacity={isForward ? 1 : 0.6}
                    />
                )}
                
                {/* Glow for forward drones */}
                {isForward && !isCrashing && (
                    <div
                        className="absolute inset-0 rounded-full blur-md"
                        style={{ backgroundColor: color, opacity: 0.4, transform: 'scale(1.5)' }}
                    />
                )}

                {/* Crash explosion ring */}
                {isCrashing && (
                    <div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: color, animation: 'status-glow 0.8s ease-out forwards' }}
                    />
                )}
            </div>
        </div>
    )
}

function LegendItem({ icon, color, label }: { icon: React.ReactNode; color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div style={{ color, display: 'flex', alignItems: 'center' }}>
                <div style={{ transform: 'rotate(90deg)' }}>{icon}</div>
            </div>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
                {label}
            </span>
        </div>
    )
}
