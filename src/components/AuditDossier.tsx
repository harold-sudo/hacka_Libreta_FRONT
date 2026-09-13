import { useCallback, useState } from 'react'
import { ZeroAddress, isAddress } from 'ethers'
import { useWalletStore } from '../features/wallet/walletStore'
import { useUnlockLockInfo, useUnlockMembership } from '../features/unlock/useUnlock'
import { usePurchaseUnlockKey } from '../features/unlock/usePurchaseUnlockKey'
import { useBorrowerForensic } from '../features/loans/useBorrowerForensic'
import { HSK_MAINNET, HSK_TESTNET } from '../lib/web3/chains'
import {
  UNLOCK_IS_CONFIGURED,
  UNLOCK_LOCK_NAME,
  UNLOCK_NETWORK,
  unlockNativeSymbol,
  unlockTxExplorerUrl,
} from '../lib/web3/unlock/config'
import type { UnlockMembership } from '../lib/web3/unlock/unlockContract'
import { formatHsk, formatTimestamp } from '../lib/web3/utils'
import { Button, Card, CodeText, Field, Spinner } from './ui/primitives'
import { TransactionStatus, type TxStatus } from './TransactionStatus'
import { UnlockCheckoutModal } from './UnlockCheckoutModal'
import { LoanDetail, ProofTable } from './LoanLookup'

/**
 * Auditoría de Crédito · Reporte Token-Gated (Bounty Unlock Protocol).
 * Bloquea el historial forense completo (getLoanProofs) tras una Key NFT activa
 * en el contrato PublicLock de Unlock Protocol.
 */
export function AuditDossier() {
  const isConnected = useWalletStore((s) => s.isConnected)
  const address = useWalletStore((s) => s.address)
  const connect = useWalletStore((s) => s.connect)
  const isConnecting = useWalletStore((s) => s.isConnecting)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const membership = useUnlockMembership(isConnected ? (address ?? null) : null)
  const lockInfo = useUnlockLockInfo()
  const refetchMembership = membership.refetch

  const handleTransaction = useCallback(() => {
    setCheckoutOpen(false)
    void refetchMembership()
  }, [refetchMembership])

  const handleAcquired = useCallback(() => {
    void refetchMembership()
  }, [refetchMembership])

  const hasValidKey =
    membership.isSuccess && membership.data.hasValidKey

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-100">
          Auditoría de Crédito · Reporte Token-Gated
        </h3>
        <p className="text-sm text-slate-400">
          Verifica tu membresía NFT en el <CodeText>PublicLock</CodeText> de Unlock Protocol para
          desbloquear el expediente forense completo ({' '}
          <CodeText>getLoanProofs</CodeText>{' '}).
        </p>
      </div>

      {!UNLOCK_IS_CONFIGURED && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          El Lock no está configurado: define <CodeText>VITE_UNLOCK_LOCK_ADDRESS</CodeText> y{' '}
          <CodeText>VITE_UNLOCK_NETWORK</CodeText> en tu archivo <CodeText>.env</CodeText>.
        </p>
      )}

      {UNLOCK_IS_CONFIGURED && !isConnected && (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Conecta tu wallet institucional</h4>
            <p className="text-xs text-slate-400">
              Necesitamos tu dirección para verificar la membresía de auditoría en la red{' '}
              {UNLOCK_NETWORK}.
            </p>
          </div>
          <Button size="lg" loading={isConnecting} onClick={() => void connect()}>
            {isConnecting ? 'Conectando…' : 'Conectar Wallet'}
          </Button>
        </div>
      )}

      {UNLOCK_IS_CONFIGURED && isConnected && membership.isPending && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <Spinner className="size-4 text-violet-300" />
          Verificando membresía en <CodeText>{UNLOCK_LOCK_NAME}</CodeText> ({UNLOCK_NETWORK})…
        </div>
      )}

      {UNLOCK_IS_CONFIGURED && isConnected && membership.isError && (
        <div className="space-y-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <p>
            No se pudo consultar el contrato de Unlock Protocol:{' '}
            {membership.error instanceof Error ? membership.error.message : 'error al conectar con el Lock'}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void refetchMembership()}>
            Reintentar verificación
          </Button>
        </div>
      )}

      {UNLOCK_IS_CONFIGURED && isConnected && hasValidKey && (
        <ForensicExplorer
          membership={membership.data}
          onRefresh={handleAcquired}
        />
      )}

      {UNLOCK_IS_CONFIGURED &&
        isConnected &&
        membership.isSuccess &&
        !membership.data.hasValidKey && (
          <MembershipGate
            address={address!}
            lockInfo={lockInfo}
            isOnHsk={
              UNLOCK_NETWORK === HSK_MAINNET.chainId ||
              UNLOCK_NETWORK === HSK_TESTNET.chainId
            }
            onAcquired={handleAcquired}
            onOpenCheckout={() => setCheckoutOpen(true)}
          />
        )}

      <UnlockCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onTransaction={handleTransaction}
      />
    </Card>
  )
}

