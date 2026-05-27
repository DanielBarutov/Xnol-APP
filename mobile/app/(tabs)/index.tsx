import { View, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

export default function HomeTab() {
  const colors = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textPrimary }}>Home</Text>
    </View>
  )
}
