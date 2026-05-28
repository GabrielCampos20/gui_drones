import { useEffect, useRef, useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
export type DronePhase  = 'forward' | 'return'
export type DroneStatus = 'flying'  | 'crashing'
export type ArenaStatus = 'idle'    | 'running' | 'done' | 'error'

export interface VisualDrone {
  id:           number
  lane:         number
  phase:        DronePhase
  status:       DroneStatus
  progress:     number
  duration:     number
  lastTick:     number
  crashStart:   number
}

// ─── Sampler Helper ──────────────────────────────────────────────────────────
function calcDivisor(rate: number) { return Math.max(1, Math.round(rate / 5)) }

// ─── UID Helper ──────────────────────────────────────────────────────────────
let _uid = 0
const nextUid = () => _uid++

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useDroneSimulation(executionId: string) {
  const [drones,      setDrones]      = useState<VisualDrone[]>([])
  const [arenaStatus, setArenaStatus] = useState<ArenaStatus>('idle')
  const [deliveries,  setDeliveries]  = useState(0)
  const [drops,       setDrops]       = useState(0)
  const [displayRate, setDisplayRate] = useState(0)
  const [displayDiv,  setDisplayDiv]  = useState(1)

  const eventCounter = useRef(0)
  const divisor      = useRef(1)
  const departsSeen  = useRef(0)
  const rateHistory  = useRef<number[]>([])
  const rafRef       = useRef<number | null>(null)

  // ─── Sampler: taxa de eventos ──────────────────────────────────────────────
  useEffect(() => {
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
  }, [])

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
            continue
          }
          next.push({ ...d, lastTick: now })
          changed = true
          continue
        }

        const newProg = d.progress + dt / d.duration

        if (newProg >= 1) {
          changed = true
          if (d.phase === 'forward') {
            next.push({
              ...d,
              phase:    'return',
              progress: 0,
              duration: RETURN_MS,
              lastTick: now,
            })
          }
        } else {
          next.push({ ...d, progress: newProg, lastTick: now })
          changed = true
        }
      }

      return changed ? next : prev
    })

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [tick])

  // ─── Spawn ─────────────────────────────────────────────────────────────────
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
        id:         nextUid(),
        lane,
        phase:      'forward',
        status:     'flying',
        progress:   0,
        duration:   FORWARD_MS,
        lastTick:   now,
        crashStart: 0,
      }
      return [...prev, newDrone]
    })
  }, [])

  // ─── Crash ─────────────────────────────────────────────────────────────────
  const crashDrone = useCallback(() => {
    const now = performance.now()
    setDrones(prev => {
      const idx = prev.findIndex(d => d.status === 'flying' && d.phase === 'forward')
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], status: 'crashing', crashStart: now, lastTick: now }
      return next
    })
  }, [])

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setDrones([])
    setDeliveries(0)
    setDrops(0)
    setDisplayRate(0)
    setDisplayDiv(1)
    divisor.current     = 1
    departsSeen.current = 0
    eventCounter.current = 0
    rateHistory.current  = []
  }, [])

  // ─── SSE Stream Connection ─────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/execucoes/stream`, { signal: ctrl.signal })
        if (!res.ok || !res.body) { setArenaStatus('error'); return }

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let   buf     = ''

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
  }, [executionId, spawnDrone, crashDrone, resetState])

  return {
    drones,
    arenaStatus,
    deliveries,
    drops,
    displayRate,
    displayDiv,
  }
}