function MembershipGate({
  address,
  lockInfo,
  isOnHsk,
  onAcquired,
  onOpenCheckout,
}: {
  address: string
  lockInfo: ReturnType<typeof useUnlockLockInfo>
  isOnHsk: boolean
  onAcquired: () => void
  onOpenCheckout: () => void
}) {
  const purchase = usePurchaseUnlockKey()
  const [status, setStatus] = useState<TxStatus>({ kind: 'idle' })

  const handlePurchase = async () => {
    setStatus({
      kind: 'pending',
      label: 'Comprando la Key. Confirma la transacción en MetaMask…',
    })
    try {
      // Espera la respuesta de la wallet (hash) antes de validar el estado.
      const tx = await purchase.mutateAsync(address)
      if (!tx || typeof tx.hash !== 'string' || tx.hash.length === 0) {
        throw new Error('No transaction hash returned. Failed to claim membership.')
      }
      setStatus({
        kind: 'pending',
        label: 'Membresía adquirida. Esperando confirmación on-chain…',
      })
      // Espera el minado/confirmación antes de renderizar el éxito.
      await tx.wait()
      setStatus({ kind: 'success', txHash: tx.hash })
      onAcquired()
    } catch (error) {
      // Log del error REAL en consola para depurar el fallo de claim.
      console.error('[AuditDossier] Fallo al comprar la membresía:', error)
      setStatus({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo comprar la membresía.',
      })
    }
  }

  const price = lockInfo.data?.keyPrice ?? 0n
  const isNativeToken = !lockInfo.data || lockInfo.data.tokenAddress === ZeroAddress

  return (
    <div className="space-y-4 rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.06] to-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🔒
        </span>
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-slate-100">Expediente bloqueado</h4>
          <p className="text-sm text-slate-300">
            Para visualizar el historial forense completo (
            <CodeText>getLoanProofs</CodeText>) necesitas una{' '}
            <b>membresía de auditoría activa</b> en el contrato{' '}
            <CodeText>PublicLock</CodeText> de Unlock Protocol.
          </p>
          {lockInfo.data && (
            <p className="text-xs text-slate-400">
              {price > 0n
                ? `Precio: ${formatHsk(price)} ${unlockNativeSymbol()}`
                : 'Membresía sin costo'}
              {lockInfo.data.expirationDuration > 0n
                ? ` · duración ${formatDuration(lockInfo.data.expirationDuration)}`
                : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isOnHsk && isNativeToken ? (
          <Button size="lg" loading={status.kind === 'pending'} onClick={() => void handlePurchase()}>
            Adquirir Membresía de Auditoría
          </Button>
        ) : (
          <Button size="lg" onClick={onOpenCheckout}>
            Adquirir Membresía de Auditoría
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onAcquired}>
          Volver a verificar
        </Button>
      </div>

      <TransactionStatus status={status} getExplorerUrl={unlockTxExplorerUrl} />
    </div>
  )
}

function ForensicExplorer({
  membership,
  onRefresh,
}: {
  membership: UnlockMembership
  onRefresh: () => void
}) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const forensic = useBorrowerForensic(query)

  const submit = useCallback(() => {
    if (!input.trim()) return
    setQuery(input.trim())
  }, [input])

  const expiresLabel =
    membership.expirationTimestamp > 0n
      ? formatTimestamp(membership.expirationTimestamp)
      : '—'

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.08] to-white/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🔓
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Expediente desbloqueado
              </p>
              <p className="text-xs text-emerald-300/80">
                Membresía activa
                {membership.tokenId ? ` · Key #${membership.tokenId}` : ''} · válida hasta{' '}
                {expiresLabel}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            Re-verificar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Loan ID o dirección del prestatario"
          className="flex-1"
          placeholder={
            isAddress(input.trim())
              ? '0x… (prestatario)'
              : 'Texto plano o 0x-hex bytes32'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        <Button onClick={submit} disabled={!input.trim()}>
          Generar expediente
        </Button>
      </div>

      {forensic.isPending && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <Spinner className="size-4 text-violet-300" />
          Leyendo el historial forense desde HSK Chain…
        </div>
      )}

      {forensic.isError && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          No se pudo generar el expediente:{' '}
          {forensic.error?.message ?? 'error desconocido'}
        </p>
      )}

      {forensic.isSuccess && forensic.data.loans.length === 0 && query && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          Sin resultados on-chain para{' '}
          {isAddress(query.trim()) ? (
            'esa dirección'
          ) : (
            <CodeText>{query}</CodeText>
          )}
          . Verifica el Loan ID o la dirección del prestatario.
        </p>
      )}

      {forensic.isSuccess &&
        forensic.data.loans.map(({ loan, proofs }) => (
          <div key={loan.loanId ?? loan.loanHash} className="space-y-4">
            <LoanDetail
              loanId={loan.loanId ?? ''}
              loanHash={loan.loanHash}
              lender={loan.lender}
              borrower={loan.borrower}
              totalInstallments={loan.totalInstallments}
              paidInstallments={loan.paidInstallments}
              status={loan.status}
              createdAt={loan.createdAt}
              completedAt={loan.completedAt}
              isRefetching={forensic.isRefetching}
              onRefresh={() => void forensic.refetch()}
            />
            {proofs.length > 0 ? (
              <ProofTable proofs={proofs} />
            ) : (
              <p className="text-xs text-slate-500">
                Este crédito aún no tiene pruebas de pago confirmadas.
              </p>
            )}
          </div>
        ))}
    </div>
  )
}

function formatDuration(seconds: bigint): string {
  const days = Number(seconds) / 86400
  if (days >= 365) return `${(days / 365).toFixed(1)} años`
  if (days >= 30) return `${Math.round(days / 30)} meses`
  return `${Math.round(days)} días`
}