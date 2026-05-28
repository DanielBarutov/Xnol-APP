import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'

export default function LoginScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email || !password) { setError('Заполните все поля'); return }
    setLoading(true)
    setError(null)
    try {
      const { access_token, refresh_token } = await authApi.login({ email: email.trim(), password })
      setTokens(access_token, refresh_token)
      router.replace('/(tabs)/')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 32 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Вход в Xnoll</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Пароль"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Войти</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={[styles.link, { color: colors.accent }]}>Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', fontSize: 14, marginTop: 4 },
  error: { color: '#f87171', fontSize: 14, textAlign: 'center' },
})
