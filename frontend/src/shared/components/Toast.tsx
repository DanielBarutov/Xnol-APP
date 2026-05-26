// frontend/src/shared/components/Toast.tsx
import { useEffect } from 'react'
import { useUIStore } from '../../store/ui'

export function Toast() {
  const { toast, dismissToast } = useUIStore()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, 2400)
    return () => clearTimeout(t)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div style={{
      position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 18px', borderRadius: 99,
      background: 'rgba(12,16,28,0.95)',
      border: `1px solid ${toast.color}55`,
      color: toast.color, fontSize: 12.5, fontWeight: 600,
      zIndex: 200, whiteSpace: 'nowrap',
      boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
      animation: 'xn-toast 0.3s ease-out',
    }}>
      {toast.message}
    </div>
  )
}
