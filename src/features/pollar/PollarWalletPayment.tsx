import { PollarProvider, usePollar } from '@pollar/react'
import '@pollar/react/styles.css'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { httpClient } from '../../lib/httpClient'
import { Button, Field } from '../../components/ui/primitives'
import { InstallmentPayments } from './InstallmentPayments'

const schema = z.object({
  recipient: z.string().trim().regex(/^G[A-Z2-7]{55}$/, 'Ingresa una dirección Stellar que empiece por G.'),
  amount: z.string().trim().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,7})?$/, 'Usa un importe decimal con punto, hasta 7 decimales.')
    .refine((value) => Number(value) > 0, 'El importe debe ser mayor que cero.'),
})
type Input = z.infer<typeof schema>
type Config = { network: 'testnet'; configured: boolean; assetIssuer: string }
type Evidence = { transactionHash: string; sender: string; recipient: string; amount: string }
type Proof = { status: 'PENDING' | 'VERIFIED'; transactionHash: string; receiptHash?: string; explorerUrl?: string }
type Envelope<T> = { success: boolean; data: T }

export default function PollarWalletPayment({ apiKey }: { apiKey: string }) {
  const [mode, setMode] = useState<'quota' | 'free'>('quota')
  const client = useMemo(() => ({ apiKey, stellarNetwork: 'testnet' as const }), [apiKey])
  return <PollarProvider client={client}>
    <div className="mb-4 flex gap-2"><Button type="button" variant={mode === 'quota' ? 'primary' : 'outline'} onClick={() => setMode('quota')}>Cuotas de mi libreta</Button><Button type="button" variant={mode === 'free' ? 'primary' : 'outline'} onClick={() => setMode('free')}>Transferencia libre</Button></div>
    <div hidden={mode !== 'quota'}><InstallmentPayments /></div>
    <div hidden={mode !== 'free'}><PaymentForm /></div>
  </PollarProvider>
}

