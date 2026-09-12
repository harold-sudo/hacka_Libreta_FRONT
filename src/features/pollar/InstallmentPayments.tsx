import { useRef, useState } from 'react'
import { usePollar } from '@pollar/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Field } from '../../components/ui/primitives'
import { httpClient, HttpError } from '../../lib/httpClient'

import { useAuthStore } from '../auth/stores/authStore'
import { useSettlements, type Intent } from './useSettlements'

type Envelope<T> = { success: boolean; data: T }
const post = async <T,>(path: string, body: unknown) => (await httpClient.post<Envelope<T>>(path, body)).data
const base = '/api/pollar/settlements'
const loanSchema = z.object({
  borrowerId: z.uuid(), borrowerWalletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  capital: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => Number(v) > 0),
  installmentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => Number(v) > 0),
  totalInstallments: z.string().regex(/^\d+$/).refine(v => Number(v) >= 1 && Number(v) <= 52),
  startDate: z.string().min(10),
})

// Only opaque intent ids and public transaction hashes are persisted. Never session tokens.
function rememberedHash(id: string): string | null {
  try { return localStorage.getItem(`libreta:pollar:attempt:${id}`) } catch { return null }
}
function remember(id: string, hash: string) {
  try { localStorage.setItem(`libreta:pollar:attempt:${id}`, hash) } catch { /* Current screen still retains the attempt. */ }
}

