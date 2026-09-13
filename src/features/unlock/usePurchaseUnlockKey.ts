import { ZeroAddress } from 'ethers'
import { useMutation } from '@tanstack/react-query'
import type { BrowserProvider, Contract, ContractTransactionResponse } from 'ethers'
import { userFriendlyError } from '../../lib/web3/contract'
import {
  getEthereumProvider,
} from '../../lib/web3/provider'
import { HSK_MAINNET, HSK_TESTNET, toAddChainParameter } from '../../lib/web3/chains'
import { formatHsk } from '../../lib/web3/utils'
import {
  UNLOCK_LOCK_ADDRESS,
  UNLOCK_NETWORK,
  unlockNativeSymbol,
} from '../../lib/web3/unlock/config'
import { getUnlockLockContract } from '../../lib/web3/unlock/unlockContract'
import { validateUnlockDeployment } from '../../lib/web3/unlock/validateDeployment'
import { prepareUnlockWallet } from '../../lib/web3/unlock/prepareWallet'

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
        const wallet = getEthereumProvider()
        if (!wallet) throw new Error('MetaMask no detectado. Conecta tu wallet antes de adquirir la membresía.')
        const hskChain = UNLOCK_NETWORK === HSK_MAINNET.chainId ? HSK_MAINNET
          : UNLOCK_NETWORK === HSK_TESTNET.chainId ? HSK_TESTNET : null
        const provider = await prepareUnlockWallet(
          wallet, UNLOCK_NETWORK, hskChain ? toAddChainParameter(hskChain) : undefined,
        )
        await validateUnlockDeployment(provider, UNLOCK_LOCK_ADDRESS, UNLOCK_NETWORK)
        const signer = await provider.getSigner()
        const sender = await signer.getAddress()
        const contract = getUnlockLockContract(signer)
        const keyPrice = (await contract.keyPrice()) as bigint

        await ensureFundsForPurchase({
          provider,
          sender,
          contract,
          keyPrice,
          recipient,
        })

        // Envía la transacción y ESPERA la respuesta de MetaMask: aquí se
        // captura el tx.hash real. Sin await previo, no habría hash.
        const tx = (await contract.purchase(
          [keyPrice],
          [recipient],
          [recipient],
          [ZeroAddress],
          ['0x'],
          { value: keyPrice },
        )) as ContractTransactionResponse

        // La wallet pudo devolver una respuesta sin hash (rechazo/red caída).
        if (!tx || typeof tx.hash !== 'string' || tx.hash.length === 0) {
          throw new Error(UNLOCK_CLAIM_NO_HASH_ERROR)
        }
        console.info(`[Claim Unlock] Transacción enviada: ${tx.hash}`)
        return tx
      } catch (error) {
        // Log del error REAL de la wallet/RPC (no solo el mensaje amigable).
        console.error('[Claim Unlock] Error original de la wallet:', error)
        if (
          error instanceof Error &&
          error.message === UNLOCK_CLAIM_NO_HASH_ERROR
        ) {
          console.error(
            `[Claim Unlock] MetaMask NO devolvió hash. ¿La red activa coincide con UNLOCK_NETWORK=${UNLOCK_NETWORK}? ¿El lock ${UNLOCK_LOCK_ADDRESS} tiene fondos de gas? Si da revert en la simulación, la wallet nunca emite hash.`,
          )
        }
        throw new Error(userFriendlyError(error))
      }
    },
  })
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
      ['0x'],
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
