import { useEffect, useRef } from 'react'
import { buildUnlockCheckoutUrl } from '../lib/web3/unlock/config'
import { Button } from './ui/primitives'

const UNLOCK_CHECKOUT_ORIGIN = 'https://app.unlock-protocol.com'

/**
 * Modal del checkout oficial de Unlock Protocol (app.unlock-protocol.com/checkout).
 * Re-activa a través de postMessage los eventos del Paywall:
 * - cierra el modal cuando el checkout lo solicita,
 * - notifica a la UI cuando se envió/confirmó una venta para re-verificar la Key.
 */
export function UnlockCheckoutModal({
  open,
  onClose,
  onTransaction,
}: {
  open: boolean
  onClose: () => void
  onTransaction: () => void
}) {
  const url = buildUnlockCheckoutUrl()
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    notifiedRef.current = false

    const handleEvent = (event: MessageEvent) => {
      // Solo aceptamos mensajes del checkout oficial de Unlock Protocol.
      if (event.origin !== UNLOCK_CHECKOUT_ORIGIN) return
      const data = event.data as { type?: string } | undefined
      const type = data?.type ?? ''
      if (!type.startsWith('unlockProtocol.')) return
      if (type === 'unlockProtocol.closeModal') onClose()
      if (
        type === 'unlockProtocol.transactionSent' ||
        type === 'unlockProtocol.transactionConfirmed'
      ) {
        if (!notifiedRef.current) {
          notifiedRef.current = true
          onTransaction()
        }
      }
    }

    window.addEventListener('message', handleEvent)
    return () => window.removeEventListener('message', handleEvent)
  }, [open, onClose, onTransaction])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b101c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-slate-100">
            Comprar Membresía de Auditoría
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <iframe
          title="Unlock Protocol Checkout"
          src={url}
          className="h-[68vh] w-full bg-white"
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  )
}