import { ZeroAddress, ZeroHash } from 'ethers'
import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query'
import type { ContractTransactionResponse } from 'ethers'
import type { Loan, PaymentProof } from '../../lib/web3/abi'
import { getLibretaContract, requireSigner, userFriendlyError } from '../../lib/web3/contract'
import { CONTRACT_IS_CONFIGURED } from '../../lib/web3/config'
import { toBytes32 } from '../../lib/web3/utils'

export interface RawLoan extends Record<string, unknown> {
  loanHash: string
  lender: string
  borrower: string
  totalInstallments: bigint | number
  paidInstallments: bigint | number
  createdAt: bigint | number
  completedAt: bigint | number
  status: bigint | number
}

export interface RawProof extends Record<string, unknown> {
  receiptHash: string
  installmentNumber: bigint | number
  timestamp: bigint | number
  isDigital: boolean
  externalTxHash: string
}

export function mapRawLoan(raw: RawLoan, loanId: string): Loan {
  return {
    loanId,
    loanHash: raw.loanHash,
    lender: raw.lender,
    borrower: raw.borrower,
    totalInstallments: Number(raw.totalInstallments),
    paidInstallments: Number(raw.paidInstallments),
    createdAt: BigInt(raw.createdAt),
    completedAt: BigInt(raw.completedAt),
    status: Number(raw.status),
  }
}

export function mapRawProof(raw: RawProof): PaymentProof {
  return {
    receiptHash: raw.receiptHash,
    installmentNumber: Number(raw.installmentNumber),
    timestamp: BigInt(raw.timestamp),
    isDigital: raw.isDigital,
    externalTxHash: raw.externalTxHash,
  }
}

export interface RegisterLoanParams {
  loanId: string
  loanHash: string
  borrower: string
  totalInstallments: number
}

export interface ConfirmPaymentParams {
  loanId: string
  installmentNumber: number
  receiptHash: string
  isDigital: boolean
  externalTxHash: string
}

interface TxResult {
  tx: ContractTransactionResponse
  txHash: string
}

/** Refresca las consultas on-chain de un préstamo tras una transacción confirmada. */
export function invalidateLoan(queryClient: QueryClient, loanId: string) {
  const id = toBytes32(loanId)
  void queryClient.invalidateQueries({ queryKey: ['loan', id] })
  void queryClient.invalidateQueries({ queryKey: ['loan-proofs', id] })
}

/** Mutación on-chain: LibretaRegistry.registerLoan */
export function useRegisterLoan() {
  return useMutation({
    mutationFn: async (params: RegisterLoanParams): Promise<TxResult> => {
      const signer = await requireSigner()
      const contract = getLibretaContract(signer)
      const tx: ContractTransactionResponse = await contract.registerLoan(
        toBytes32(params.loanId),
        toBytes32(params.loanHash),
        params.borrower,
        params.totalInstallments,
      )
      return { tx, txHash: tx.hash }
    },
  })
}

/** Mutación on-chain: LibretaRegistry.confirmPayment */
export function useConfirmPayment() {
  return useMutation({
    mutationFn: async (params: ConfirmPaymentParams): Promise<TxResult> => {
      const signer = await requireSigner()
      const contract = getLibretaContract(signer)
      const tx: ContractTransactionResponse = await contract.confirmPayment(
        toBytes32(params.loanId),
        params.installmentNumber,
        toBytes32(params.receiptHash),
        params.isDigital,
        params.externalTxHash.trim() ? toBytes32(params.externalTxHash) : ZeroHash,
      )
      return { tx, txHash: tx.hash }
    },
  })
}

/** Lectura on-chain: LibretaRegistry.loans(loanId) */
export function useLoanQuery(loanId: string) {
  const normalized = loanId.trim()
  return useQuery({
    queryKey: ['loan', normalized],
    queryFn: async () => {
      const contract = getLibretaContract()
      const raw = (await contract.loans(toBytes32(normalized))) as unknown as RawLoan
      const loan = mapRawLoan(raw, toBytes32(normalized))
      const exists = loan.loanHash !== ZeroHash && loan.borrower !== ZeroAddress
      return { loan, exists }
    },
    enabled: normalized.length > 0 && CONTRACT_IS_CONFIGURED,
    retry: false,
  })
}

/** Lectura on-chain: LibretaRegistry.getLoanProofs(loanId) */
export function useLoanProofsQuery(loanId: string) {
  const normalized = loanId.trim()
  return useQuery({
    queryKey: ['loan-proofs', normalized],
    queryFn: async () => {
      const contract = getLibretaContract()
      const raw = (await contract.getLoanProofs(toBytes32(normalized))) as unknown as RawProof[]
      return raw.map(mapRawProof)
    },
    enabled: normalized.length > 0 && CONTRACT_IS_CONFIGURED,
    retry: false,
  })
}

export { userFriendlyError }
export type { TxResult }