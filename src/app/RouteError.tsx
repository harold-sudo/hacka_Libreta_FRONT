import { useRouteError } from 'react-router-dom'
import { Button } from '../components/ui/primitives'

export function RouteError() {
  const error = useRouteError()
  const domChanged = error instanceof Error && /insertBefore|removeChild/.test(error.message)
  return (
    <main lang="es" translate="no" className="notranslate mx-auto max-w-xl space-y-4 p-8 text-slate-200">
      <h1 className="text-xl font-semibold">No se pudo mostrar esta pantalla</h1>
      <p>{domChanged
        ? 'El contenido de la página cambió fuera de la aplicación. Desactiva la traducción automática del navegador para este sitio y recarga.'
        : 'Recarga la página para volver a intentarlo.'}</p>
      <p>Si estabas enviando un pago o comprando una membresía, revisa primero el historial de tu wallet antes de repetir la operación.</p>
      <Button onClick={() => window.location.reload()}>Recargar página</Button>
    </main>
  )
}
