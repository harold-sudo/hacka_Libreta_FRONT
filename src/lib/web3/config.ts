import { HSK_MAINNET, HSK_TESTNET, type HskChain } from './chains'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const envChainId = Number(import.meta.env.VITE_HSK_CHAIN_ID ?? '133')

export const hskChain: HskChain =
  envChainId === HSK_MAINNET.chainId ? HSK_MAINNET : HSK_TESTNET

export const CONTRACT_ADDRESS: string =
  (import.meta.env.VITE_HSK_CONTRACT_ADDRESS as string | undefined)?.trim() ??
  ZERO_ADDRESS

export const CONTRACT_IS_CONFIGURED = CONTRACT_ADDRESS !== ZERO_ADDRESS

export function txExplorerUrl(hash: string): string {
  return `${hskChain.explorerUrl}/tx/${hash}`
}

export function addressExplorerUrl(address: string): string {
  return `${hskChain.explorerUrl}/address/${address}`
}