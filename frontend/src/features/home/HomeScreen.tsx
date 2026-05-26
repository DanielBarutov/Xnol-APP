// frontend/src/features/home/HomeScreen.tsx
import React, { useRef, useState } from 'react'
import { Search, Bell, CreditCard, Plus, Minus, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useHomeData } from './hooks/useHomeData'
import { useUIStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { formatDate } from '../../shared/lib/format'
import { DynIcon } from '../../shared/icons/lucide'
import { COLORS } from '../../shared/tokens'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#0ea5e9',
]

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function currentMonthYear(): string {
  const now = new Date()
  return `${MONTH_NAMES_RU[now.getMonth()]} ${now.getFullYear()}`
}

function formatBigBalance(value: number): string {
  return value.toLocaleString('ru-RU')
}

function formatTxDate(isoDate: string, isoCreatedAt: string): string {
  const today = new Date()
  const txDate = new Date(isoDate)
  const time = isoCreatedAt.slice(11, 16)

  const isToday =
    txDate.getFullYear() === today.getFullYear() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getDate() === today.getDate()

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday =
    txDate.getFullYear() === yesterday.getFullYear() &&
    txDate.getMonth() === yesterday.getMonth() &&
    txDate.getDate() === yesterday.getDate()

  const label = isToday ? 'Сегодня' : isYesterday ? 'Вчера' : formatDate(isoDate)
  return `${label}, ${time}`
}

