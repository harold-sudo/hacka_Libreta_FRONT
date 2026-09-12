import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useState } from 'react'
import { useWalletStore } from '../features/wallet/walletStore'
import { invalidateLoan, useConfirmPayment } from '../features/loans/useLoanRegistry'
import { userFriendlyError } from '../lib/web3/contract'
import { hashText } from '../lib/web3/utils'
import { Button, Card, CodeText, Field } from './ui/primitives'
import { TransactionStatus, type TxStatus } from './TransactionStatus'

const confirmPaymentSchema = z.object({
  loanId: z.string().trim().min(1, 'El loanId es obligatorio.'),
  installmentNumber: z
    .string()
    .trim()
    .min(1, 'El número de cuota es obligatorio.')
    .regex(/^\d+$/, 'Solo números enteros'),
  receiptHash: z.string().trim().min(1, 'El receiptHash es obligatorio.'),
  isDigital: z.boolean(),
  externalTxHash: z.string().trim().optional(),
})

type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>

export function ConfirmPaymentForm() {
  const isConnected = useWalletStore((s) => s.isConnected)
  const queryClient = useQueryClient()
  const mutation = useConfirmPayment()
  const [status, setStatus] = useState<TxStatus>({ kind: 'idle' })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ConfirmPaymentInput>({
    resolver: zodResolver(confirmPaymentSchema),
    mode: 'onBlur',
    defaultValues: {
      loanId: '',
      installmentNumber: '1',
      receiptHash: '',
      isDigital: true,
      externalTxHash: '',
    },
  })

  const isDigital = useWatch<ConfirmPaymentInput>({ control, name: 'isDigital' })
  const receiptPreview = hashPreview(
    useWatch<ConfirmPaymentInput>({ control, name: 'receiptHash' }) as string | undefined,
  )

  async function onSubmit(data: ConfirmPaymentInput) {
    setStatus({ kind: 'idle' })
    if (!isConnected) {
      setStatus({ kind: 'error', message: 'Conecta tu wallet para firmar la transacción.' })
      return
    }
    const params = {
      loanId: data.loanId,
      installmentNumber: Number(data.installmentNumber),
      receiptHash: data.receiptHash,
      isDigital: data.isDigital,
      externalTxHash: data.externalTxHash ?? '',
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
      <div>
        <h3 className="text-base font-semibold text-slate-100">Confirmar pago de cuota</h3>
        <p className="text-sm text-slate-400">
          Sella el comprobante con <CodeText>LibretaRegistry.confirmPayment</CodeText>. Solo el
          prestamista (<span className="text-slate-500">lender</span>) puede confirmar y las cuotas
          se registran en orden estricto.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="loanId"
            hint="El mismo loanId usado en el registro"
            {...register('loanId')}
            error={errors.loanId?.message}
            placeholder="ej. loan-abc123"
          />
          <Field
            label="Número de cuota"
            type="number"
            min={1}
            max={65535}
            {...register('installmentNumber')}
            error={errors.installmentNumber?.message}
            placeholder="1"
          />
        </div>

        <Field
          label="receiptHash"
          hint={receiptPreview ? `keccak256 → ${receiptPreview}` : 'Hash del recibo/comprobante'}
          {...register('receiptHash')}
          error={errors.receiptHash?.message}
          placeholder="0x… o texto que se hashea"
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#0b101c] px-3.5 py-3">
          <input
            type="checkbox"
            className="size-4 accent-violet-600"
            {...register('isDigital')}
          />
          <span className="text-sm text-slate-200">
            Atestación manual de pago digital
            <span className="block text-xs text-slate-500">
              Desmarca para pago en efectivo (isDigital = false)
            </span>
          </span>
        </label>

        {isDigital && (
          <Field
            label="externalTxHash (transacción externa)"
            hint="Opcional · si se deja vacío se guarda bytes32(0)"
            {...register('externalTxHash')}
            error={errors.externalTxHash?.message}
            placeholder="0x…"
          />
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={mutation.isPending}
          disabled={!isConnected}
        >
          {mutation.isPending ? 'Enviando…' : 'Confirmar Pago'}
        </Button>
      </form>

      <TransactionStatus status={status} />
    </Card>
  )
}

function hashPreview(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const hash = hashText(value.trim())
    return hash.length > 22 ? `${hash.slice(0, 22)}…` : hash
  } catch {
    return null
  }
}
