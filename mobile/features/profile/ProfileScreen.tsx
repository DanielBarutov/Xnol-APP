import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient, useIsFetching, useIsMutating } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { useTheme } from '../../theme/ThemeProvider'
import { DynIcon } from '../../components/DynIcon'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { useMutationQueue } from '../../store/mutationQueue'
import type { ThemeName, ThemeMode } from '../../theme/tokens'

const THEMES: { name: ThemeName; label: string; colors: [string, string, string] }[] = [
  { name: 'violet', label: 'Violet', colors: ['#6366f1', '#8b5cf6', '#a855f7'] },
  { name: 'teal',   label: 'Teal',   colors: ['#14b8a6', '#0d9488', '#06b6d4'] },
  { name: 'amber',  label: 'Amber',  colors: ['#f59e0b', '#f97316', '#fbbf24'] },
  { name: 'rose',   label: 'Rose',   colors: ['#e11d48', '#ec4899', '#f43f5e'] },
]

const MENU_ITEMS: { icon: string; label: string; modal?: string }[] = [
  { icon: 'List',       label: 'Все операции',  modal: 'all-transactions' },
  { icon: 'Tag',        label: 'Категории',      modal: 'categories' },
  { icon: 'Settings',  label: 'Настройки' },
  { icon: 'Bell',      label: 'Помощь' },
]

export function ProfileScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const balanceVisible = useUIStore((s) => s.balanceVisible)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const toggleBalance = useUIStore((s) => s.toggleBalance)
  const openModal = useUIStore((s) => s.openModal)

  const networkStatus = useNetworkStatus()
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const isSyncing = isFetching > 0 || isMutating > 0
  const pendingCount = useMutationQueue((s) => s.items.length)

  const isDark = themeMode === 'dark'
  const initials = (user?.full_name ?? 'U').slice(0, 1).toUpperCase()

  function handleRefresh() {
    if (networkStatus !== 'online') return
    qc.invalidateQueries()
  }

  async function changeTheme(name: ThemeName) {
    setTheme(name)
    await authApi.patchTheme({ theme_color: name }).catch(() => {})
  }

  async function changeMode(dark: boolean) {
    const mode: ThemeMode = dark ? 'dark' : 'light'
    setThemeMode(mode)
    await authApi.patchTheme({ theme_mode: mode }).catch(() => {})
  }

  function handleLogout() {
    Alert.alert('Выйти', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { qc.clear(); logout() } },
    ])
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + user */}
      <View style={styles.userRow}>
        <LinearGradient colors={[colors.accent2, colors.accent]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.full_name}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>
      </View>

      {/* ОФОРМЛЕНИЕ */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ОФОРМЛЕНИЕ</Text>
      <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <View style={styles.row}>
          <DynIcon name="Moon" size={18} color={colors.textSecondary} />
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Тёмная тема</Text>
          <Switch
            value={isDark}
            onValueChange={changeMode}
            trackColor={{ true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ЦВЕТ */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>ЦВЕТ</Text>
      <View style={styles.themeGrid}>
        {THEMES.map(t => {
          const isActive = theme === t.name
          return (
            <TouchableOpacity
              key={t.name}
              style={[styles.themeCard, {
                backgroundColor: colors.surface2,
                borderColor: isActive ? t.colors[0] : colors.border,
                borderWidth: isActive ? 1.5 : 1,
              }]}
              onPress={() => changeTheme(t.name)}
            >
              <View style={styles.themeDots}>
                {t.colors.map(c => (
                  <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Скрыть баланс + меню */}
      <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border, marginTop: 20 }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Скрыть баланс</Text>
          <Switch
            value={!balanceVisible}
            onValueChange={() => toggleBalance()}
            trackColor={{ true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Sync status */}
        <TouchableOpacity
          style={styles.row}
          onPress={handleRefresh}
          activeOpacity={networkStatus === 'online' ? 0.6 : 1}
        >
          {networkStatus === 'offline' ? (
            <DynIcon name="WifiOff" size={16} color={colors.expense} />
          ) : isSyncing ? (
            <ActivityIndicator size={16} color={colors.accent} />
          ) : (
            <DynIcon name="RefreshCw" size={16} color={colors.income} />
          )}
          <Text style={[styles.rowLabel, {
            color: networkStatus === 'offline' ? colors.expense
              : isSyncing ? colors.accent
              : colors.income,
          }]}>
            {networkStatus === 'offline'
              ? pendingCount > 0
                ? `Нет сети · ${pendingCount} в очереди`
                : 'Нет сети · Данные из кэша'
              : isSyncing ? 'Синхронизация...'
              : pendingCount > 0
                ? `Отправляется ${pendingCount}...`
                : 'Синхронизировано'}
          </Text>
          {networkStatus === 'online' && !isSyncing && pendingCount === 0 && (
            <Text style={[styles.syncHint, { color: colors.textMuted }]}>обновить</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {MENU_ITEMS.map((item, i) => (
          <View key={item.label}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => item.modal ? openModal(item.modal as any) : undefined}
            >
              <DynIcon name={item.icon} size={17} color={colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <DynIcon name="ChevronRight" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {i < MENU_ITEMS.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          </View>
        ))}
      </View>

      {/* Выйти */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.expense + '18', borderColor: colors.expense + '44' }]}
        onPress={handleLogout}
      >
        <DynIcon name="LogOut" size={18} color={colors.expense} />
        <Text style={[styles.logoutText, { color: colors.expense }]}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800' },
  userEmail: { fontSize: 13, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  themeCard: { width: '47%', borderRadius: 14, padding: 14, gap: 8 },
  themeDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  themeLabel: { fontSize: 14, fontWeight: '700' },

  divider: { height: 1, marginHorizontal: 16 },
  syncHint: { fontSize: 12, fontWeight: '500' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, height: 52, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: '700' },
})
