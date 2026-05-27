import { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUIStore } from '../store/ui'

export function Toast() {
  const toast = useUIStore((s) => s.toast)
  const dismiss = useUIStore((s) => s.dismissToast)
  const opacity = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!toast) return
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => dismiss())
  }, [toast])

  if (!toast) return null

  return (
    <Animated.View style={[styles.toast, { backgroundColor: toast.color, bottom: insets.bottom + 90, opacity }]}>
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, borderRadius: 12, padding: 14, alignItems: 'center', zIndex: 100 },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
