import { ZeroAddress } from 'ethers'
import { useMutation } from '@tanstack/react-query'
import type { ContractTransactionResponse } from 'ethers'
import { userFriendlyError } from '../../lib/web3/contract'
import { getBrowserProvider } from '../../lib/web3/provider'
import { UNLOCK_NETWORK } from '../../lib/web3/unlock/config'
import { getUnlockLockContract } from '../../lib/web3/unlock/unlockContract'

/**
 * Compra directa de una Key nativa (HSK/ETH) contra el PublicLock.
 * Útil cuando el Lock está desplegado en HSK Chain y el checkout oficial
 * de Unlock Protocol no soporta esa red.
 */
export function usePurchaseUnlockKey() {
  return useMutation({
    mutationFn: async (recipient: string): Promise<ContractTransactionResponse> => {
      try {
        const provider = getBrowserProvider()
        const signer = await provider.getSigner()
        const network = await provider.getNetwork()
        if (Number(network.chainId) !== UNLOCK_NETWORK) {
          throw new Error(
            `Cambia tu wallet a la red ${UNLOCK_NETWORK} del Lock para comprar la membresía.`,
          )
        }
        const contract = getUnlockLockContract(signer)
        const keyPrice = (await contract.keyPrice()) as bigint
        return (await contract.purchase(
          [keyPrice],
          [recipient],
          [recipient],
          [ZeroAddress],
          [[]],
          { value: keyPrice },
        )) as ContractTransactionResponse
      } catch (error) {
        throw new Error(userFriendlyError(error))
      }
    },
  })
}