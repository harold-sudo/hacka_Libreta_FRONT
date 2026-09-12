import { lazy, Suspense } from 'react'
import { Card } from '../../components/ui/primitives'

const ConnectedPayment = lazy(() => import('./PollarWalletPayment'))
const apiKey = import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY?.trim() ?? ''

export function PollarPayment() {
  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-100">Pagar con Pollar</h3>
        <p className="text-sm text-amber-300">Stellar testnet · USDC de prueba, sin valor real</p>
        <p className="mt-2 text-sm text-slate-400">
          Paga cuotas creadas para testnet o realiza una transferencia libre. Solo el flujo de cuotas concilia el crédito y ancla su comprobante en HSK.
        </p>
      </div>
      {!apiKey ? (
        <div className="space-y-3 text-sm text-slate-300">
          <p>Primero crea tu aplicación de testnet en Pollar y habilita Stellar y USDC.</p>
          <p>Agrega su clave publicable a VITE_POLLAR_PUBLISHABLE_KEY en .env.local y reinicia el frontend.</p>
          <a className="text-violet-300 underline" href="https://dashboard.pollar.xyz/" target="_blank" rel="noreferrer">Crear aplicación en Pollar</a>
        </div>
      ) : (
        <Suspense fallback={<p className="text-sm text-slate-400">Cargando wallet de Pollar…</p>}>
          <ConnectedPayment apiKey={apiKey} />
        </Suspense>
      )}
    </Card>
  )
}
