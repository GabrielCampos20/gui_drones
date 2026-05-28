/**
 * DroneArena — Visualização em tempo real com Adaptive Sampling.
 *
 * O progress de cada drone é armazenado no estado e atualizado pelo
 * loop RAF a cada frame — garantindo movimento suave e contínuo.
 *
 * Sampler: divisor = max(1, round(rate / 5))
 * Ex: 691/s → divisor=138 → exibe ~5 drones/s
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, AlertTriangle, Package, Warehouse } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// ─── Constants ────────────────────────────────────────────────────────────────
const LANES        = 5
const FORWARD_MS   = 3500
const RETURN_MS    = 3000
const CRASH_MS     = 900
const WH_LEFT_PCT  = 12
const WH_RIGHT_PCT = 88
const SPAN         = WH_RIGHT_PCT - WH_LEFT_PCT

const FWD_TOP = 18; const FWD_BOT = 44
const RET_TOP = 56; const RET_BOT = 82

// ─── Types ───────────────────────────────────────────────────────────────────
type DronePhase  = 'forward' | 'return'
type DroneStatus = 'flying'  | 'crashing'
type ArenaStatus = 'idle'    | 'running' | 'done' | 'error'

interface VisualDrone {
  id:            number
  lane:          number
  phase:         DronePhase
  status:        DroneStatus
  progress:      number   // 0..1 — atualizado pelo RAF
  lastTick:      number   // performance.now() do último frame
  duration:      number   // ms da fase atual
  crashProgress: number   // 0..1 durante crash
  crashTick:     number   // performance.now() quando o crash iniciou
}

// ─── Sampler ─────────────────────────────────────────────────────────────────
function calcDivisor(rate: number) { return Math.max(1, Math.round(rate / 5)) }

// ─── UID ─────────────────────────────────────────────────────────────────────
let _uid = 0
function uid() { return _uid++ }

// ─── Component ────────────────────────────────────────────────────────────────
interface DroneArenaProps { executionId: string }

export default function DroneArena({ executionId }: DroneArenaProps) {
  const [drones,      setDrones]      = useState<VisualDrone[]>([])
  const [arenaStatus, setArenaStatus] = useState<ArenaStatus>('idle')
  const [deliveries,  setDeliveries]  = useState(0)
  const [drops,       setDrops]       = useState(0)
  const [displayRate, setDisplayRate] = useState(0)
  const [displayDiv,  setDisplayDiv]  = useState(1)

  const eventCounter  = useRef(0)
  const divisor       = useRef(1)
  const departsSeen   = useRef(0)
  const rateHistory   = useRef<number[]>([])
  const rafRef        = useRef<number | null>(null)
  const abortRef      = useRef<AbortController | null>(null)

  // ─── Sampler tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const rate = eventCounter.current
      eventCounter.current = 0
      rateHistory.current.push(rate)
      if (rateHistory.current.length > 3) rateHistory.current.shift()
      const avg = Math.round(rateHistory.current.reduce((a, b) => a + b, 0) / rateHistory.current.length)
      const d = calcDivisor(avg)
      divisor.current = d
      setDisplayRate(avg)
      setDisplayDiv(d)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // ─── RAF — progress stored in state ────────────────────────────────────────
  const tick = useCallback((now: number) => {
    setDrones(prev => {
      if (prev.length === 0) { rafRef.current = requestAnimationFrame(tick); return prev }
      let changed = false
      const next: VisualDrone[] = []

      for (const d of prev) {
        if (d.status === 'crashing') {
          const cp = Math.min((now - d.crashTick) / CRASH_MS, 1)
          if (cp < 1) {
            next.push({ ...d, crashProgress: cp, lastTick: now })
            changed = true
          } else {
            changed = true // despawn
          }
          continue
        }

        const dt = now - d.lastTick
        const newProg = d.progress + dt / d.duration

        if (newProg >= 1) {
          changed = true
          if (d.phase === 'forward') {
            next.push({ ...d, phase: 'return', progress: 0, lastTick: now, duration: RETURN_MS })
          }
          // return complete → despawn (don't push)
        } else {
          next.push({ ...d, progress: newProg, lastTick: now })
          changed = true
        }
      }

      rafRef.current = requestAnimationFrame(tick)
      return changed ? next : prev
    })
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [tick])

  // ─── Spawn ────────────────────────────────────────────────────────────────
  const spawnDrone = useCallback(() => {
    const now = performance.now()
    setDrones(prev => {
      const used = new Set(
        prev.filter(d => d.phase === 'forward' && d.status === 'flying').map(d => d.lane)
      )
      let lane = -1
      for (let i = 0; i < LANES; i++) { if (!used.has(i)) { lane = i; break } }
      if (lane === -1) return prev
      return [...prev, {
        id: uid(), lane,
        phase: 'forward', status: 'flying',
        progress: 0, lastTick: now, duration: FORWARD_MS,
        crashProgress: 0, crashTick: 0,
      }]
    })
  }, [])

  // ─── Crash ────────────────────────────────────────────────────────────────
  const crashDrone = useCallback(() => {
    const now = performance.now()
    setDrones(prev => {
      const idx = prev.findIndex(d => d.status === 'flying' && d.phase === 'forward')
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], status: 'crashing', crashProgress: 0, crashTick: now }
      return next
    })
  }, [])

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setDrones([])
    setDeliveries(0); setDrops(0); setDisplayRate(0); setDisplayDiv(1)
    divisor.current = 1; departsSeen.current = 0
    eventCounter.current = 0; rateHistory.current = []
  }, [])

  // ─── SSE ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/execucoes/stream`, { signal: ctrl.signal })
        if (!res.ok || !res.body) { setArenaStatus('error'); return }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const frames = buf.split('\n\n')
          buf = frames.pop() ?? ''

          for (const frame of frames) {
            for (const raw of frame.split('\n')) {
              if (!raw.startsWith('data:')) continue
              try {
                const evt = JSON.parse(raw.slice(5).trim())
                switch (evt.type) {
                  case 'connected':
                    setTimeout(() => setArenaStatus(s => s === 'idle' ? 'running' : s), 300)
                    break
                  case 'idle':
                    setArenaStatus('idle')
                    break
                  case 'simulation_start':
                    resetState()
                    setArenaStatus('running')
                    break
                  case 'drone_depart':
                    setArenaStatus(s => s === 'idle' ? 'running' : s)
                    eventCounter.current++
                    departsSeen.current++
                    if (departsSeen.current % divisor.current === 0) spawnDrone()
                    break
                  case 'drone_arrive':
                    setArenaStatus(s => s === 'idle' ? 'running' : s)
                    setDeliveries(n => n + 1)
                    break
                  case 'package_drop':
                    setArenaStatus(s => s === 'idle' ? 'running' : s)
                    setDrops(n => n + 1)
                    crashDrone()
                    break
                  case 'simulation_end':
                    setArenaStatus('done')
                    reader.cancel(); return
                }
              } catch { /* ignore */ }
            }
          }
        }
        setArenaStatus('done')
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') setArenaStatus('error')
      }
    })()

    return () => ctrl.abort()
  }, [executionId, spawnDrone, crashDrone, resetState])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-xl border overflow-hidden mb-6"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      <StatusBar arenaStatus={arenaStatus} displayDiv={displayDiv} />

      <div className="relative w-full select-none" style={{ height: 300, backgroundColor: '#0d1117' }}>
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.03,
          backgroundImage: 'linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Divider */}
        <div className="absolute left-0 right-0" style={{ top: '50%', height: 1, backgroundColor: 'var(--color-border)', opacity: 0.3 }} />

        <RouteLabel top="29%" label="COM PACOTE →" />
        <RouteLabel top="71%" label="← RETORNO" />

        <WarehouseNode side="left"  active={arenaStatus === 'running'} />
        <WarehouseNode side="right" active={arenaStatus === 'running'} />

        {drones.map(d => <DroneToken key={d.id} drone={d} />)}

        {arenaStatus === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none">
            <div className="px-6 py-3 rounded-lg border" style={{ borderColor: 'var(--color-success)', backgroundColor: 'rgba(34,197,94,0.1)' }}>
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--color-success)' }}>
                Simulação Finalizada
              </span>
            </div>
          </div>
        )}
      </div>

      <MetricsBar deliveries={deliveries} drops={drops} rate={displayRate} divisor={displayDiv} arenaStatus={arenaStatus} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBar({ arenaStatus, displayDiv }: { arenaStatus: ArenaStatus; displayDiv: number }) {
  const label = arenaStatus === 'running' ? 'Monitoramento em Tempo Real'
    : arenaStatus === 'done'  ? 'Operação Concluída'
    : arenaStatus === 'error' ? 'Falha de Telemetria'
    : 'Aguardando Simulação'
  const dotColor = arenaStatus === 'running' ? 'var(--color-cyan-primary)'
    : arenaStatus === 'done'  ? 'var(--color-success)'
    : arenaStatus === 'error' ? 'var(--color-error)'
    : 'var(--color-text-muted)'
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b"
      style={{ backgroundColor: '#11151c', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{
          backgroundColor: dotColor,
          animation: arenaStatus === 'running' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
        }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      {arenaStatus === 'running' && displayDiv > 1 && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
          amostragem 1:{displayDiv}
        </span>
      )}
    </div>
  )
}

