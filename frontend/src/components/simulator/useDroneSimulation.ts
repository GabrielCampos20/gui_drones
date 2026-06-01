import { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────
export const LANES        = 4
export const FORWARD_MS   = 3500
export const RETURN_MS    = 3000
export const CRASH_MS     = 900
export const WH_LEFT_PCT  = 12
export const WH_RIGHT_PCT = 88
export const SPAN         = WH_RIGHT_PCT - WH_LEFT_PCT

export const FWD_TOP = 10; export const FWD_BOT = 40
export const RET_TOP = 60; export const RET_BOT = 90

// ─── Types ───────────────────────────────────────────────────────────────────
export type DronePhase = 'forward' | 'return'
export type DroneStatus = 'flying' | 'crashing'
export type ArenaStatus = 'idle' | 'running' | 'done' | 'error'

export interface VisualDroneNode {
  x: number
  y: number
  name: string
}

export interface VisualDrone {
  id: number
  lane: number
  phase: DronePhase
  status: DroneStatus
  progress: number
  duration: number
  lastTick: number
  crashStart: number
  startNode?: VisualDroneNode
  endNode?: VisualDroneNode
}

export const SHARED_NODES_CONFIG = {
  GALPAO_A: { x: 15, y: 25, name: 'GALPÃO A' },
  DESTINO_A: { x: 15, y: 75, name: 'DESTINO A' },
  GALPAO_B: { x: 85, y: 25, name: 'GALPÃO B' },
  DESTINO_B: { x: 85, y: 75, name: 'DESTINO B' },
}

// ─── Sampler Helper ──────────────────────────────────────────────────────────
function calcDivisor(rate: number) { return Math.max(1, Math.round(rate / 5)) }

// ─── UID Helper ──────────────────────────────────────────────────────────────
let _uid = 0
const nextUid = () => _uid++

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useDroneSimulation(executionId: string, simulator: string = 'drone-delivery') {
  const [drones, setDrones] = useState<VisualDrone[]>([])
  const [arenaStatus, setArenaStatus] = useState<ArenaStatus>('idle')
  const [deliveries, setDeliveries] = useState(0)
  const [drops, setDrops] = useState(0)
  const [displayRate, setDisplayRate] = useState(0)
  const [displayDiv, setDisplayDiv] = useState(1)

  // Estados específicos do simulador compartilhado
  const [sharedPhase, setSharedPhase] = useState<1 | 2>(1)
  const [sharedState, setSharedState] = useState<'receiving' | 'migrating'>('receiving')

  const eventCounter = useRef(0)
  const divisor = useRef(1)
  const departsSeen = useRef(0)
  const rateHistory = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const randomCrashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Sampler: taxa de eventos ──────────────────────────────────────────────
  useEffect(() => {
    if (simulator === 'shared-drone-delivery') return
    const t = setInterval(() => {
      const rate = eventCounter.current
      eventCounter.current = 0
      rateHistory.current.push(rate)
      if (rateHistory.current.length > 3) rateHistory.current.shift()
      const avg = Math.round(
        rateHistory.current.reduce((a, b) => a + b, 0) / rateHistory.current.length
      )
      divisor.current = calcDivisor(avg)
      setDisplayRate(avg)
      setDisplayDiv(divisor.current)
    }, 1000)
    return () => clearInterval(t)
  }, [simulator])

  // ─── RAF loop ──────────────────────────────────────────────────────────────
  const tick = useCallback((now: number) => {
    setDrones(prev => {
      if (prev.length === 0) return prev

      let changed = false
      const next: VisualDrone[] = []

      for (const d of prev) {
        const dt = now - d.lastTick

        if (d.status === 'crashing') {
          const crashElapsed = now - d.crashStart
          if (crashElapsed >= CRASH_MS) {
            changed = true
            if (simulator === 'shared-drone-delivery') {
              setDrops(n => n + 1)
            }
            continue
          }
          next.push({ ...d, lastTick: now })
          changed = true
          continue
        }

        const newProg = d.progress + dt / d.duration

        if (newProg >= 1) {
          changed = true
          if (simulator === 'shared-drone-delivery') {
            // Se chegou ao fim do voo
            const isDeliveryForward = d.startNode?.name.startsWith('GALPÃO') && d.endNode?.name.startsWith('DESTINO')
            
            if (isDeliveryForward) {
              // Chegou no Destino: faz retorno ao galpão de origem
              setDeliveries(n => n + 1)
              next.push({
                ...d,
                startNode: d.endNode,
                endNode: d.startNode,
                phase: 'return',
                progress: 0,
                duration: RETURN_MS,
                lastTick: now
              })
            } else {
              // Se for voo de retorno ou migração horizontal, o drone apenas pousa/desaparece no destino
            }
          } else {
            if (d.phase === 'forward') {
              next.push({
                ...d,
                phase: 'return',
                progress: 0,
                duration: RETURN_MS,
                lastTick: now,
              })
            }
          }
        } else {
          next.push({ ...d, progress: newProg, lastTick: now })
          changed = true
        }
      }

      return changed ? next : prev
    })

    rafRef.current = requestAnimationFrame(tick)
  }, [simulator])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [tick])

  // ─── Spawn ─────────────────────────────────────────────────────────────────
  const spawnDroneShared = useCallback((type: 'delivery' | 'migration') => {
    const now = performance.now()
    setDrones(prev => {
      let startNode: VisualDroneNode
      let endNode: VisualDroneNode

      if (type === 'delivery') {
        if (sharedPhase === 1) {
          startNode = SHARED_NODES_CONFIG.GALPAO_A
          endNode = SHARED_NODES_CONFIG.DESTINO_A
        } else {
          startNode = SHARED_NODES_CONFIG.GALPAO_B
          endNode = SHARED_NODES_CONFIG.DESTINO_B
        }
      } else {
        // migration
        if (sharedPhase === 1) {
          startNode = SHARED_NODES_CONFIG.GALPAO_A
          endNode = SHARED_NODES_CONFIG.GALPAO_B
        } else {
          startNode = SHARED_NODES_CONFIG.GALPAO_B
          endNode = SHARED_NODES_CONFIG.GALPAO_A
        }
      }

      const newDrone: VisualDrone = {
        id: nextUid(),
        lane: Math.floor(Math.random() * LANES),
        phase: 'forward',
        status: 'flying',
        progress: 0,
        duration: type === 'migration' ? 4000 : 2500 + Math.random() * 1000,
        lastTick: now,
        crashStart: 0,
        startNode,
        endNode,
      }
      return [...prev, newDrone]
    })
  }, [sharedPhase])

  const spawnDrone = useCallback(() => {
    const now = performance.now()
    setDrones(prev => {
      const usedLanes = new Set(
        prev.filter(d => d.phase === 'forward' && d.status === 'flying').map(d => d.lane)
      )
      let lane = -1
      for (let i = 0; i < LANES; i++) {
        if (!usedLanes.has(i)) { lane = i; break }
      }
      if (lane === -1) return prev

      const newDrone: VisualDrone = {
        id: nextUid(),
        lane,
        phase: 'forward',
        status: 'flying',
        progress: 0,
        duration: FORWARD_MS,
        lastTick: now,
        crashStart: 0,
      }
      return [...prev, newDrone]
    })
  }, [])

  // ─── Crash ─────────────────────────────────────────────────────────────────
  const crashDrone = useCallback(() => {
    const now = performance.now()
    setDrones(prev => {
      const candidates = prev
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.status === 'flying')
      if (candidates.length === 0) return prev
      const { i } = candidates[Math.floor(Math.random() * candidates.length)]
      const next = [...prev]
      next[i] = { ...next[i], status: 'crashing', crashStart: now, lastTick: now }
      return next
    })
  }, [])

  // ─── Ciclo de fases do simulador compartilhado ─────────────────────────────
  useEffect(() => {
    if (simulator !== 'shared-drone-delivery' || arenaStatus !== 'running') return

    const interval = setInterval(() => {
      setSharedState(curr => {
        if (curr === 'receiving') {
          return 'migrating'
        } else {
          setSharedPhase(p => p === 1 ? 2 : 1)
          return 'receiving'
        }
      })
    }, 10000) // Troca o modo a cada 10 segundos

    return () => clearInterval(interval)
  }, [simulator, arenaStatus])

  // ─── Auto-spawner do simulador compartilhado ───────────────────────────────
  useEffect(() => {
    if (simulator !== 'shared-drone-delivery' || arenaStatus !== 'running') return

    // Spawna entregas normais continuamente
    const deliveryInterval = setInterval(() => {
      setDrones(prev => {
        const deliveriesCount = prev.filter(d => d.endNode?.name.startsWith('DESTINO')).length
        if (deliveriesCount < 4) {
          setTimeout(() => spawnDroneShared('delivery'), 0)
        }
        return prev
      })
    }, 1200)

    // Spawna migrações se o estado for 'migrating'
    const migrationInterval = setInterval(() => {
      if (sharedState === 'migrating') {
        setDrones(prev => {
          const migrationCount = prev.filter(d => d.endNode?.name.startsWith('GALPÃO') && d.startNode?.name.startsWith('GALPÃO')).length
          if (migrationCount < 3) {
            setTimeout(() => spawnDroneShared('migration'), Math.random() * 500)
          }
          return prev
        })
      }
    }, 2000)

    return () => {
      clearInterval(deliveryInterval)
      clearInterval(migrationInterval)
    }
  }, [simulator, arenaStatus, sharedState, spawnDroneShared])

  // ─── Crashes visuais aleatórios (apenas simulador básico) ───────────────────
  useEffect(() => {
    if (arenaStatus !== 'running' || simulator === 'shared-drone-delivery') {
      if (randomCrashTimerRef.current !== null) {
        clearTimeout(randomCrashTimerRef.current)
        randomCrashTimerRef.current = null
      }
      return
    }

    function scheduleRandomCrash() {
      const delay = 3000 + Math.random() * 4000
      randomCrashTimerRef.current = setTimeout(() => {
        crashDrone()
        scheduleRandomCrash()
      }, delay)
    }

    scheduleRandomCrash()
    return () => {
      if (randomCrashTimerRef.current !== null) {
        clearTimeout(randomCrashTimerRef.current)
        randomCrashTimerRef.current = null
      }
    }
  }, [arenaStatus, simulator, crashDrone])

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setDrones([])
    setDeliveries(0)
    setDrops(0)
    setDisplayRate(0)
    setDisplayDiv(1)
    setSharedPhase(1)
    setSharedState('receiving')
    divisor.current = 1
    departsSeen.current = 0
    eventCounter.current = 0
    rateHistory.current = []
    if (randomCrashTimerRef.current !== null) {
      clearTimeout(randomCrashTimerRef.current)
      randomCrashTimerRef.current = null
    }
  }, [])

  // ─── SSE Stream Connection ─────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()

      ; (async () => {
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
                      if (simulator !== 'shared-drone-delivery') {
                        setArenaStatus(s => s === 'idle' ? 'running' : s)
                        eventCounter.current++
                        departsSeen.current++
                        if (departsSeen.current % divisor.current === 0) spawnDrone()
                      }
                      break
                    case 'drone_arrive':
                      if (simulator !== 'shared-drone-delivery') {
                        setArenaStatus(s => s === 'idle' ? 'running' : s)
                        setDeliveries(n => n + 1)
                      }
                      break
                    case 'package_drop':
                      if (simulator !== 'shared-drone-delivery') {
                        setArenaStatus(s => s === 'idle' ? 'running' : s)
                        setDrops(n => n + 1)
                      }
                      break
                    case 'simulation_end':
                      setArenaStatus('done')
                      reader.cancel()
                      return
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
  }, [executionId, simulator, spawnDrone, resetState])

  return {
    drones,
    arenaStatus,
    deliveries,
    drops,
    displayRate,
    displayDiv,
    sharedPhase,
    sharedState,
  }
}
