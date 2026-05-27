import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useUIStore } from '../../store/ui'
import { useTheme } from '../../theme/ThemeProvider'
import type { ThemeName, ThemeMode } from '../../theme/tokens'

const THEMES: { name: ThemeName; color: string; label: string }[] = [
  { name: 'violet', color: '#6366f1', label: 'Фиолетовый' },
  { name: 'teal',   color: '#14b8a6', label: 'Бирюзовый' },
  { name: 'amber',  color: '#f59e0b', label: 'Янтарь' },
  { name: 'rose',   color: '#e11d48', label: 'Роза' },
]

export function ProfileScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useUIStore((s) => s.theme)
  const themeMode = useUIStore((s) => s.themeMode)
  const setTheme = useUIStore((s) => s.setTheme)
  const setThemeMode = useUIStore((s) => s.setThemeMode)

  async function changeTheme(name: ThemeName) {
    setTheme(name)
    await authApi.patchTheme({ theme_color: name }).catch(() => {})
  }

  async function changeMode(mode: ThemeMode) {
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 24 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Профиль</Text>

        {/* User info */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.full_name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>

        {/* Theme color */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Цвет темы</Text>
          <View style={styles.themeRow}>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.name}
                style={[styles.themeDot, { backgroundColor: t.color, borderWidth: theme === t.name ? 3 : 0, borderColor: colors.textPrimary }]}
                onPress={() => changeTheme(t.name)}
              />
            ))}
          </View>
        </View>

        {/* Theme mode */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Режим</Text>
          <View style={[styles.toggle, { backgroundColor: colors.surface2 }]}>
            {(['dark', 'light'] as ThemeMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, themeMode === m && { backgroundColor: colors.accent }]}
                onPress={() => changeMode(m)}
              >
                <Text style={{ color: themeMode === m ? '#fff' : colors.textMuted, fontWeight: '600' }}>
                  {m === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.expense }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.expense }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  themeRow: { flexDirection: 'row', gap: 14 },
  themeDot: { width: 36, height: 36, borderRadius: 18 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { height: 50, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontWeight: '600', fontSize: 15 },
})
