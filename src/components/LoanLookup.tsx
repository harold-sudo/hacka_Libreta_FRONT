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
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-200">Pruebas de pago confirmadas</h4>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Cuota</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">receiptHash</th>
              <th className="px-3 py-2 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {proofs.map((p) => (
              <tr key={p.installmentNumber} className="text-slate-300">
                <td className="px-3 py-2 font-mono text-xs">#{p.installmentNumber}</td>
                <td className="px-3 py-2 text-xs">{formatTimestamp(p.timestamp)}</td>
                <td className="px-3 py-2">
                  <StatusPill
                    dot={false}
                    tone={
                      p.isDigital
                        ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                        : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                    }
                  >
                    {p.isDigital ? 'Digital' : 'Efectivo'}
                  </StatusPill>
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-violet-300">
                  {shortenBytes(p.receiptHash)}
                </td>
                <td className="px-3 py-2">
                  {p.externalTxHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? (
                    <a
                      href={txExplorerUrl(p.externalTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-emerald-300 hover:underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function shortenBytes(value: string): string {
  return `${value.slice(0, 12)}…${value.slice(-8)}`
}