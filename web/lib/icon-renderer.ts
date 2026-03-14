import { icons } from "lucide-react"

export function getIconComponent(name: string): React.ElementType | null {
  const icon = (icons as Record<string, React.ElementType>)[name]
  return icon ?? null
}
