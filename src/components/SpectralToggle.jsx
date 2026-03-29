export default function SpectralToggle({ mode, onToggle }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        color: mode === 'hubble' ? '#88ccff' : '#ff8844',
        fontSize: 11,
        letterSpacing: 4,
        fontFamily: 'monospace',
        opacity: 0.9,
      }}>
        {mode === 'hubble'
          ? '▸ HUBBLE · VISIBLE LIGHT · 0.4–0.7μm'
          : '▸ WEBB · NEAR-INFRARED · 0.6–5μm'}
      </div>

      <button
        onClick={onToggle}
        style={{
          padding: '11px 36px',
          background: mode === 'hubble'
            ? 'rgba(10, 40, 100, 0.75)'
            : 'rgba(100, 30, 5, 0.75)',
          border: `1px solid ${mode === 'hubble' ? '#2255cc' : '#cc4400'}`,
          color: '#ffffff',
          fontSize: 11,
          letterSpacing: 3,
          fontFamily: 'monospace',
          cursor: 'pointer',
          borderRadius: 2,
          backdropFilter: 'blur(12px)',
          transition: 'all 0.4s ease',
        }}
      >
        {mode === 'hubble' ? '⇄ SWITCH TO WEBB IR' : '⇄ SWITCH TO HUBBLE VIS'}
      </button>
    </div>
  )
}
