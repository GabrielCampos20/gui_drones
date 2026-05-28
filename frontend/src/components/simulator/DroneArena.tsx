import { Warehouse } from 'lucide-react'
import useDroneSimulation, {
  WH_LEFT_PCT
} from './useDroneSimulation'
import type { ArenaStatus } from './useDroneSimulation'
import DroneToken from './DroneToken'
import './DroneArena.css'

interface DroneArenaProps {
  executionId: string
}

export default function DroneArena({ executionId }: DroneArenaProps) {
  const {
    drones,
    arenaStatus,
    deliveries,
    drops,
    displayRate,
    displayDiv,
  } = useDroneSimulation(executionId)

  return (
    <div className="w-full rounded-xl border overflow-hidden mb-6"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      <StatusBar arenaStatus={arenaStatus} displayDiv={displayDiv} />

      <div className="relative w-full select-none" style={{ height: 300, backgroundColor: '#0d1117' }}>
        {/* Grade de fundo */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.03,
          backgroundImage:
            'linear-gradient(to right,#fff 1px,transparent 1px),' +
            'linear-gradient(to bottom,#fff 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Divisor central */}
        <div className="absolute left-0 right-0"
          style={{ top: '50%', height: 1, backgroundColor: 'var(--color-border)', opacity: 0.3 }} />

        <RouteLabel top="29%" label="COM PACOTE →" />
        <RouteLabel top="71%" label="← RETORNO"    />

        <WarehouseNode side="left"  active={arenaStatus === 'running'} />
        <WarehouseNode side="right" active={arenaStatus === 'running'} />

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

      <MetricsBar
        deliveries={deliveries}
        drops={drops}
        rate={displayRate}
        divisor={displayDiv}
        arenaStatus={arenaStatus}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBar({ arenaStatus, displayDiv }: { arenaStatus: ArenaStatus; displayDiv: number }) {
  const label =
    arenaStatus === 'running' ? 'Monitoramento em Tempo Real' :
    arenaStatus === 'done'    ? 'Operação Concluída'          :
    arenaStatus === 'error'   ? 'Falha de Telemetria'         : 'Aguardando Simulação'

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
        {active && (
          <div className="absolute inset-0 rounded-xl border border-cyan-500/20"
            style={{ animation: 'node-breathe 2.5s ease-out infinite' }} />
        )}
      </div>
      <span className="text-[8px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 rounded"
        style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}>
        {isLeft ? 'GALPÃO A' : 'GALPÃO B'}
      </span>
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
      <span className="text-[9px] font-bold tracking-wider uppercase"
        style={{ color: 'var(--color-text-muted)' }}>
        {icon} {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
