import * as L from 'lucide-react'

export const CATEGORY_ICONS = [
  'ShoppingCart','Coffee','Car','Home','Heart','Music','BookOpen','Briefcase',
  'Plane','Gift','Utensils','Bus','Zap','Film','Smartphone','Globe','Dumbbell',
  'Shirt','Pill','GraduationCap','Wallet','TrendingUp','DollarSign','Package',
  'Star','Fuel','ShoppingBag','Pizza','Baby','PawPrint','Hammer','Scissors',
  'Camera','Bike','Train','Ship','Gamepad2','Flower2','Apple','Beef',
  'HeartPulse','CircleEllipsis','Laptop','PlusCircle',
] as const

export type CategoryIconName = typeof CATEGORY_ICONS[number]

function toPascalCase(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

interface DynIconProps { name: string; size?: number; color?: string }

export function DynIcon({ name, size = 20, color }: DynIconProps) {
  const key = toPascalCase(name)
  const Icon = (L as Record<string, unknown>)[key] as React.FC<{ size?: number; color?: string }> | undefined
  if (!Icon) return <L.Package size={size} color={color} />
  return <Icon size={size} color={color} />
}
