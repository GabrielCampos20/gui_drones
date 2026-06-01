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
export type SharedDroneType = 'delivery' | 'return' | 'migration'

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
  sharedType?: SharedDroneType
}

export const SHARED_NODES_CONFIG = {
  // Posição visual dos ícones (galpões no topo, destinos na parte inferior)
  GALPAO_A:  { x: 15, y: 12, name: 'GALPÃO A' },
  DESTINO_A: { x: 15, y: 88, name: 'DESTINO A' },
  GALPAO_B:  { x: 85, y: 12, name: 'GALPÃO B' },
  DESTINO_B: { x: 85, y: 88, name: 'DESTINO B' },
}

// Rotas de voo com offset para evitar sobreposição visual
// Ida (com pacote): ligeiramente à esquerda do eixo do galpão
// Volta (sem pacote): ligeiramente à direita do eixo do galpão
export const SHARED_ROUTES = {
  // Sistema A (Galpão→Destino): X=12 descendo, X=18 subindo
  A_DELIVERY_START: { x: 12, y: 12, name: 'GALPÃO A' },
  A_DELIVERY_END:   { x: 12, y: 88, name: 'DESTINO A' },
  A_RETURN_START:   { x: 18, y: 88, name: 'DESTINO A' },
  A_RETURN_END:     { x: 18, y: 12, name: 'GALPÃO A' },
  // Sistema B (Galpão→Destino): X=82 descendo, X=88 subindo
  B_DELIVERY_START: { x: 88, y: 12, name: 'GALPÃO B' },
  B_DELIVERY_END:   { x: 88, y: 88, name: 'DESTINO B' },
  B_RETURN_START:   { x: 82, y: 88, name: 'DESTINO B' },
  B_RETURN_END:     { x: 82, y: 12, name: 'GALPÃO B' },
  // Migração horizontal (entre galpões, próximo ao topo)
  MIG_A_TO_B_START: { x: 15, y: 12, name: 'GALPÃO A' },
  MIG_A_TO_B_END:   { x: 85, y: 12, name: 'GALPÃO B' },
  MIG_B_TO_A_START: { x: 85, y: 12, name: 'GALPÃO B' },
  MIG_B_TO_A_END:   { x: 15, y: 12, name: 'GALPÃO A' },
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

  // Estados reais da lógica de compartilhamento
  const [sharedPhase, setSharedPhase] = useState<1 | 2>(1) // 1 = Demanda em A, 2 = Demanda em B
  const [dronesInA, setDronesInA] = useState(20)
  const [dronesInB, setDronesInB] = useState(20)
  const [queueA, setQueueA] = useState(0)
  const [queueB, setQueueB] = useState(0)

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
            if (d.sharedType === 'delivery') {
              // Chegou no Destino: inicia retorno pela pista oposta (sem sobreposição)
              setDeliveries(n => n + 1)
              const isSystemA = d.endNode?.name === 'DESTINO A'
              next.push({
                ...d,
                startNode: isSystemA ? SHARED_ROUTES.A_RETURN_START : SHARED_ROUTES.B_RETURN_START,
                endNode:   isSystemA ? SHARED_ROUTES.A_RETURN_END   : SHARED_ROUTES.B_RETURN_END,
                sharedType: 'return',
                phase: 'return',
                progress: 0,
                duration: RETURN_MS,
                lastTick: now
              })
            } else if (d.sharedType === 'migration') {
              // Drone migrado chegou no galpão destino
              if (d.endNode?.name === 'GALPÃO A') {
                setDronesInA(n => n + 1)
              } else {
                setDronesInB(n => n + 1)
              }
              // O drone some da rota de voo horizontal e entra no pool de drones do galpão
            } else {
              // Retornou ao galpão de origem: pousa e entra no pool ocioso
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

  // ─── Alternância de Demanda (Fases a cada 18s para simulação fluida) ──────────
  useEffect(() => {
    if (simulator !== 'shared-drone-delivery' || arenaStatus !== 'running') return

    const phaseTimer = setInterval(() => {
      setSharedPhase(curr => {
        const nextPhase = curr === 1 ? 2 : 1
        // Ao trocar de fase: zera fila do galpão que ficou ocioso
        // e injeta uma rajada de demanda no novo galpão ativo
        // (simula o acúmulo de pedidos durante o período ocioso)
        if (nextPhase === 1) {
          setQueueB(0)
          setQueueA(18) // rajada de demanda — fila começa cheia ao assumir
        } else {
          setQueueA(0)
          setQueueB(18)
        }
        return nextPhase
      })
    }, 18000)

    return () => clearInterval(phaseTimer)
  }, [simulator, arenaStatus])

  // ─── Gerador de Pedidos na Fila ─────────────────────────────────────────────
  useEffect(() => {
    if (simulator !== 'shared-drone-delivery' || arenaStatus !== 'running') return

    const queueTimer = setInterval(() => {
      if (sharedPhase === 1) {
        setQueueA(q => Math.min(q + Math.floor(Math.random() * 3) + 1, 35))
      } else {
        setQueueB(q => Math.min(q + Math.floor(Math.random() * 3) + 1, 35))
      }
    }, 1200)

    return () => clearInterval(queueTimer)
  }, [simulator, arenaStatus, sharedPhase])

  // ─── Despachador de Drones (Lógica de Voo e Migração) ──────────────────────
  useEffect(() => {
    if (simulator !== 'shared-drone-delivery' || arenaStatus !== 'running') return

    const dispatchTimer = setInterval(() => { // 800ms: mais lento para deixar a fila acumular e migração ocorrer
      const now = performance.now()

      setDrones(prev => {
        // Conta voos verticais ativos em cada lado
        const activeA = prev.filter(d => 
          d.sharedType !== 'migration' && 
          (d.startNode?.name.includes('A') || d.endNode?.name.includes('A'))
        ).length

        const activeB = prev.filter(d => 
          d.sharedType !== 'migration' && 
          (d.startNode?.name.includes('B') || d.endNode?.name.includes('B'))
        ).length

        // Conta migrações ativas
        const migratingBtoA = prev.some(d => d.sharedType === 'migration' && d.endNode?.name === 'GALPÃO A')
        const migratingAtoB = prev.some(d => d.sharedType === 'migration' && d.endNode?.name === 'GALPÃO B')

        const nextDrones = [...prev]

        if (sharedPhase === 1) {
          // ─── SISTEMA A (Ativo) ───
          // Despacha drone de entrega se tiver demanda na fila e drones físicos ociosos no galpão
          const idleDronesA = dronesInA - activeA
          if (queueA > 0 && idleDronesA > 0 && activeA < 12) {
            setQueueA(q => Math.max(0, q - 1))
            nextDrones.push({
              id: nextUid(),
              lane: Math.floor(Math.random() * LANES),
              phase: 'forward',
              status: 'flying',
              progress: 0,
              duration: 2500 + Math.random() * 1000,
              lastTick: now,
              crashStart: 0,
              startNode: SHARED_ROUTES.A_DELIVERY_START,
              endNode: SHARED_ROUTES.A_DELIVERY_END,
              sharedType: 'delivery',
            })
          }

          // ─── MIGRAÇÃO B -> A ───
          // Regra: fila > 5 AND galpão B tem excedente (> 5 drones) AND um drone por vez
          if (queueA > 5 && dronesInB > 5 && !migratingBtoA) {
            setDronesInB(n => n - 1)
            nextDrones.push({
              id: nextUid(),
              lane: Math.floor(Math.random() * LANES),
              phase: 'forward',
              status: 'flying',
              progress: 0,
              duration: 3500, // 2.5 min de viagem escalonados
              lastTick: now,
              crashStart: 0,
              startNode: SHARED_ROUTES.MIG_B_TO_A_START,
              endNode: SHARED_ROUTES.MIG_B_TO_A_END,
              sharedType: 'migration',
            })
          }
        } else {
          // ─── SISTEMA B (Ativo) ───
          const idleDronesB = dronesInB - activeB
          if (queueB > 0 && idleDronesB > 0 && activeB < 12) {
            setQueueB(q => Math.max(0, q - 1))
            nextDrones.push({
              id: nextUid(),
              lane: Math.floor(Math.random() * LANES),
              phase: 'forward',
              status: 'flying',
              progress: 0,
              duration: 2500 + Math.random() * 1000,
              lastTick: now,
              crashStart: 0,
              startNode: SHARED_ROUTES.B_DELIVERY_START,
              endNode: SHARED_ROUTES.B_DELIVERY_END,
              sharedType: 'delivery',
            })
          }

          // ─── MIGRAÇÃO A -> B ───
          if (queueB > 5 && dronesInA > 5 && !migratingAtoB) {
            setDronesInA(n => n - 1)
            nextDrones.push({
              id: nextUid(),
              lane: Math.floor(Math.random() * LANES),
              phase: 'forward',
              status: 'flying',
              progress: 0,
              duration: 3500,
              lastTick: now,
              crashStart: 0,
              startNode: SHARED_ROUTES.MIG_A_TO_B_START,
              endNode: SHARED_ROUTES.MIG_A_TO_B_END,
              sharedType: 'migration',
            })
          }
        }

        return nextDrones
      })
    }, 800)

    return () => clearInterval(dispatchTimer)
  }, [simulator, arenaStatus, sharedPhase, dronesInA, dronesInB, queueA, queueB])

  // ─── Spawn do simulador básico ──────────────────────────────────────────────
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

  // ─── Crash (apenas simulador básico) ────────────────────────────────────────
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
    setDronesInA(20)
    setDronesInB(20)
    setQueueA(18) // demanda inicial em A visível desde o início
    setQueueB(0)
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
    dronesInA,
    dronesInB,
    queueA,
    queueB,
  }
}
