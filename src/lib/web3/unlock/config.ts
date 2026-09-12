import { ZeroAddress } from 'ethers'
import { HSK_MAINNET, HSK_TESTNET } from '../chains'
import { hskChain } from '../config'

export const UNLOCK_LOCK_ADDRESS: string =
  (import.meta.env.VITE_UNLOCK_LOCK_ADDRESS as string | undefined)?.trim() ??
  ZeroAddress

export const UNLOCK_NETWORK: number = Number(
  import.meta.env.VITE_UNLOCK_NETWORK ?? hskChain.chainId,
)

export const UNLOCK_IS_CONFIGURED: boolean = UNLOCK_LOCK_ADDRESS !== ZeroAddress

export const UNLOCK_LOCK_NAME = 'Auditor Financiero Certificado — CREDITCHAIN'

const UNLOCK_RPC_SUPPORT: Record<number, string> = {
  [HSK_TESTNET.chainId]: HSK_TESTNET.rpcUrl,
  [HSK_MAINNET.chainId]: HSK_MAINNET.rpcUrl,
  8453: 'https://mainnet.base.org',
  84531: 'https://base-sepolia-rpc.publicnode.com',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  10: 'https://mainnet.optimism.io',
  42161: 'https://arb1.arbitrum.io/rpc',
}

const DEFAULT_UNLOCK_RPC = 'https://mainnet.base.org'

export const UNLOCK_RPC_URL: string =
  (import.meta.env.VITE_UNLOCK_RPC_URL as string | undefined)?.trim() ||
  UNLOCK_RPC_SUPPORT[UNLOCK_NETWORK] ||
  DEFAULT_UNLOCK_RPC

const UNLOCK_EXPLORER_SUPPORT: Record<number, string> = {
  [HSK_TESTNET.chainId]: HSK_TESTNET.explorerUrl,
  [HSK_MAINNET.chainId]: HSK_MAINNET.explorerUrl,
  8453: 'https://base.blockscout.com',
  84531: 'https://base-sepolia.blockscout.com',
  11155111: 'https://sepolia.etherscan.io',
  1: 'https://etherscan.io',
  137: 'https://polygonscan.com',
  10: 'https://optimistic.etherscan.io',
  42161: 'https://arbiscan.io',
}

export function unlockTxExplorerUrl(hash: string): string {
  return `${UNLOCK_EXPLORER_SUPPORT[UNLOCK_NETWORK] ?? UNLOCK_EXPLORER_SUPPORT[8453]}/tx/${hash}`
}

export function unlockNativeSymbol(): string {
  if (UNLOCK_NETWORK === HSK_MAINNET.chainId || UNLOCK_NETWORK === HSK_TESTNET.chainId) {
    return 'HSK'
  }
  if (UNLOCK_NETWORK === 137) return 'POL'
  return 'ETH'
}

export function buildUnlockPaywallConfig(): Record<string, unknown> {
  return {
    title: 'CREDITCHAIN · Auditoría Token-Gated',
    locks: {
      [UNLOCK_LOCK_ADDRESS.toLowerCase()]: {
        network: UNLOCK_NETWORK,
        name: UNLOCK_LOCK_NAME,
      },
    },
    callToAction: {
      default:
        'Conecta tu billetera institucional para auditar los registros criptográficos en HSK Chain.',
      expired: 'Tu membresía de auditoría venció. Renueva para continuar.',
    },
    pessimistic: true,
    skipRecipient: true,
  }
}

export function buildUnlockCheckoutUrl(): string {
  const search = new URLSearchParams({
    paywallConfig: JSON.stringify(buildUnlockPaywallConfig()),
  })
  return `https://app.unlock-protocol.com/checkout?${search.toString()}`
}