export function InstallmentPayments() {
  const pollar = usePollar()
  const cache = useQueryClient()
  const { user, openLoginModal } = useAuthStore()
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Intent | null>(null)
  const [hash, setHash] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [rejected, setRejected] = useState(false)
  const sendLock = useRef(false)
  const loanForm = useForm<z.infer<typeof loanSchema>>({ resolver: zodResolver(loanSchema), defaultValues: { startDate: new Date().toISOString().slice(0, 10) } })
  const snapshot = useSettlements()
  const update = () => cache.invalidateQueries({ queryKey: ['settlements'] })
  const action = useMutation({ mutationFn: async (fn: () => Promise<void>) => { setNotice(''); await fn() },
    onError: (error) => setNotice(error.message), onSuccess: () => void update(), retry: false })
  const current = snapshot.data?.intents.find(i => i.id === selected?.id) ?? selected
  const sender = pollar.wallet?.address
  function select(intent: Intent) {
    const stored = rememberedHash(intent.id)
    setSelected(intent); setHash(intent.tx_hash ?? stored ?? ''); setAttempted(stored !== null || !!intent.tx_hash); setRejected(false); setNotice('')
  }
  async function report(intent: Intent, txHash: string) {
    if (!/^[a-fA-F0-9]{64}$/.test(txHash)) throw new Error('Introduce el hash Stellar de 64 caracteres, sin 0x.')
    remember(intent.id, txHash)
    setHash(txHash); setAttempted(true)
    const result = await post<Intent>(`${base}/intents/${intent.id}/confirm`, { transactionHash: txHash })
    setSelected(result)
    setNotice(result.status === 'CREATED' ? 'Hash registrado. El servidor seguirá verificando aunque cierres esta pantalla.' : 'Pago conciliado. El anclaje HSK se procesa sin volver a transferir USDC.')
  }
  async function pay() {
    if (sendLock.current || !current || current.status !== 'CREATED' || attempted) return
    if (rememberedHash(current.id) !== null) { setAttempted(true); throw new Error('Ya existe un intento de envío. Recupera y verifica su hash sin volver a pagar.') }
    if (!navigator.onLine || !pollar.verified || pollar.network !== 'testnet') throw new Error('Conecta tu wallet en Stellar testnet y comprueba la conexión.')
    if (pollar.getClient().getWallet()?.address !== current.sender) throw new Error('Conecta la wallet de origen de esta intención.')
    sendLock.current = true
    remember(current.id, '')
    setAttempted(true)
    try {
      const result = await pollar.sendPayment({ chain: 'STELLAR', destination: current.recipient, amount: String(current.amount),
        asset: { type: 'credit_alphanum4', code: 'USDC', issuer: current.issuer } })
      if (result.hash) { remember(current.id, result.hash); setHash(result.hash) }
      if (result.status === 'error') {
        // Only a definitive pre-submission fee rejection permits another transfer attempt here.
        setRejected(result.code === 'TX_INSUFFICIENT_FEE' && !result.hash)
        throw new Error(`[${result.code ?? result.resultCode ?? 'POLLAR_ERROR'}] ${result.details ?? result.message ?? 'Consulta el historial antes de reintentar.'}`)
      }
      if (!result.hash) throw new Error('Envío de resultado incierto. Recupera el hash del historial; no repitas el pago.')
      await report(current, result.hash)
    } finally { sendLock.current = false }
  }
  return <div className="space-y-5">
    <p className="text-sm text-slate-300">Paga cuotas de prueba en USDC. El importe y el destinatario vienen de tu crédito; el backend verifica el pago y registra el comprobante en HSK testnet.</p>
    {!user ? <Button onClick={openLoginModal}>Iniciar sesión en CREDITCHAIN</Button> : <>
      {snapshot.isPending && <p>Cargando cuotas…</p>}
      {snapshot.error && <p className="text-sm text-amber-300">{snapshot.error.message}</p>}
      {snapshot.error instanceof HttpError && snapshot.error.status === 401 && <p>Tu sesión expiró. Cierra sesión e ingresa de nuevo; los pagos reportados siguen procesándose.</p>}
      {snapshot.data && <>
        <p className="break-all text-xs text-slate-400">Perfil: {snapshot.data.profile.id} · {snapshot.data.profile.role}<br />Wallet HSK: {snapshot.data.profile.wallet_address}</p>
        <Button type="button" disabled={pollar.isAuthenticated || action.isPending} onClick={pollar.openLoginModal}>Conectar wallet Pollar</Button>
        {pollar.isAuthenticated && <Button type="button" variant="outline" disabled={action.isPending} onClick={pollar.openTxHistoryModal}>Historial Pollar</Button>}
        {pollar.isAuthenticated && <Button type="button" variant="ghost" disabled={action.isPending} onClick={pollar.logout}>Desconectar wallet Pollar</Button>}
        {sender && <p className="break-all text-xs text-slate-400">Wallet Stellar: {sender}</p>}
        {snapshot.data.profile.role === 'LENDER' && <div className="space-y-4 rounded-xl border border-white/10 p-4">
          <p className="break-all text-sm">Wallet de cobro: {snapshot.data.receivingAddress ?? 'Sin configurar'}</p>
          <Button type="button" disabled={!pollar.verified || !sender?.startsWith('G') || pollar.network !== 'testnet' || action.isPending} onClick={() => action.mutate(async () => { await post(`${base}/receiving-wallet`, { address: sender }) })}>Usar mi wallet conectada para cobrar</Button>
          <details><summary className="cursor-pointer text-violet-300">Crear crédito de prueba en HSK y Supabase</summary>
            <form className="mt-3 space-y-3" onSubmit={loanForm.handleSubmit(data => action.mutate(async () => {
              await httpClient.post('/api/loans', { ...data, capital: Number(data.capital), installmentAmount: Number(data.installmentAmount), totalInstallments: Number(data.totalInstallments), currency: 'USDC', frequency: 'WEEKLY', settlementNetwork: 'stellar:testnet' })
              setNotice('Crédito registrado. El prestatario ya puede consultar sus cuotas.')
            }))}>
              <Field label="ID del perfil del prestatario" {...loanForm.register('borrowerId')} error={loanForm.formState.errors.borrowerId?.message} />
              <Field label="Wallet HSK del prestatario" {...loanForm.register('borrowerWalletAddress')} error={loanForm.formState.errors.borrowerWalletAddress?.message} />
              <Field label="Capital USDC" {...loanForm.register('capital')} error={loanForm.formState.errors.capital?.message} />
              <Field label="Número de cuotas" {...loanForm.register('totalInstallments')} error={loanForm.formState.errors.totalInstallments?.message} />
              <Field label="USDC por cuota" {...loanForm.register('installmentAmount')} error={loanForm.formState.errors.installmentAmount?.message} />
              <Field label="Primer vencimiento" type="date" {...loanForm.register('startDate')} error={loanForm.formState.errors.startDate?.message} />
              <Button loading={action.isPending}>Registrar crédito de prueba</Button>
            </form>
          </details>
        </div>}
        {!snapshot.data.loans.length && <p className="text-sm text-slate-400">Todavía no tienes créditos en Supabase. Comparte tu ID de perfil y dirección HSK con el prestamista para registrar uno.</p>}
        {snapshot.data.loans.map(loan => <div key={loan.id} className="space-y-3 rounded-xl border border-white/10 p-4">
          <p className="break-all text-xs text-slate-400">Crédito {loan.id} · {loan.currency} · {loan.settlement_network ?? 'Sin liquidación Pollar'}</p>
          {loan.hsk_verification !== 'VERIFIED' && <p className="text-amber-300">Crédito sin respaldo HSK verificado: {loan.hsk_verification === 'NOT_FOUND' ? 'no aparece en el contrato actual' : 'consulta no disponible'}.</p>}
          {[...loan.installments].sort((a, b) => a.installment_number - b.installment_number).map(i => {
            const intent = snapshot.data!.intents.find(item => item.installment_id === i.id)
            return <div key={i.id} className="flex flex-wrap items-center gap-3 text-sm"><span>Cuota {i.installment_number} · {i.amount} {loan.currency} · {i.status} · HSK {i.hsk_verified ? 'verificado' : 'sin verificar'}</span>
              {intent ? <Button type="button" variant="outline" disabled={action.isPending} onClick={() => select(intent)}>Ver pago</Button> : i.status !== 'PAID' && snapshot.data!.profile.role === 'BORROWER' && loan.settlement_network === 'stellar:testnet' && loan.hsk_verification === 'VERIFIED' && <Button type="button" disabled={!pollar.verified || !sender?.startsWith('G') || action.isPending} onClick={() => action.mutate(async () => { select(await post<Intent>(`${base}/installments/${i.id}/intent`, { address: sender })) })}>Preparar pago</Button>}
            </div>
          })}
        </div>)}
        {current && <div className="space-y-3 rounded-xl border border-violet-400/40 p-4 text-sm">
          <p>Importe: <strong>{current.amount} USDC de prueba</strong></p>
          <p className="break-all">Origen: {current.sender}</p><p className="break-all">Destinatario: {current.recipient}</p>
          <p>Estado: {current.status === 'CREATED' ? 'Esperando pago verificable' : current.status === 'VERIFIED' ? 'Cuota pagada · comprobante HSK pendiente' : 'Cuota pagada · comprobante HSK confirmado'}</p>
          {current.anchor_error && <p>El servidor reintentará el anclaje HSK. No vuelvas a pagar.</p>}
          {current.tx_hash && <a className="block text-violet-300 underline" href={`https://stellar.expert/explorer/testnet/tx/${current.tx_hash}`} target="_blank" rel="noreferrer">Ver pago en Stellar</a>}
          {current.receipt_hash && <p className="break-all">Comprobante: {current.receipt_hash}</p>}
          {current.hsk_tx_hash && <a className="block text-violet-300 underline" href={`https://testnet-explorer.hsk.xyz/tx/${current.hsk_tx_hash}`} target="_blank" rel="noreferrer">Ver comprobante en HSK</a>}
          {current.status === 'CREATED' && snapshot.data.profile.role === 'BORROWER' && <>
            <Button type="button" loading={action.isPending} disabled={attempted || sender !== current.sender || !pollar.verified} onClick={() => action.mutate(pay)}>Confirmar y pagar esta cuota</Button>
            {attempted && <p>Existe un intento de envío. Revisa el historial y verifica su hash antes de considerar otro pago.</p>}
            {rejected && <Button type="button" variant="outline" disabled={action.isPending} onClick={() => { setAttempted(false); setRejected(false); try { localStorage.removeItem(`libreta:pollar:attempt:${current.id}`) } catch { /* in-memory retry */ } }}>Ya corregí el saldo del envío rechazado</Button>}
            <Field label="Hash del pago (recuperar o volver a verificar)" value={hash} onChange={e => setHash(e.target.value.trim())} />
            <Button type="button" variant="outline" loading={action.isPending} onClick={() => action.mutate(() => report(current, hash))}>Verificar sin volver a pagar</Button>
          </>}
        </div>}
      </>}
    </>}
    <p role="status" className="break-words text-sm text-amber-200">{notice}</p>
  </div>
}
