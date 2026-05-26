import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { categoriesApi } from '../../api/endpoints/categories'
import { DynIcon, CATEGORY_ICONS } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'
import { Edit, Trash2 } from 'lucide-react'

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

  const [editing, setEditing] = useState<string | null>(null) // category id being edited
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('Package')
  const [editColor, setEditColor] = useState('#6366f1')

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

  const updateMutation = useMutation({
    mutationFn: () => categoriesApi.update(editing!, { name: editName, icon: editIcon, color: editColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Категория обновлена', COLORS.income)
      setEditing(null)
    },
    onError: () => showToast('Ошибка', COLORS.expense),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Категория удалена', COLORS.expense)
    },
    onError: () => showToast('Ошибка при удалении', COLORS.expense),
  })

  const filtered =
    categories?.flatMap(c => [c, ...(c.children ?? [])]).filter(c => c.type === tab) ?? []

  return (
    <Modal open={open} onClose={() => { setCreating(false); setEditing(null); closeModal() }}>
      <div style={{ padding: '6px 20px 32px', minHeight: 400 }}>
        {/* Header */}
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 16 }}>
          {creating || editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => { setCreating(false); setEditing(null) }}
                style={{
                  background: 'none', border: 0, color: COLORS.textSecondary,
                  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                }}
              >
                <DynIcon name="ChevronLeft" size={20} />
              </button>
              {creating ? 'Новая категория' : 'Изменить категорию'}
            </div>
          ) : 'Категории'}
        </div>

        {editing ? (
          <>
            {/* Edit name */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Название</div>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Кофе" style={inputStyle} />
            </div>

            {/* Edit color */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Цвет</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setEditColor(c)} style={{ width: 32, height: 32, borderRadius: 10, background: c, border: 'none', cursor: 'pointer', outline: editColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
                ))}
              </div>
            </div>

            {/* Edit icon */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Иконка</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {CATEGORY_ICONS.map(ic => (
                  <button key={ic} onClick={() => setEditIcon(ic)} style={{ padding: 10, borderRadius: 12, border: `1.5px solid ${editIcon === ic ? 'var(--accent)' : COLORS.border}`, background: editIcon === ic ? 'var(--accent-tint)' : COLORS.surface2, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <DynIcon name={ic} size={18} color={editIcon === ic ? 'var(--accent)' : COLORS.textSecondary} />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: `${editColor}22`, display: 'grid', placeItems: 'center' }}>
                <DynIcon name={editIcon} size={18} color={editColor} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{editName || 'Название категории'}</span>
            </div>

            <button
              onClick={() => updateMutation.mutate()}
              disabled={!editName.trim() || updateMutation.isPending}
              style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700, background: editName.trim() ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2, color: editName.trim() ? '#0a0e1a' : COLORS.textSecondary, border: 0, cursor: editName.trim() ? 'pointer' : 'default' }}
            >
              {updateMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </>
        ) : !creating ? (
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
                  {cat.is_system ? (
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>системная</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => {
                          setEditing(cat.id)
                          setEditName(cat.name)
                          setEditIcon(cat.icon)
                          setEditColor(cat.color)
                        }}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.textSecondary }}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Удалить категорию «${cat.name}»?`)) {
                            deleteMutation.mutate(cat.id)
                          }
                        }}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: COLORS.expense }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
