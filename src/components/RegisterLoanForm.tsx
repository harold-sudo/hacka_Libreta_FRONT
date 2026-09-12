import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useState } from 'react'
import { useWalletStore } from '../features/wallet/walletStore'
import { invalidateLoan, useRegisterLoan } from '../features/loans/useLoanRegistry'
import { userFriendlyError } from '../lib/web3/contract'
import { hashText } from '../lib/web3/utils'
import { Button, Card, CodeText, Field } from './ui/primitives'
import { TransactionStatus, type TxStatus } from './TransactionStatus'

const registerLoanSchema = z.object({
  loanId: z
    .string()
    .trim()
    .min(1, 'El loanId es obligatorio.'),
  loanHash: z
    .string()
    .trim()
    .min(1, 'El loanHash es obligatorio.'),
  borrower: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección EVM inválida (debe ser 0x + 40 hex).'),
  totalInstallments: z
    .string()
    .trim()
    .min(1, 'El total de cuotas es obligatorio.')
    .regex(/^\d+$/, 'Solo números enteros'),
})

type RegisterLoanInput = z.infer<typeof registerLoanSchema>

export function RegisterLoanForm() {
  const isConnected = useWalletStore((s) => s.isConnected)
  const queryClient = useQueryClient()
  const mutation = useRegisterLoan()
  const [status, setStatus] = useState<TxStatus>({ kind: 'idle' })

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RegisterLoanInput>({
    resolver: zodResolver(registerLoanSchema),
    mode: 'onBlur',
    defaultValues: { loanId: '', loanHash: '', borrower: '', totalInstallments: '12' },
  })

  const loanIdPreview = toBytes32Preview(useWatch<RegisterLoanInput>({ control, name: 'loanId' }))
  const loanHashPreview = toBytes32Preview(
    useWatch<RegisterLoanInput>({ control, name: 'loanHash' }),
  )

  function generateIds() {
    setValue('loanId', hashText(`loan-${Date.now()}-${crypto.randomUUID()}`), {
      shouldValidate: true,
    })
    setValue('loanHash', hashText(`lh-${crypto.randomUUID()}`), {
      shouldValidate: true,
    })
  }

  async function onSubmit(data: RegisterLoanInput) {
    setStatus({ kind: 'idle' })
    if (!isConnected) {
      setStatus({ kind: 'error', message: 'Conecta tu wallet para firmar la transacción.' })
      return
    }
    const params = {
      loanId: data.loanId,
      loanHash: data.loanHash,
      borrower: data.borrower,
      totalInstallments: Number(data.totalInstallments),
    }
    setStatus({ kind: 'pending', label: 'Esperando firma en MetaMask…' })
    try {
      const { tx } = await mutation.mutateAsync(params)
      setStatus({
        kind: 'pending',
        label: 'Transacción enviada · esperando confirmación en HSK Chain…',
      })
      const receipt = await tx.wait()
      invalidateLoan(queryClient, data.loanId)
      setStatus({ kind: 'success', txHash: receipt?.hash ?? tx.hash })
    } catch (error) {
      setStatus({ kind: 'error', message: userFriendlyError(error) })
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Anclar nuevo microcrédito</h3>
          <p className="text-sm text-slate-400">
            Registra el crédito en <CodeText>LibretaRegistry.registerLoan</CodeText>. Sin datos
            personales on-chain (
            <span className="text-slate-500">Zero PII</span>).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={generateIds}>
          Generar IDs
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="loanId"
            hint={loanIdPreview ? `keccak256 → ${loanIdPreview}` : 'Texto plano o 0x-hex bytes32'}
            {...register('loanId')}
            error={errors.loanId?.message}
            placeholder="ej. loan-abc123"
          />
          <Field
            label="loanHash"
            hint={loanHashPreview ? `keccak256 → ${loanHashPreview}` : 'Hash criptográfico del contrato'}
            {...register('loanHash')}
            error={errors.loanHash?.message}
            placeholder="0x… o texto que se hashea"
          />
        </div>

        <Field
          label="Prestatario (_borrower)"
          {...register('borrower')}
          error={errors.borrower?.message}
          placeholder="0x…"
        />

        <Field
          label="Total de cuotas (_totalInstallments)"
          type="number"
          min={1}
          max={65535}
          {...register('totalInstallments')}
          error={errors.totalInstallments?.message}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={mutation.isPending}
          disabled={!isConnected}
        >
          {mutation.isPending ? 'Enviando…' : 'Registrar Crédito'}
        </Button>
      </form>

      <TransactionStatus status={status} />
    </Card>
  )
}

function toBytes32Preview(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const hash = hashText(value.trim())
    return hash.length > 22 ? `${hash.slice(0, 22)}…` : hash
  } catch {
    return null
  }
}