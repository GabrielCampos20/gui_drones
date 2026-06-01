import DroneIcon from './DroneIcon'
import {
  WH_LEFT_PCT,
  WH_RIGHT_PCT,
  SPAN,
  FWD_TOP,
  FWD_BOT,
  RET_TOP,
  RET_BOT,
  LANES,
  CRASH_MS
} from './useDroneSimulation'
import type { VisualDrone } from './useDroneSimulation'

interface DroneTokenProps {
  drone: VisualDrone
}

export default function DroneToken({ drone }: DroneTokenProps) {
  const isForward  = drone.phase === 'forward'
  const isCrashing = drone.status === 'crashing'

  // Posição horizontal e vertical baseada no progress de voo
  const prog    = Math.min(drone.progress, 1)
  
  let leftPct = 0
  let topPct = 0
  let rotation = 0

  if (drone.startNode && drone.endNode) {
    // Shared Drone Sim: Interpolação linear entre nós 2D
    leftPct = drone.startNode.x + prog * (drone.endNode.x - drone.startNode.x)
    topPct = drone.startNode.y + prog * (drone.endNode.y - drone.startNode.y)
    
    if (isCrashing) {
      const crashProg = drone.crashStart > 0
        ? Math.min((performance.now() - drone.crashStart) / CRASH_MS, 1)
        : 0
      rotation = crashProg * 360
    } else {
      const dx = drone.endNode.x - drone.startNode.x
      const dy = drone.endNode.y - drone.startNode.y
      rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    }
  } else {
    // Basic Drone Sim
    leftPct = isForward
      ? WH_LEFT_PCT  + prog * SPAN
      : WH_RIGHT_PCT - prog * SPAN

    // Posição vertical — pista dentro da faixa da rota
    const [rowTop, rowBot] = isForward ? [FWD_TOP, FWD_BOT] : [RET_TOP, RET_BOT]
    topPct = rowTop + (drone.lane / Math.max(LANES - 1, 1)) * (rowBot - rowTop)
    
    const crashProg = isCrashing && drone.crashStart > 0
      ? Math.min((performance.now() - drone.crashStart) / CRASH_MS, 1)
      : 0
    rotation = isCrashing ? crashProg * 360 : isForward ? 90 : -90
  }

  // Crash: queda vertical proporcional ao tempo de crash
  const crashProg = isCrashing && drone.crashStart > 0
    ? Math.min((performance.now() - drone.crashStart) / CRASH_MS, 1)
    : 0

  const crashFall = crashProg * 60
  const bobbing   = !isCrashing ? Math.sin(prog * Math.PI * 7) * 2.5 : 0

  const color    = isCrashing ? 'var(--color-error)' : isForward ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)'
  const opacity  = isForward ? 1 : 0.5

  return (
    <div className="absolute flex flex-col items-center pointer-events-none"
      style={{
        left:      `${leftPct}%`,
        top:       `${topPct}%`,
        transform: `translate(-50%, calc(-50% + ${bobbing + crashFall}px)) rotate(${rotation}deg)`,
        color,
        opacity,
        zIndex: isCrashing ? 6 : isForward ? 5 : 3,
      }}>
      <div className="relative">
        <DroneIcon phase={(drone.sharedType ? drone.sharedType === 'delivery' : isForward) ? 'forward' : 'return'} status={drone.status} />

        {isCrashing && (
          <div className="absolute -inset-1 rounded-full border border-dashed border-red-500/50 animate-ping" />
        )}
      </div>
    </div>
  )
}
