import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../shared/components/Modal'
import { useUIStore } from '../../store/ui'
import { accountsApi } from '../../api/endpoints/accounts'
import { useAccounts } from './hooks/useAccounts'
import { COLORS } from '../../shared/tokens'

export function AccountEditModal() {
  const { modal, closeModal, showToast } = useUIStore()
  const open = modal.type === 'account-edit'
  const accountId = (modal.payload as { accountId: string } | undefined)?.accountId ?? ''
  const qc = useQueryClient()
  const { accounts } = useAccounts()

  const account = accounts.data?.find(a => a.id === accountId)

  const [bankName, setBankName] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (account) {
      setBankName(account.bank_name)
      setName(account.name)
    }
  }, [account])

  const saveMutation = useMutation({
    mutationFn: () => accountsApi.update(accountId, { bank_name: bankName, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      showToast('Счёт обновлён', COLORS.income)
      closeModal()
    },
    onError: () => showToast('Ошибка при сохранении', COLORS.expense),
  })

  const deleteMutation = useMutation({
    mutationFn: () => accountsApi.delete(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      showToast('Счёт удалён', COLORS.expense)
      closeModal()
    },
    onError: () => showToast('Ошибка при удалении', COLORS.expense),
  })

  const handleDelete = () => {
    if (window.confirm('Удалить счёт? Это действие нельзя отменить.')) {
      deleteMutation.mutate()
    }
  }

  const canSave = bankName.trim() && name.trim()

  return (
    <Modal open={open} onClose={closeModal}>
      <div style={{ padding: '6px 20px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 20 }}>
          Редактировать счёт
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Банк</div>
          <input
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            placeholder="Сбербанк"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Название</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Основной"
            style={inputStyle}
          />
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          style={{
            width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700,
            background: canSave ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : COLORS.surface2,
            color: canSave ? '#fff' : COLORS.textSecondary,
            border: 0, cursor: canSave ? 'pointer' : 'default',
            marginBottom: 10,
          }}
        >
          {saveMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          style={{
            width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 700,
            background: `${COLORS.expense}18`, color: COLORS.expense,
            border: `1px solid ${COLORS.expense}44`, cursor: 'pointer',
          }}
        >
          {deleteMutation.isPending ? 'Удаляем...' : 'Удалить счёт'}
        </button>
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
