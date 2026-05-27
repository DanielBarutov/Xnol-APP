const SYM: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }

export function formatAmount(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

export function formatCurrency(n: number, currency: string): string {
  return `${formatAmount(n)} ${SYM[currency] ?? currency}`
}

export function formatDate(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (isoDate === today) return 'Сегодня'
  if (isoDate === yesterday) return 'Вчера'
  return new Date(isoDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function categoryEmoji(name: string): string {
  const map: Record<string, string> = {
    зарплата: '💼', фриланс: '💻', перевод: '↔️', доход: '💰',
    дивиденды: '📈', бонус: '🎁', подарок: '🎁',
    продукты: '🛒', 'продукты питания': '🛒', еда: '🍽️',
    кафе: '☕', ресторан: '🍽️', рестораны: '🍽️', кофе: '☕',
    такси: '🚕', транспорт: '🚌', метро: '🚇', бензин: '⛽',
    аренда: '🏠', коммунальные: '💡', жкх: '💡',
    развлечения: '🎬', кино: '🎬', игры: '🎮',
    здоровье: '💊', медицина: '💊', аптека: '💊',
    одежда: '👕', обувь: '👟',
    спорт: '⚽', фитнес: '🏋️',
    образование: '📚', книги: '📚',
    телефон: '📱', связь: '📱', интернет: '🌐',
    путешествия: '✈️', отпуск: '✈️',
    красота: '💄', уход: '💄',
    другое: '📦', прочее: '📦', разное: '📦',
  }
  return map[name.toLowerCase()] ?? '📦'
}
