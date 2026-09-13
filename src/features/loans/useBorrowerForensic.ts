import { ZeroAddress, ZeroHash, isAddress } from 'ethers'
import { useQuery } from '@tanstack/react-query'
import type { Loan, PaymentProof } from '../../lib/web3/abi'
import { CONTRACT_IS_CONFIGURED } from '../../lib/web3/config'
import { getLibretaContract } from '../../lib/web3/contract'
import { toBytes32 } from '../../lib/web3/utils'
import { mapRawLoan, mapRawProof, type RawLoan, type RawProof } from './useLoanRegistry'

export interface ForensicLoan {
  loan: Loan
  proofs: PaymentProof[]
}

/**
 * Historial forense completo de un prestatario (getLoanProofs por cada Loan).
 * Acepta un Loan ID (bytes32 o texto) o la dirección del prestatario.
 */
export function useBorrowerForensic(input: string) {
  const normalized = input.trim()
  const addressMode = normalized.length > 0 && isAddress(normalized)

  return useQuery({
    queryKey: addressMode
      ? ['forensic', `addr:${normalized.toLowerCase()}`]
      : ['forensic', normalized],
    queryFn: async (): Promise<{ loans: ForensicLoan[] }> => {
      const contract = getLibretaContract()

      async function fetchProofs(loanId: string): Promise<PaymentProof[]> {
        const rawProofs = (await contract.getLoanProofs(loanId)) as unknown as RawProof[]
        const txMap: Record<number, { hash: string; block: number }> = {}
        try {
          const provider = contract.runner?.provider
          const currentBlock = provider ? await provider.getBlockNumber() : 0
          const fromBlock = Math.max(0, currentBlock - 50000)
          const filter = contract.filters.PaymentConfirmed(loanId)
          const events = await contract.queryFilter(filter, fromBlock)
          for (const ev of events) {
            const num = Number((ev as any).args?.installmentNumber)
            if (num) {
              txMap[num] = { hash: ev.transactionHash, block: ev.blockNumber }
            }
          }
        } catch {
          // Fallback seguro si los eventos no responden
        }
        return rawProofs.map((p) => {
          const num = Number(p.installmentNumber)
          return mapRawProof(p, txMap[num]?.hash, txMap[num]?.block)
        })
      }

      if (addressMode) {
        const count = (await contract.getBorrowerLoanCount(normalized)) as bigint
        const loans: ForensicLoan[] = []
        for (let i = 0n; i < count; i++) {
          const id = (await contract.borrowerLoans(normalized, i)) as string
          const rawLoan = (await contract.loans(id)) as unknown as RawLoan
          const loan = mapRawLoan(rawLoan, id)
          if (loan.loanHash === ZeroHash && loan.borrower === ZeroAddress) continue
          const proofs = await fetchProofs(id)
          loans.push({ loan, proofs })
        }
        return { loans }
      }

      const id = toBytes32(normalized)
      const rawLoan = (await contract.loans(id)) as unknown as RawLoan
      const loan = mapRawLoan(rawLoan, id)
      const exists = loan.loanHash !== ZeroHash && loan.borrower !== ZeroAddress
      if (!exists) return { loans: [] }
      const proofs = await fetchProofs(id)
      return { loans: [{ loan, proofs }] }
    },
    enabled: normalized.length > 0 && CONTRACT_IS_CONFIGURED,
    retry: false,
  })
}