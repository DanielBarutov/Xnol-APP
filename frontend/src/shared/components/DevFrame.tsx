interface Props { children: React.ReactNode }

export function DevFrame({ children }: Props) {
  if (import.meta.env.VITE_DEV_FRAME !== 'true') return <>{children}</>
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '20px 12px', background: 'radial-gradient(ellipse at top, #0b0f1c 0%, #04060d 70%)' }}>
      <div style={{
        width: 390, height: 844, borderRadius: 54, overflow: 'hidden', position: 'relative',
        background: '#04060d',
        boxShadow: '0 0 0 10px #1a1a1a, 0 0 0 12px #2a2a2a, 0 30px 80px rgba(0,0,0,0.8)',
      }}>
        {children}
      </div>
    </div>
  )
}
