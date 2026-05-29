interface DroneIconProps {
  phase: 'forward' | 'return'
  status: 'flying' | 'crashing'
}

export default function DroneIcon({ phase, status }: DroneIconProps) {
  const isForward  = phase === 'forward'
  const isCrashing = status === 'crashing'
  const propClass  = isCrashing ? 'spin-stopped' : isForward ? 'spin-fast' : 'spin-normal'

  return (
    <svg width="26" height="26" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Braços do quadricóptero */}
      <line x1="18" y1="18" x2="6" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="18" x2="30" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="18" x2="6" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="18" x2="30" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Suportes dos motores */}
      <circle cx="6" cy="6" r="2.5" fill="#1e293b" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="6" r="2.5" fill="#1e293b" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="30" r="2.5" fill="#1e293b" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="2.5" fill="#1e293b" stroke="currentColor" strokeWidth="1.5" />

      {/* Hélices rotativas */}
      <g className={`propeller-tl ${propClass}`}>
        <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="2" cy="6" r="0.6" fill="currentColor" />
        <circle cx="10" cy="6" r="0.6" fill="currentColor" />
      </g>
      <g className={`propeller-tr ${propClass}`}>
        <line x1="26" y1="6" x2="34" y2="6" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="26" cy="6" r="0.6" fill="currentColor" />
        <circle cx="34" cy="6" r="0.6" fill="currentColor" />
      </g>
      <g className={`propeller-bl ${propClass}`}>
        <line x1="2" y1="30" x2="10" y2="30" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="2" cy="30" r="0.6" fill="currentColor" />
        <circle cx="10" cy="30" r="0.6" fill="currentColor" />
      </g>
      <g className={`propeller-br ${propClass}`}>
        <line x1="26" y1="30" x2="34" y2="30" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="26" cy="30" r="0.6" fill="currentColor" />
        <circle cx="34" cy="30" r="0.6" fill="currentColor" />
      </g>

      {/* Corpo central (aerodinâmico) */}
      <rect x="12" y="10" width="12" height="16" rx="6" fill="#1e293b" stroke="currentColor" strokeWidth="2.2" />
      <rect x="14" y="12" width="8" height="12" rx="4" fill="#0f172a" />

      {/* LEDs de Navegação */}
      {/* Esquerda frontal: verde | Direita frontal: vermelho */}
      {!isCrashing && (
        <>
          <circle cx="6" cy="3" r="1.2" fill="#10b981" className="led-flash" style={{ color: '#10b981' }} />
          <circle cx="30" cy="3" r="1.2" fill="#ef4444" className="led-flash" style={{ color: '#ef4444' }} />
        </>
      )}

      {/* LED central de telemetria */}
      <circle cx="18" cy="18" r="1.8"
        fill={isCrashing ? '#ef4444' : isForward ? '#0ea5e9' : '#10b981'}
        className={isCrashing ? 'led-flash-fast' : 'led-flash'}
        style={{ color: isCrashing ? '#ef4444' : isForward ? '#0ea5e9' : '#10b981' }}
      />

      {/* Carga / Pacote físico pendurado no chassi */}
      {isForward && !isCrashing && (
        <g className="cargo-box">
          {/* Caixa amarela/laranja centralizada */}
          <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          {/* Fita de empacotamento cruzada */}
          <line x1="18" y1="14" x2="18" y2="22" stroke="#b45309" strokeWidth="0.8" />
          <line x1="14" y1="18" x2="22" y2="18" stroke="#b45309" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  )
}
