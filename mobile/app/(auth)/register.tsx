import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { authApi } from '@xnoll/shared'
import { useAuthStore } from '../../store/auth'
import { useTheme } from '../../theme/ThemeProvider'
import type { Currency } from '@xnoll/shared'

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR']

export default function RegisterScreen() {
  const colors = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    if (!fullName || !email || !password) { setError('Заполните все поля'); return }
    setLoading(true)
    setError(null)
    try {
      await authApi.register({ full_name: fullName, email: email.trim(), password, primary_currency: currency })
      const { access_token, refresh_token } = await authApi.login({ email: email.trim(), password })
      setTokens(access_token, refresh_token)
      router.replace('/(tabs)/')
    } catch {
      setError('Ошибка регистрации. Проверьте данные.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 32 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Регистрация</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Имя"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
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

        <Text style={[styles.label, { color: colors.textSecondary }]}>Валюта</Text>
        <View style={styles.row}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyBtn, { borderColor: currency === c ? colors.accent : colors.border, backgroundColor: currency === c ? colors.accentTint : colors.surface }]}
              onPress={() => setCurrency(c)}
            >
              <Text style={{ color: currency === c ? colors.accent : colors.textSecondary, fontWeight: '600' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Создать аккаунт</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.accent }]}>Уже есть аккаунт? Войти</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: -6 },
  row: { flexDirection: 'row', gap: 10 },
  currencyBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', fontSize: 14 },
  error: { color: '#f87171', fontSize: 14, textAlign: 'center' },
})
