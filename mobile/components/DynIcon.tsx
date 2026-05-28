import * as L from 'lucide-react-native'
import type { LucideProps } from 'lucide-react-native'

type IconComponent = React.ComponentType<LucideProps>

interface DynIconProps {
  name: string
  size?: number
  color?: string
}

export function DynIcon({ name, size = 20, color }: DynIconProps) {
  const Icon = (L as unknown as Record<string, IconComponent>)[name] ?? L.Package
  return <Icon size={size} color={color} />
}
