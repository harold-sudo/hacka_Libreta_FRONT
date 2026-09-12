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

      if (addressMode) {
        const ids = (await contract.borrowerLoans(normalized)) as string[]
        const loans: ForensicLoan[] = []
        for (const id of ids) {
          const rawLoan = (await contract.loans(id)) as unknown as RawLoan
          const loan = mapRawLoan(rawLoan, id)
          if (loan.loanHash === ZeroHash && loan.borrower === ZeroAddress) continue
          const rawProofs = (await contract.getLoanProofs(id)) as unknown as RawProof[]
          loans.push({ loan, proofs: rawProofs.map(mapRawProof) })
        }
        return { loans }
      }

      const id = toBytes32(normalized)
      const rawLoan = (await contract.loans(id)) as unknown as RawLoan
      const loan = mapRawLoan(rawLoan, id)
      const exists = loan.loanHash !== ZeroHash && loan.borrower !== ZeroAddress
      if (!exists) return { loans: [] }
      const rawProofs = (await contract.getLoanProofs(id)) as unknown as RawProof[]
      return { loans: [{ loan, proofs: rawProofs.map(mapRawProof) }] }
    },
    enabled: normalized.length > 0 && CONTRACT_IS_CONFIGURED,
    retry: false,
  })
}