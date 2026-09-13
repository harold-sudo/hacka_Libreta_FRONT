import { cn } from '../lib/cn'

type LogoProps = {
  /** Clase de alto de Tailwind. El logo es cuadrado, así que el ancho queda automático. */
  size?: string
  className?: string
}

/** Marca gráfica de CREDITCHAIN. Punto único de cambio para el logo de la aplicación. */
export function Logo({ size = 'h-9', className }: LogoProps) {
  return (
    <img src="/logo.png" alt="CreditChain" className={cn(size, 'w-auto', className)} />
  )
}
