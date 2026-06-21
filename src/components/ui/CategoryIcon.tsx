import * as icons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface CategoryIconProps {
  icon: string
  color: string
  size?: number
  className?: string
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

export function CategoryIcon({ icon, color, size = 20, className = '' }: CategoryIconProps) {
  const pascalName = toPascalCase(icon) as keyof typeof icons
  const IconComponent = icons[pascalName] as React.FC<LucideProps> | undefined

  return (
    <div
      className={`flex items-center justify-center rounded-full ${className}`}
      style={{
        backgroundColor: `${color}15`,
        width: size + 16,
        height: size + 16,
      }}
    >
      {IconComponent ? (
        <IconComponent size={size} style={{ color }} />
      ) : (
        <icons.Tag size={size} style={{ color }} />
      )}
    </div>
  )
}
