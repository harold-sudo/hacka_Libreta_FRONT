import { useCallback, useState, type ReactNode } from 'react'
import { CONTRACT_IS_CONFIGURED, txExplorerUrl } from '../lib/web3/config'
import { useLoanProofsQuery, useLoanQuery } from '../features/loans/useLoanRegistry'
import { formatTimestamp, hashText, shortenAddress } from '../lib/web3/utils'
import { statusLabel, statusTone, type PaymentProof } from '../lib/web3/abi'
import { Button, Card, CodeText, Field, Spinner, StatusPill } from './ui/primitives'

export function LoanLookup() {
  const [input, setInput] = useState('')
  const [loanId, setLoanId] = useState('')

  const loanQuery = useLoanQuery(loanId)
  const proofsQuery = useLoanProofsQuery(loanId)

  const submit = useCallback(() => {
    if (!input.trim()) return
    setLoanId(input.trim())
  }, [input])

  const isSearching = loanId.length > 0

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-100">Consultar microcrédito on-chain</h3>
        <p className="text-sm text-slate-400">
          Lee el estado del préstamo y sus pruebas de pago directamente del contrato con{' '}
          <CodeText>loans()</CodeText> y <CodeText>getLoanProofs()</CodeText>.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Loan ID"
          className="flex-1"
          placeholder="Texto plano o 0x-hex bytes32"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        <Button onClick={submit} disabled={!input.trim()}>
          Consultar
        </Button>
      </div>

      {!CONTRACT_IS_CONFIGURED && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          El contrato no está configurado: define <CodeText>VITE_HSK_CONTRACT_ADDRESS</CodeText> en
          tu archivo <CodeText>.env</CodeText>.
        </p>
      )}

      {isSearching && (loanQuery.isPending || proofsQuery.isPending) && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <Spinner className="size-4 text-violet-300" />
          Leyendo el estado del préstamo desde HSK Chain…
        </div>
      )}

      {isSearching && loanQuery.isError && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          No se pudo consultar: {loanQuery.error?.message ?? 'error desconocido'}
        </p>
      )}

      {loanQuery.isSuccess && loanQuery.data.exists && (
        <LoanDetail
          loanId={loanId}
          loanHash={loanQuery.data.loan.loanHash}
          lender={loanQuery.data.loan.lender}
          borrower={loanQuery.data.loan.borrower}
          totalInstallments={loanQuery.data.loan.totalInstallments}
          paidInstallments={loanQuery.data.loan.paidInstallments}
          status={loanQuery.data.loan.status}
          createdAt={loanQuery.data.loan.createdAt}
          completedAt={loanQuery.data.loan.completedAt}
          isRefetching={
            loanQuery.isRefetching ||
            (proofsQuery.isSuccess && proofsQuery.isRefetching)
          }
          onRefresh={() => {
            void loanQuery.refetch()
            void proofsQuery.refetch()
          }}
        />
      )}

      {loanQuery.isSuccess && !loanQuery.data.exists && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          No se encontró un préstamo con <CodeText>{hashText(loanId).slice(0, 18)}…</CodeText>.
          Verifica el Loan ID o regístralo en la pestaña «Registrar Crédito».
        </p>
      )}

      {proofsQuery.isSuccess && proofsQuery.data.length > 0 && (
        <ProofTable proofs={proofsQuery.data} />
      )}
    </Card>
  )
}

export function LoanDetail(props: {
  loanId: string
  loanHash: string
  lender: string
  borrower: string
  totalInstallments: number
  paidInstallments: number
  status: number
  createdAt: bigint
  completedAt: bigint
  isRefetching: boolean
  onRefresh: () => void
}) {
  const progress =
    props.totalInstallments > 0
      ? Math.round((props.paidInstallments / props.totalInstallments) * 100)
      : 0

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusPill tone={statusTone(props.status)}>{statusLabel(props.status)}</StatusPill>
          <span className="text-xs text-slate-500">
            {props.paidInstallments}/{props.totalInstallments} cuotas pagadas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={props.onRefresh} loading={props.isRefetching}>
            Refrescar
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="loanHash">
          <CodeText>{shortenBytes(props.loanHash)}</CodeText>
        </Row>
        <Row label="Prestamista (lender)">
          <CodeText>{shortenAddress(props.lender)}</CodeText>
        </Row>
        <Row label="Prestatario (borrower)">
          <CodeText>{shortenAddress(props.borrower)}</CodeText>
        </Row>
        <Row label="Registrado">
          <span className="text-slate-300">{formatTimestamp(props.createdAt)}</span>
        </Row>
        <Row label="Finalizado">
          <span className="text-slate-300">
            {props.completedAt > 0n ? formatTimestamp(props.completedAt) : '—'}
          </span>
        </Row>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>Avance del cronograma</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span>{children}</span>
    </div>
  )
}

