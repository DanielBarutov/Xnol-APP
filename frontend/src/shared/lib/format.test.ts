import { describe, it, expect } from 'vitest'
import { formatAmount, formatCurrency, formatDate } from './format'

// Note: ru-RU locale in this Node.js environment uses U+00A0 (non-breaking space)
// as the thousands separator, not a regular space.
const NBSP = ' '

describe('formatAmount', () => {
  it('formats integer with RU locale', () => {
    expect(formatAmount(85000)).toBe(`85${NBSP}000`)
  })
  it('formats decimal', () => {
    expect(formatAmount(1200.5)).toBe(`1${NBSP}200,5`)
  })
})

describe('formatCurrency', () => {
  it('appends ₽ for RUB', () => expect(formatCurrency(1000, 'RUB')).toBe(`1${NBSP}000 ₽`))
  it('appends $ for USD', () => expect(formatCurrency(500, 'USD')).toBe('500 $'))
  it('appends € for EUR', () => expect(formatCurrency(200, 'EUR')).toBe('200 €'))
})

describe('formatDate', () => {
  it('returns Сегодня for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(formatDate(today)).toBe('Сегодня')
  })
  it('formats other dates', () => {
    expect(formatDate('2026-05-20')).toMatch(/20 мая/)
  })
})
