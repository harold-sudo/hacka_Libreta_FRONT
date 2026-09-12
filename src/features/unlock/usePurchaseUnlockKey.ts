import { ZeroAddress } from 'ethers'
import { useMutation } from '@tanstack/react-query'
import type { BrowserProvider, Contract, ContractTransactionResponse } from 'ethers'
import { userFriendlyError } from '../../lib/web3/contract'
import {
  getBrowserProvider,
  getEthereumProvider,
} from '../../lib/web3/provider'
import { HSK_MAINNET, HSK_TESTNET, toAddChainParameter } from '../../lib/web3/chains'
import { formatHsk } from '../../lib/web3/utils'
import {
  UNLOCK_NETWORK,
  unlockNativeSymbol,
} from '../../lib/web3/unlock/config'
import { getUnlockLockContract } from '../../lib/web3/unlock/unlockContract'

export const UNLOCK_CLAIM_NO_HASH_ERROR =
  'No transaction hash returned. Failed to claim membership.'

/**
 * Compra directa de una Key nativa (HSK/ETH) contra el PublicLock.
 * Útil cuando el Lock está desplegado en HSK Chain y el checkout oficial
 * de Unlock Protocol no soporta esa red.
 *
 * El flujo garantiza:
 *  1. Red correcta de la wallet (intenta `wallet_switchEthereumChain`).
 *  2. Fondos suficientes para precio + gas antes de enviar.
 *  3. `tx.hash` real devuelto por la wallet antes de considerar la venta.
 * El `await tx.wait()` lo hace el llamador antes de mostrar el éxito.
 */
export function usePurchaseUnlockKey() {
  return useMutation({
    mutationFn: async (recipient: string): Promise<ContractTransactionResponse> => {
      try {
        const provider = getBrowserProvider()
        const signer = await provider.getSigner()
        const sender = await signer.getAddress()

        await ensureWalletOnLockNetwork(provider)

        const contract = getUnlockLockContract(signer)
        const keyPrice = (await contract.keyPrice()) as bigint

        await ensureFundsForPurchase({
          provider,
          sender,
          contract,
          keyPrice,
          recipient,
        })

        const tx = (await contract.purchase(
          [keyPrice],
          [recipient],
          [recipient],
          [ZeroAddress],
          [[]],
          { value: keyPrice },
        )) as ContractTransactionResponse

        // La wallet pudo devolver una respuesta sin hash (rechazo/red caída).
        if (!tx || typeof tx.hash !== 'string' || tx.hash.length === 0) {
          throw new Error(UNLOCK_CLAIM_NO_HASH_ERROR)
        }
        return tx
      } catch (error) {
        throw new Error(userFriendlyError(error))
      }
    },
  })
}

/** Cambia la wallet a la red del Lock (secuencia estándar EIP-3326) antes de comprar. */
async function ensureWalletOnLockNetwork(provider: BrowserProvider): Promise<void> {
  const network = await provider.getNetwork()
  if (Number(network.chainId) === UNLOCK_NETWORK) return

  // Solo podemos auto-agregar cadenas HSK (parámetros públicos conocidos).
  const hskChainForLock =
    UNLOCK_NETWORK === HSK_MAINNET.chainId || UNLOCK_NETWORK === HSK_TESTNET.chainId
      ? UNLOCK_NETWORK === HSK_MAINNET.chainId
        ? HSK_MAINNET
        : HSK_TESTNET
      : null

  const meta = getEthereumProvider()
  const chainIdHex = `0x${UNLOCK_NETWORK.toString(16)}`

  try {
    await meta?.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }] as never,
    })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 4902 && hskChainForLock) {
      await meta?.request({
        method: 'wallet_addEthereumChain',
        params: [toAddChainParameter(hskChainForLock)] as never,
      })
      return
    }
    if (code === 4001) {
      throw new Error(
        'Cambia tu wallet a la red del Lock antes de comprar la membresía.',
      )
    }
    throw new Error(
      `Cambia tu wallet a la red ${UNLOCK_NETWORK} (${unlockNativeSymbol()}) del Lock para comprar la membresía.`,
    )
  }
}

/** Verifica que el saldo cubra el precio de la Key más el gas estimado. */
async function ensureFundsForPurchase({
  provider,
  sender,
  contract,
  keyPrice,
  recipient,
}: {
  provider: BrowserProvider
  sender: string
  contract: Contract
  keyPrice: bigint
  recipient: string
}): Promise<void> {
  try {
    const gasEstimate = await contract.purchase.estimateGas(
      [keyPrice],
      [recipient],
      [recipient],
      [ZeroAddress],
      [[]],
      { value: keyPrice },
    )
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n
    const totalNeeded = keyPrice + gasEstimate * gasPrice
    const balance = await provider.getBalance(sender)
    const symbol = unlockNativeSymbol()

    if (balance < totalNeeded) {
      throw new Error(
        `Saldo ${symbol} insuficiente: necesitas ${formatHsk(totalNeeded)} y tienes ${formatHsk(balance)} (precio de la Key + gas).`,
      )
    }
  } catch (error) {
    // Si la estimación falla no bloqueamos la compra: la wallet dará el error real.
    if (error instanceof Error && error.message.startsWith('Saldo')) throw error
  }
}