function RouteLabel({ top, label }: { top: string; label: string }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top, zIndex: 2 }}>
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded"
        style={{ color: 'var(--color-text-muted)', backgroundColor: 'rgba(13,17,23,0.7)', border: '1px solid var(--color-border)' }}>
        {label}
      </span>
    </div>
  )
}

function WarehouseNode({ side, active }: { side: 'left' | 'right'; active: boolean }) {
  const isLeft = side === 'left'
  return (
    <div className="absolute top-0 bottom-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
      style={{ [isLeft ? 'left' : 'right']: 0, width: `${WH_LEFT_PCT}%`, zIndex: 4 }}>
      <div className="relative flex items-center justify-center rounded-xl" style={{
        width: 52, height: 52,
        backgroundColor: 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-cyan-deep)' : 'var(--color-border)'}`,
        boxShadow: active ? '0 0 18px 2px rgba(14,165,233,0.12)' : 'none',
        transition: 'all 0.5s ease',
      }}>
        <Warehouse size={20} style={{ color: active ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)' }} />
        {active && <div className="absolute inset-0 rounded-xl border border-cyan-500/20"
          style={{ animation: 'node-breathe 2.5s ease-out infinite' }} />}
      </div>
      <span className="text-[8px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 rounded"
        style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {isLeft ? 'GALPÃO A' : 'GALPÃO B'}
      </span>
    </div>
  )
}

