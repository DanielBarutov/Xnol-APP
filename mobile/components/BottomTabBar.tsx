import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Landmark, BarChart3, User, Plus } from 'lucide-react-native'
import { useTheme } from '../theme/ThemeProvider'
import { useUIStore } from '../store/ui'

const TABS = [
  { href: '/',          label: 'Главная',   Icon: Home },
  { href: '/accounts',  label: 'Счета',     Icon: Landmark },
  { href: '/analytics', label: 'Аналитика', Icon: BarChart3 },
  { href: '/profile',   label: 'Профиль',   Icon: User },
]

export function BottomTabBar() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  const openModal = useUIStore((s) => s.openModal)

  return (
    <View style={[styles.container, {
      paddingBottom: insets.bottom + 6,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    }]}>
      {TABS.slice(0, 2).map(({ href, label, Icon }) => {
        const active = pathname === href || (href === '/' && pathname === '')
        return (
          <TouchableOpacity key={href} style={styles.tab} onPress={() => router.navigate(href as any)}>
            <View style={[styles.pill, active && { backgroundColor: colors.accentTint }]}>
              <Icon size={20} color={active ? colors.accent : colors.textMuted} />
            </View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        )
      })}

      <TouchableOpacity style={styles.tab} onPress={() => openModal('add-tx')}>
        <View style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accentShadow }]}>
          <Plus size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      {TABS.slice(2).map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <TouchableOpacity key={href} style={styles.tab} onPress={() => router.navigate(href as any)}>
            <View style={[styles.pill, active && { backgroundColor: colors.accentTint }]}>
              <Icon size={20} color={active ? colors.accent : colors.textMuted} />
            </View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    width: 38,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
})