function PaymentForm() {
  const pollar = usePollar()
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [recoveryHash, setRecoveryHash] = useState('')
  const [message, setMessage] = useState('')
  const config = useQuery({
    queryKey: ['pollar', 'config'],
    queryFn: async () => (await httpClient.get<Envelope<Config>>('/api/pollar/config')).data,
    retry: false,
  })
  const form = useForm<Input>({ resolver: zodResolver(schema), defaultValues: { amount: '1', recipient: '' } })
  // SDK 0.11.3 sends Stellar payments from its active session wallet.
  // Selecting another entry from wallets[] could display the wrong sender.
  const wallet = pollar.wallet
  const sender = wallet?.address
  const verify = useMutation({
    mutationFn: async (payment: Evidence) => (await httpClient.post<Envelope<Proof>>('/api/pollar/verify', payment)).data,
    retry: false,
  })
  const send = useMutation({
    retry: false,
    mutationFn: async (input: Input) => {
      if (!navigator.onLine) throw new Error('Necesitas conexión para pagar con Pollar.')
      if (!pollar.verified || !sender?.match(/^G[A-Z2-7]{55}$/)) throw new Error('Conecta y verifica una wallet Stellar.')
      if (pollar.network !== 'testnet' || !config.data?.configured) throw new Error('Revisa la configuración de testnet.')
      if (pollar.getClient().getWallet()?.address !== sender) throw new Error('La wallet de la sesión cambió. Revisa el origen y vuelve a intentarlo.')
      if (input.recipient === sender) throw new Error('El destinatario debe ser otra wallet.')
      setMessage('Confirma el envío en tu wallet. No cierres esta pantalla.')
      const result = await pollar.sendPayment({
        chain: 'STELLAR', destination: input.recipient, amount: input.amount,
        asset: { type: 'credit_alphanum4', code: 'USDC', issuer: config.data.assetIssuer },
      })
      if (result.status === 'error') {
        // A failed transaction can also have a hash. Keep it for investigation,
        // but do not describe it as a successful submission.
        if (result.hash) {
          setEvidence({ ...input, sender, transactionHash: result.hash })
          setRecoveryHash(result.hash)
        }
        const diagnostic = [result.code, result.resultCode].filter(Boolean).join(' / ')
        const detail = result.details || result.message || 'Pollar rechazó la transacción.'
        const hint = result.code === 'TX_INSUFFICIENT_FEE' || result.resultCode === 'tx_insufficient_balance'
          ? ' Comprueba el XLM disponible de la dirección de origen mostrada arriba en Stellar testnet. Si tiene saldo suficiente, revisa con Pollar qué cuenta paga las comisiones; el saldo de la wallet de la aplicación no es el saldo de tu wallet.'
          : ' Revisa el historial antes de volver a enviar.'
        throw new Error(`${diagnostic ? `[${diagnostic}] ` : ''}${detail}${hint}`)
      }
      if (result.hash) {
        const payment = { ...input, sender, transactionHash: result.hash }
        setEvidence(payment)
        setRecoveryHash(result.hash)
        setMessage('Transacción enviada. Puedes verificarla de nuevo sin repetir el pago.')
        return payment
      }
      throw new Error('Pollar no devolvió un hash. Revisa el historial antes de reintentar.')
    },
    onSuccess: (payment) => verify.mutate(payment),
    onError: (error) => setMessage(error.message),
  })

  function recover(input: Input) {
    if (!sender || !/^[a-fA-F0-9]{64}$/.test(recoveryHash.trim())) {
      setMessage('Conecta la wallet de origen e ingresa el hash Stellar de 64 caracteres.')
      return
    }
    const payment = { ...input, sender, transactionHash: recoveryHash.trim() }
    setEvidence(payment)
    verify.mutate(payment)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={pollar.openLoginModal} disabled={pollar.isAuthenticated}>Conectar wallet Pollar</Button>
        {pollar.isAuthenticated && <Button type="button" variant="outline" onClick={pollar.openTxHistoryModal}>Historial</Button>}
        {pollar.isAuthenticated && <Button type="button" variant="ghost" onClick={pollar.logout} disabled={send.isPending}>Desconectar</Button>}
      </div>
      {sender && <p className="break-all font-mono text-xs text-slate-400">Origen: {sender}</p>}
      {sender?.match(/^G[A-Z2-7]{55}$/) && <a href={`https://stellar.expert/explorer/testnet/account/${sender}`} target="_blank" rel="noreferrer" className="block text-sm text-violet-300 underline">Ver saldo de esta wallet en Stellar testnet</a>}
      {pollar.configStatus === 'error' && <Button type="button" variant="outline" onClick={pollar.retryConfig}>Reintentar conexión a Pollar</Button>}
      {pollar.network !== 'testnet' && <p className="text-sm text-rose-300">Selecciona testnet en Pollar para continuar.</p>}
      {config.isPending && <p className="text-sm text-slate-400">Consultando configuración del backend…</p>}
      {config.isError && <div className="text-sm text-rose-300"><p>No se pudo conectar con el backend. Revisa VITE_API_URL y que NestJS esté iniciado.</p><Button type="button" variant="outline" onClick={() => void config.refetch()}>Reintentar</Button></div>}
      {config.data && !config.data.configured && <p className="text-sm text-amber-300">Configura POLLAR_TESTNET_USDC_ISSUER en el backend con el emisor USDC habilitado en tu aplicación Pollar.</p>}
      <form onSubmit={form.handleSubmit((input) => send.mutate(input))} className="space-y-4">
        <fieldset disabled={send.isPending || !!evidence} className="space-y-4">
          <Field label="Wallet de destino" placeholder="G…" {...form.register('recipient')} error={form.formState.errors.recipient?.message} />
          <Field label="Importe en USDC de prueba" inputMode="decimal" {...form.register('amount')} error={form.formState.errors.amount?.message} />
        </fieldset>
        <Button type="submit" loading={send.isPending} disabled={!pollar.verified || !config.data?.configured || pollar.network !== 'testnet' || !!evidence}>Enviar USDC de prueba</Button>
      </form>
      <div className="space-y-2 border-t border-white/10 pt-4">
        <Field label="Hash para verificar un pago enviado" value={recoveryHash} onChange={(event) => setRecoveryHash(event.target.value)} disabled={send.isPending || !!evidence} hint="Si recargas la página, recupera el hash del historial e ingresa el mismo destino e importe." />
        <Button type="button" variant="outline" loading={verify.isPending} disabled={send.isPending} onClick={evidence ? () => verify.mutate(evidence) : form.handleSubmit(recover)}>Verificar sin volver a pagar</Button>
      </div>
      <div aria-live="polite" className="space-y-2 text-sm text-slate-300">
        {message && <p>{message}</p>}
        {evidence && <p className="break-all font-mono text-xs">Hash: {evidence.transactionHash}</p>}
        {verify.error && <p className="text-rose-300">{verify.error.message}</p>}
        {verify.data?.status === 'PENDING' && <p>Stellar aún no muestra la transacción. Reintenta la verificación en unos segundos.</p>}
        {verify.data?.status === 'VERIFIED' && <div className="space-y-2 text-emerald-300"><p>Pago de prueba verificado por el backend.</p><a href={verify.data.explorerUrl} target="_blank" rel="noreferrer" className="underline">Ver en Stellar Explorer</a><p className="break-all font-mono text-xs">Comprobante: {verify.data.receiptHash}</p></div>}
      </div>
    </div>
  )
}
