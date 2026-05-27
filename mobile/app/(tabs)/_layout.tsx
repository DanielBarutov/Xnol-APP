import { View } from 'react-native'
import { Slot } from 'expo-router'
import { BottomTabBar } from '../../components/BottomTabBar'
import { useTheme } from '../../theme/ThemeProvider'

export default function TabsLayout() {
  const colors = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Slot />
      <BottomTabBar />
    </View>
  )
}