export function ProofTable({ proofs }: { proofs: PaymentProof[] }) {
  const [selected, setSelected] = useState<PaymentProof | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">
          Pruebas de pago confirmadas ({proofs.length})
        </h4>
        <span className="text-xs text-slate-500">
          Haz clic en cualquier cuota para auditar la prueba completa
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">Cuota</th>
              <th className="px-3 py-2.5 font-medium">Fecha y Hora</th>
              <th className="px-3 py-2.5 font-medium">Método</th>
              <th className="px-3 py-2.5 font-medium">receiptHash</th>
              <th className="px-3 py-2.5 font-medium">Tx HSK</th>
              <th className="px-3 py-2.5 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {proofs.map((p) => (
              <tr
                key={p.installmentNumber}
                className="cursor-pointer text-slate-300 transition-colors hover:bg-white/[0.03]"
                onClick={() => setSelected(p)}
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-200">
                  #{p.installmentNumber}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-300">
                  {formatTimestamp(p.timestamp)}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill
                    dot={false}
                    tone={
                      p.isDigital
                        ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                        : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                    }
                  >
                    {p.isDigital ? 'Digital (Pollar)' : 'Efectivo'}
                  </StatusPill>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-violet-300">
                  <span title={p.receiptHash}>{shortenBytes(p.receiptHash)}</span>
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  {p.hskTxHash ? (
                    <a
                      href={txExplorerUrl(p.hskTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-emerald-300 hover:underline"
                    >
                      <span>{p.hskTxHash.slice(0, 8)}…{p.hskTxHash.slice(-6)}</span>
                      <span className="text-[10px]">↗</span>
                    </a>
                  ) : p.externalTxHash && p.externalTxHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
                    <span className="font-mono text-xs text-slate-400" title="Hash de liquidación externa anclado">
                      {p.externalTxHash.slice(0, 8)}…
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">On-Chain</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(p)}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    Ver detalles
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle Forense */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-hidden
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-xl space-y-5 rounded-2xl border border-white/10 bg-[#0c101d] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Expediente Forense · Cuota #{selected.installmentNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Prueba criptográfica sellada en el registro inmutable de HSK Chain
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Método de Liquidación
                </span>
                <StatusPill
                  tone={
                    selected.isDigital
                      ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                      : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                  }
                >
                  {selected.isDigital
                    ? '1 USDC Digital (Pollar · Stellar)'
                    : 'Efectivo bilateral (Atestación mutua)'}
                </StatusPill>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Fecha y Hora de Sellado
                </span>
                <div className="text-right">
                  <p className="text-slate-200">{formatTimestamp(selected.timestamp)}</p>
                  <p className="font-mono text-xs text-slate-500">
                    UNIX: {selected.timestamp.toString()}
                    {selected.blockNumber ? ` · Bloque #${selected.blockNumber}` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400">
                    Comprobante Criptográfico (receiptHash)
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(selected.receiptHash, 'receipt')}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    {copiedKey === 'receipt' ? '✓ ¡Copiado!' : 'Copiar hash'}
                  </button>
                </div>
                <p className="break-all font-mono text-xs text-violet-300">
                  {selected.receiptHash}
                </p>
                <p className="text-[11px] text-slate-500">
                  keccak256(loanId, installmentNumber, amountHash, timestamp)
                </p>
              </div>

              {selected.hskTxHash && (
                <div className="space-y-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.04] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-emerald-300">
                      Transacción On-Chain (HSK Chain)
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(selected.hskTxHash!, 'hsk')}
                      className="text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      {copiedKey === 'hsk' ? '✓ ¡Copiado!' : 'Copiar hash'}
                    </button>
                  </div>
                  <p className="break-all font-mono text-xs text-emerald-200">
                    {selected.hskTxHash}
                  </p>
                  <div className="pt-1">
                    <a
                      href={txExplorerUrl(selected.hskTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                    >
                      <span>Abrir en HSK Explorer</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              )}

              {selected.externalTxHash &&
                selected.externalTxHash !==
                  '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                  <div className="space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-slate-400">
                        Huella Externa (Stellar Pollar / Settlement)
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(selected.externalTxHash, 'ext')}
                        className="text-xs text-violet-300 hover:text-violet-200"
                      >
                        {copiedKey === 'ext' ? '✓ ¡Copiado!' : 'Copiar hash'}
                      </button>
                    </div>
                    <p className="break-all font-mono text-xs text-slate-300">
                      {selected.externalTxHash}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Anclado en HSK Chain como evidencia probatoria sin exposición de datos personales.
                    </p>
                  </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function shortenBytes(value: string): string {
  if (!value || value.length <= 20) return value
  return `${value.slice(0, 10)}…${value.slice(-8)}`
}