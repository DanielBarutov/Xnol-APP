// frontend/src/shared/components/Modal.tsx
import { useEffect } from 'react'
import { COLORS } from '../tokens'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

let openCount = 0

export function Modal({ open, onClose, children }: Props) {
  useEffect(() => {
    if (open) {
      openCount++
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (open) {
        openCount--
        if (openCount === 0) document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2,4,12,0.65)',
          backdropFilter: 'blur(8px)',
          animation: 'xn-fade 0.18s ease-out',
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
        background: `linear-gradient(to bottom, ${COLORS.surface2}, ${COLORS.surface})`,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: `1px solid ${COLORS.borderStrong}`,
        borderBottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        animation: 'xn-slide 0.22s cubic-bezier(.2,.9,.3,1)',
        maxHeight: '92dvh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 42, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }} />
        </div>
        {children}
      </div>
    </>
  )
}