export function HomeScreen() {
  const navigate = useNavigate()
  const { accounts, transactions, categories, monthStats, totalBalance } = useHomeData()
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeCard, setActiveCard] = useState(0)

  const accountList = accounts.data ?? []
  const txList = transactions.data ?? []
  const categoryList = categories.data ?? []

  // Other-currency balances for subtitle
  const otherBalances = accountList
    .filter((a) => a.currency !== 'RUB')
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.currency] = (acc[a.currency] ?? 0) + parseFloat(a.balance)
      return acc
    }, {})

  const otherBalanceText = Object.entries(otherBalances)
    .map(([cur, val]) => {
      const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur
      return `${sym}${val.toLocaleString('ru-RU')}`
    })
    .join(' · ')

  // Stats
  const statsLoading = monthStats.isLoading
  const statsError = monthStats.isError
  const totalIncome = monthStats.data?.total_income
  const totalExpense = monthStats.data?.total_expense

  function incomeDisplay(): string {
    if (statsLoading) return 'Загрузка...'
    if (statsError || !totalIncome) return '—'
    return `+${parseFloat(totalIncome).toLocaleString('ru-RU')} ₽`
  }

  function expenseDisplay(): string {
    if (statsLoading) return 'Загрузка...'
    if (statsError || !totalExpense) return '—'
    return `−${parseFloat(totalExpense).toLocaleString('ru-RU')} ₽`
  }

  function getCategoryIcon(categoryId: string): string {
    // Flatten all categories including children
    function flatten(cats: typeof categoryList): typeof categoryList {
      return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
    }
    const all = flatten(categoryList)
    return all.find((c) => c.id === categoryId)?.icon ?? 'Package'
  }

  function getCategoryColor(categoryId: string): string {
    function flatten(cats: typeof categoryList): typeof categoryList {
      return cats.flatMap((c) => [c, ...flatten(c.children ?? [])])
    }
    const all = flatten(categoryList)
    return all.find((c) => c.id === categoryId)?.color ?? '#6366f1'
  }

  function handleScroll() {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const cardWidth = el.scrollWidth / (accountList.length || 1)
    const idx = Math.round(el.scrollLeft / cardWidth)
    setActiveCard(Math.min(Math.max(idx, 0), accountList.length - 1))
  }

  const firstLetter = user?.full_name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{
        padding: '54px 20px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 }}>
            Добро пожаловать
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.5 }}>
            {currentMonthYear()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={iconBtn}>
            <Search size={18} color={COLORS.textSecondary} />
          </button>
          <button style={iconBtn}>
            <Bell size={18} color={COLORS.textSecondary} />
          </button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'grid', placeItems: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {firstLetter}
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div style={{
        margin: '20px 20px 0',
        padding: '22px 22px 20px',
        borderRadius: 28,
        background: 'linear-gradient(135deg, #1a1060 0%, #2d1b69 40%, #4c1d95 100%)',
        border: '1px solid rgba(139,92,246,0.4)',
        boxShadow: '0 20px 60px rgba(99,102,241,0.3)',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.55)',
            fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            Общий баланс
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.08)',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              letterSpacing: 0.5,
            }}>
              RUB
            </div>
            <button
              onClick={toggleBalance}
              style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
            >
              {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {/* Main balance */}
        <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 4 }}>
          {balanceVisible ? `₽ ${formatBigBalance(totalBalance)}` : '₽ ••••••'}
        </div>

        {/* Subtitle */}
        {otherBalanceText ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
            + {otherBalanceText} на других счетах
          </div>
        ) : (
          <div style={{ marginBottom: 18 }} />
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />

        {/* Income / Expense row */}
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              ↑ Доходы
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.income }}>
              {incomeDisplay()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              ↓ Расходы
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.expense }}>
              {expenseDisplay()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 20px 0' }}>
        <button
          onClick={() => openModal('add-tx', { kind: 'income' })}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 18,
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.3)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Plus size={20} color={COLORS.income} />
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.income }}>Доход</span>
        </button>
        <button
          onClick={() => openModal('add-tx', { kind: 'expense' })}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 18,
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.3)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Minus size={20} color={COLORS.expense} />
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.expense }}>Расход</span>
        </button>
      </div>

      {/* Accounts section */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary }}>
            Счета
          </span>
          <button onClick={() => navigate('/accounts')} style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Все →
          </button>
        </div>

        {/* Horizontal scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: 12,
            padding: '0 20px 8px',
            scrollbarWidth: 'none',
          }}
        >
          {accountList.map((account, idx) => {
            const dotColor = TAG_COLORS[idx % TAG_COLORS.length]
            const balance = parseFloat(account.balance)
            const currencySymbol = account.currency === 'RUB' ? '₽' : account.currency === 'USD' ? '$' : '€'
            return (
              <div
                key={account.id}
                style={{
                  minWidth: 'calc(100% - 40px)',
                  scrollSnapAlign: 'start',
                  flexShrink: 0,
                  background: '#0d1220',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: 18,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{account.bank_name}</span>
                  </div>
                  <CreditCard size={20} color={COLORS.textSecondary} />
                </div>

                {/* Balance */}
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>
                  {balanceVisible ? `${balance.toLocaleString('ru-RU')} ${currencySymbol}` : '••••••'}
                </div>

                {/* Bottom */}
                <div style={{ fontSize: 13, color: COLORS.income, fontWeight: 600 }}>
                  {account.name}
                </div>
              </div>
            )
          })}
          {accountList.length === 0 && (
            <div style={{ padding: '20px 0', color: COLORS.textSecondary, fontSize: 13 }}>
              Счетов пока нет
            </div>
          )}
        </div>

        {/* Dot indicators */}
        {accountList.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            {accountList.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === activeCard ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === activeCard ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textSecondary }}>
            Последние
          </span>
          <button onClick={() => openModal('all-transactions')} style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Все →
          </button>
        </div>

        <div style={{ padding: '0 20px' }}>
          {transactions.isLoading && (
            <div style={{ color: COLORS.textSecondary, fontSize: 13, padding: '12px 0' }}>Загрузка...</div>
          )}
          {txList.map((tx) => {
            const iconName = getCategoryIcon(tx.category_id)
            const catColor = getCategoryColor(tx.category_id)
            const isIncome = tx.type === 'income'
            const amtColor = isIncome ? COLORS.income : COLORS.expense
            const amtPrefix = isIncome ? '+' : '−'
            const amt = Math.abs(parseFloat(tx.amount)).toLocaleString('ru-RU')

            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: `${catColor}22`,
                  border: `1px solid ${catColor}44`,
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0,
                }}>
                  <DynIcon name={iconName} size={18} color={catColor} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: COLORS.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tx.description || 'Операция'}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                    {formatTxDate(tx.date, tx.created_at)}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontSize: 15, fontWeight: 700, color: amtColor, flexShrink: 0 }}>
                  {balanceVisible ? `${amtPrefix}${amt} ₽` : '••••••'}
                </div>
              </div>
            )
          })}
          {!transactions.isLoading && txList.length === 0 && (
            <div style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              Операций пока нет
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 12,
  background: COLORS.surface2,
  border: `1px solid ${COLORS.border}`,
  display: 'grid', placeItems: 'center',
  cursor: 'pointer',
}