function DroneToken({ drone }: { drone: VisualDrone }) {
  const isForward  = drone.phase === 'forward'
  const isCrashing = drone.status === 'crashing'

  // Progress: crash uses crashProgress, flight uses progress
  const raw = isCrashing ? drone.crashProgress : drone.progress

  // Horizontal — use flight progress (not crash) for x position
  const flightRaw = drone.progress
  const leftPct = isForward
    ? WH_LEFT_PCT  + flightRaw * SPAN
    : WH_RIGHT_PCT - flightRaw * SPAN

  // Vertical
  const [top, bot] = isForward ? [FWD_TOP, FWD_BOT] : [RET_TOP, RET_BOT]
  const topPct = top + (drone.lane / Math.max(LANES - 1, 1)) * (bot - top)

  const bobbing   = !isCrashing ? Math.sin(flightRaw * Math.PI * 7) * 2.5 : 0
  const crashFall = isCrashing  ? raw * 60 : 0

  const color    = isCrashing ? 'var(--color-error)' : isForward ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)'
  const rotation = isCrashing ? raw * 360 : isForward ? 90 : -90
  const opacity  = isForward ? 1 : 0.45

  return (
    <div className="absolute flex flex-col items-center" style={{
      left:      `${leftPct}%`,
      top:       `${topPct}%`,
      transform: `translate(-50%, calc(-50% + ${bobbing + crashFall}px)) rotate(${rotation}deg)`,
      color, opacity,
      zIndex:    isCrashing ? 6 : isForward ? 5 : 3,
      pointerEvents: 'none',
    }}>
      <div className="relative">
        {isCrashing
          ? <AlertTriangle size={18} />
          : <Navigation size={isForward ? 18 : 14} fill={isForward ? color : 'none'} strokeWidth={isForward ? 1.5 : 2} />
        }
        {isForward && !isCrashing && (
          <div className="absolute inset-0 rounded-full blur-md"
            style={{ backgroundColor: color, opacity: 0.3, transform: 'scale(1.6)' }} />
        )}
        {isCrashing && (
          <div className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: color, animation: 'status-glow 0.8s ease-out forwards' }} />
        )}
      </div>
      {isForward && !isCrashing && (
        <Package size={8} style={{ marginTop: 2, color: 'var(--color-cyan-light)', opacity: 0.85 }} />
      )}
    </div>
  )
}

function MetricsBar({ deliveries, drops, rate, divisor, arenaStatus }: {
  deliveries: number; drops: number; rate: number; divisor: number; arenaStatus: ArenaStatus
}) {
  return (
    <div className="flex items-center justify-around px-6 py-3 border-t"
      style={{ backgroundColor: '#11151c', borderColor: 'var(--color-border)' }}>
      <Metric label="Entregas" value={deliveries.toLocaleString('pt-BR')} color="var(--color-success)"      icon="📦" />
      <Metric label="Quedas"   value={drops.toLocaleString('pt-BR')}      color="var(--color-error)"        icon="💥" />
      {arenaStatus === 'running' && (
        <Metric label="Taxa"    value={`~${rate}/s`}                       color="var(--color-cyan-primary)" icon="⚡" />
      )}
      {arenaStatus === 'running' && divisor > 1 && (
        <Metric label="Exibindo" value={`1:${divisor}`}                   color="var(--color-text-muted)"   icon="🎯" />
      )}
    </div>
  )
}

function Metric({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
        {icon} {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
