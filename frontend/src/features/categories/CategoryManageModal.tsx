import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { categoriesApi } from '../../api/endpoints/categories'
import { DynIcon, CATEGORY_ICONS } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#34d399', '#f59e0b', '#06b6d4', '#f87171']

type TabType = 'expense' | 'income'

export function CategoryManageModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'categories'
  const qc = useQueryClient()

  const [tab, setTab] = useState<TabType>('expense')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Package')
  const [color, setColor] = useState('#6366f1')

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const mutation = useMutation({
    mutationFn: () => categoriesApi.create({ name, type: tab, icon, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Категория создана', COLORS.income)
      setCreating(false)
      setName('')
      setIcon('Package')
      setColor('#6366f1')
    },
    onError: () => showToast('Ошибка', COLORS.expense),
  })

  const filtered =
    categories?.flatMap(c => [c, ...(c.children ?? [])]).filter(c => c.type === tab) ?? []

  return (
    <Modal open={open} onClose={() => { setCreating(false); closeModal() }}>
      <div style={{ padding: '6px 20px 32px', minHeight: 400 }}>
        {/* Header */}
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          {creating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setCreating(false)}
                style={{
                  background: 'none', border: 0, color: COLORS.textSecondary,
                  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                }}
              >
                <DynIcon name="ChevronLeft" size={20} />
              </button>
              Новая категория
            </div>
          ) : 'Категории'}
        </div>

        {!creating ? (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['expense', 'income'] as TabType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: tab === t ? 'var(--accent-tint)' : COLORS.surface2,
                    border: `1.5px solid ${tab === t ? 'var(--accent)' : COLORS.border}`,
                    color: tab === t ? 'var(--accent)' : COLORS.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'expense' ? 'Расходы' : 'Доходы'}
                </button>
              ))}
            </div>

            {/* Category list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {filtered.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 14,
                    background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: `${cat.color}22`, display: 'grid',
                    placeItems: 'center', flexShrink: 0,
                  }}>
                    <DynIcon name={cat.icon} size={18} color={cat.color} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, flex: 1 }}>
                    {cat.name}
                  </span>
                  {cat.is_system && (
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>системная</span>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  Нет категорий
                </div>
              )}
            </div>

            {/* Add button */}
            <button
              onClick={() => setCreating(true)}
              style={{
                width: '100%', padding: 13, borderRadius: 14, fontSize: 14, fontWeight: 600,
                background: 'var(--accent-tint)', border: '1.5px dashed var(--accent)',
                color: 'var(--accent)', cursor: 'pointer',
              }}
            >
              + Добавить категорию
            </button>
          </>
        ) : (
          <>
            {/* Name input */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Название</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Кофе"
                style={inputStyle}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Цвет</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, background: c, border: 'none',
                      cursor: 'pointer',
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Иконка</div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 8, maxHeight: 200, overflowY: 'auto',
              }}>
                {CATEGORY_ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    style={{
                      padding: 10, borderRadius: 12,
                      border: `1.5px solid ${icon === ic ? 'var(--accent)' : COLORS.border}`,
                      background: icon === ic ? 'var(--accent-tint)' : COLORS.surface2,
                      cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}
                  >
                    <DynIcon
                      name={ic}
                      size={18}
                      color={icon === ic ? 'var(--accent)' : COLORS.textSecondary}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 14,
              background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
              marginBottom: 16,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: `${color}22`, display: 'grid', placeItems: 'center',
              }}>
                <DynIcon name={icon} size={18} color={color} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
                {name || 'Название категории'}
              </span>
            </div>

            <button
              onClick={() => mutation.mutate()}
              disabled={!name.trim() || mutation.isPending}
              style={{
                width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700,
                background: name.trim()
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : COLORS.surface2,
                color: name.trim() ? '#0a0e1a' : COLORS.textSecondary,
                border: 0,
                cursor: name.trim() ? 'pointer' : 'default',
              }}
            >
              {mutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: COLORS.textSecondary, fontWeight: 600,
  letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 14,
  background: COLORS.surface2, border: `1px solid ${COLORS.border}`,
  color: COLORS.textPrimary, fontSize: 15, fontWeight: 500,
  outline: 'none', boxSizing: 'border-box',
}
