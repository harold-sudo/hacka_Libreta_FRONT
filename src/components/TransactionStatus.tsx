import { cn } from '../lib/cn'
import { txExplorerUrl } from '../lib/web3/config'
import { Spinner } from './ui/primitives'

export type TxStatus =
  | { kind: 'idle' }
  | { kind: 'pending'; label: string }
  | { kind: 'success'; txHash: string }
  | { kind: 'error'; message: string }

export function TransactionStatus({
  status,
  className,
}: {
  status: TxStatus
  className?: string
}) {
  if (status.kind === 'idle') return null

  if (status.kind === 'pending') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100',
          className,
        )}
        role="status"
      >
        <Spinner className="size-4 text-violet-300" />
        <span>{status.label}</span>
      </div>
    )
  }

  if (status.kind === 'success') {
    return (
      <div
        className={cn(
          'rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100',
          className,
        )}
        role="status"
      >
        <div className="flex items-center gap-2 font-semibold text-emerald-300">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-400/20 text-xs">
            ✓
          </span>
          Transacción confirmada en HSK Chain
        </div>
        <a
          href={txExplorerUrl(status.txHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block truncate font-mono text-xs text-emerald-300/80 underline-offset-2 hover:text-emerald-200 hover:underline"
        >
          {status.txHash}
        </a>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100',
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 font-semibold text-rose-300">
        <span className="flex size-5 items-center justify-center rounded-full bg-rose-400/20 text-xs">
          !
        </span>
        Error en la transacción
      </div>
      <p className="mt-1 text-xs text-rose-200/90">{status.message}</p>
    </div>
  )
}