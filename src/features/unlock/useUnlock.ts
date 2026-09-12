import { useQuery } from '@tanstack/react-query'
import { getUnlockLockContract, verifyUnlockMembership } from '../../lib/web3/unlock/unlockContract'
import { UNLOCK_IS_CONFIGURED, UNLOCK_LOCK_ADDRESS } from '../../lib/web3/unlock/config'

/** Consulta si la wallet conectada posee una Key válida en el Lock de Unlock Protocol. */
export function useUnlockMembership(address: string | null) {
  return useQuery({
    queryKey: [
      'unlock-membership',
      UNLOCK_LOCK_ADDRESS.toLowerCase(),
      address?.toLowerCase() ?? 'none',
    ],
    queryFn: async () => {
      if (!address) throw new Error('Conecta tu wallet para auditar.')
      return verifyUnlockMembership(address)
    },
    enabled: UNLOCK_IS_CONFIGURED && Boolean(address),
    staleTime: 30_000,
    retry: false,
  })
}

/** Metadatos del Lock (precio, token, duración) para la UI de adquisición. */
export function useUnlockLockInfo() {
  return useQuery({
    queryKey: ['unlock-lock-info', UNLOCK_LOCK_ADDRESS.toLowerCase()],
    queryFn: async () => {
      const contract = getUnlockLockContract()
      const keyPrice = (await contract.keyPrice()) as bigint
      const tokenAddress = (await contract.tokenAddress()) as string
      const expirationDuration = (await contract.expirationDuration()) as bigint
      return { keyPrice, tokenAddress, expirationDuration }
    },
    enabled: UNLOCK_IS_CONFIGURED,
    staleTime: 5 * 60_000,
    retry: false,
  })
}