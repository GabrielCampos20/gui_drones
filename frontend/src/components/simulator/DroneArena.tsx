import { Warehouse, MapPin } from 'lucide-react'
import useDroneSimulation from './useDroneSimulation'
import type { ArenaStatus } from './useDroneSimulation'
import DroneToken from './DroneToken'
import './DroneArena.css'

interface DroneArenaProps {
  executionId: string
  simulator?: string
}

export default function DroneArena({ executionId, simulator = 'drone-delivery' }: DroneArenaProps) {
  const {
    drones,
    arenaStatus,
    displayDiv,
    sharedPhase,
    dronesInA,
    dronesInB,
    queueA,
    queueB,
  } = useDroneSimulation(executionId, simulator)

  const isShared = simulator === 'shared-drone-delivery'

  return (
    <div className="w-full rounded-xl border overflow-hidden mb-6"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      <StatusBar
        arenaStatus={arenaStatus}
        displayDiv={displayDiv}
        sharedPhase={isShared ? sharedPhase : undefined}
      />
      
      <div className="relative w-full select-none" style={{ height: 400, backgroundColor: '#0d1117' }}>
        {/* Grade de fundo */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.03,
          backgroundImage:
            'linear-gradient(to right,#fff 1px,transparent 1px),' +
            'linear-gradient(to bottom,#fff 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {isShared ? (
          <>
            {/* Linhas das rotas de voo da simulação compartilhada */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {/* Sistema A: Ida (esquerda) e Volta (direita) — pistas separadas */}
              <line x1="12%" y1="12%" x2="12%" y2="88%" stroke="rgba(0, 194, 255, 0.2)" strokeDasharray="5,5" strokeWidth="1.5" />
              <line x1="18%" y1="88%" x2="18%" y2="12%" stroke="rgba(0, 194, 255, 0.08)" strokeDasharray="5,5" strokeWidth="1.5" />
              {/* Sistema B: Ida (direita) e Volta (esquerda) — pistas separadas */}
              <line x1="88%" y1="12%" x2="88%" y2="88%" stroke="rgba(0, 194, 255, 0.2)" strokeDasharray="5,5" strokeWidth="1.5" />
              <line x1="82%" y1="88%" x2="82%" y2="12%" stroke="rgba(0, 194, 255, 0.08)" strokeDasharray="5,5" strokeWidth="1.5" />
              {/* Caminho de Migração: Horizontal Superior */}
              <line x1="15%" y1="12%" x2="85%" y2="12%" stroke="rgba(245, 158, 11, 0.15)" strokeDasharray="5,5" strokeWidth="1.5" />
            </svg>

            {/* Galpões com contadores em tempo real */}
            <WarehouseNode
              name="GALPÃO A"
              x={15}
              y={12}
              active={arenaStatus === 'running' && sharedPhase === 1}
              drones={arenaStatus === 'running' ? dronesInA : undefined}
              queue={arenaStatus === 'running' ? queueA : undefined}
            />
            <WarehouseNode
              name="GALPÃO B"
              x={85}
              y={12}
              active={arenaStatus === 'running' && sharedPhase === 2}
              drones={arenaStatus === 'running' ? dronesInB : undefined}
              queue={arenaStatus === 'running' ? queueB : undefined}
            />

            {/* Destinos */}
            <DestinationNode name="DESTINO A" x={15} y={88} active={arenaStatus === 'running' && sharedPhase === 1} />
            <DestinationNode name="DESTINO B" x={85} y={88} active={arenaStatus === 'running' && sharedPhase === 2} />
            
            {/* Sem indicador de entregas — foco na visualização dos voos */}
          </>
        ) : (
          <>
            {/* Divisor central */}
            <div className="absolute left-0 right-0"
              style={{ top: '50%', height: 1, backgroundColor: 'var(--color-border)', opacity: 0.3 }} />

            <RouteLabel top="29%" label="COM PACOTE →" />
            <RouteLabel top="71%" label="← RETORNO"    />

            <WarehouseNode name="GALPÃO A" x={12} y={50} active={arenaStatus === 'running'} />
            <WarehouseNode name="GALPÃO B" x={88} y={50} active={arenaStatus === 'running'} />
          </>
        )}

        {drones.map(d => <DroneToken key={d.id} drone={d} />)}

        {arenaStatus === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none">
            <div className="px-6 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-success)', backgroundColor: 'rgba(34,197,94,0.1)' }}>
              <span className="text-sm font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-success)' }}>
                Simulação Finalizada
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusBarProps {
  arenaStatus: ArenaStatus
  displayDiv: number
  sharedPhase?: number
}

function StatusBar({ arenaStatus, displayDiv, sharedPhase }: StatusBarProps) {
  let label = 'Aguardando Simulação'
  if (arenaStatus === 'running') {
    if (sharedPhase !== undefined) {
      const activeSide = sharedPhase === 1 ? 'GALPÃO A (OCIOSO B)' : 'GALPÃO B (OCIOSO A)'
      label = `MONITORAMENTO EM TEMPO REAL — DEMANDA NO ${activeSide}`
    } else {
      label = 'Monitoramento em Tempo Real'
    }
  } else if (arenaStatus === 'done') {
    label = 'Operação Concluída'
  } else if (arenaStatus === 'error') {
    label = 'Falha de Telemetria'
  }

  const dotColor =
    arenaStatus === 'running' ? 'var(--color-cyan-primary)' :
    arenaStatus === 'done'    ? 'var(--color-success)'       :
    arenaStatus === 'error'   ? 'var(--color-error)'         : 'var(--color-text-muted)'

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b"
      style={{ backgroundColor: '#11151c', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{
          backgroundColor: dotColor,
          animation: arenaStatus === 'running' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
        }} />
        <span className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
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
        style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'rgba(13,17,23,0.7)',
          border: '1px solid var(--color-border)',
        }}>
        {label}
      </span>
    </div>
  )
}

interface WarehouseNodeProps {
  name: string
  x: number
  y: number
  active: boolean
  drones?: number
  queue?: number
}

function WarehouseNode({ name, x, y, active, drones, queue }: WarehouseNodeProps) {
  return (
    <div className="absolute flex flex-col items-center justify-center gap-1.5 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: 4 }}>
      <div className="relative flex items-center justify-center rounded-xl" style={{
        width: 52, height: 52,
        backgroundColor: 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-cyan-deep)' : 'var(--color-border)'}`,
        boxShadow: active ? '0 0 18px 2px rgba(14,165,233,0.12)' : 'none',
        transition: 'all 0.5s ease',
      }}>
        <Warehouse size={20} style={{ color: active ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)' }} />
        {active && (
          <div className="absolute inset-0 rounded-xl border border-cyan-500/20"
            style={{ animation: 'node-breathe 2.5s ease-out infinite' }} />
        )}
      </div>
      <span className="text-[8px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 rounded whitespace-nowrap animate-fade-in"
        style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}>
        {name}
      </span>
      {drones !== undefined && (
        <div className="flex items-center gap-1.5 text-[8px] font-mono tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap bg-black/40 border border-border/40 text-text-secondary">
          <span>DRONES: {drones}</span>
          {queue !== undefined && <span>• FILA: {queue}</span>}
        </div>
      )}
    </div>
  )
}

function DestinationNode({ name, x, y, active }: { name: string; x: number; y: number; active: boolean }) {
  return (
    <div className="absolute flex flex-col items-center justify-center gap-2 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: 4 }}>
      <div className="relative flex items-center justify-center rounded-xl" style={{
        width: 52, height: 52,
        backgroundColor: 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-cyan-deep)' : 'var(--color-border)'}`,
        boxShadow: active ? '0 0 18px 2px rgba(14,165,233,0.12)' : 'none',
        transition: 'all 0.5s ease',
      }}>
        <MapPin size={20} style={{ color: active ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)' }} />
        {active && (
          <div className="absolute inset-0 rounded-xl border border-cyan-500/20"
            style={{ animation: 'node-breathe 2.5s ease-out infinite' }} />
        )}
      </div>
      <span className="text-[8px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 rounded whitespace-nowrap animate-fade-in"
        style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}>
        {name}
      </span>
    </div>
  )
}
