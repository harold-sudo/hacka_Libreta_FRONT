export interface HskChain {
  chainId: number
  chainIdHex: string
  name: string
  shortName: string
  rpcUrl: string
  explorerUrl: string
  currencySymbol: string
}

export const HSK_MAINNET: HskChain = {
  chainId: 177,
  chainIdHex: '0xb1',
  name: 'HashKey Chain',
  shortName: 'HSK Mainnet',
  rpcUrl: 'https://mainnet.hsk.xyz',
  explorerUrl: 'https://hsk.blockscout.com',
  currencySymbol: 'HSK',
}

export const HSK_TESTNET: HskChain = {
  chainId: 133,
  chainIdHex: '0x85',
  name: 'HashKey Chain Testnet',
  shortName: 'HSK Testnet',
  rpcUrl: 'https://testnet.hsk.xyz',
  explorerUrl: 'https://testnet-explorer.hsk.xyz',
  currencySymbol: 'HSK',
}

export function getHskChain(chainId: number): HskChain {
  return chainId === HSK_MAINNET.chainId ? HSK_MAINNET : HSK_TESTNET
}

export interface AddEthereumChainParameter {
  chainId: string
  chainName: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  blockExplorerUrls?: string[]
}

export function toAddChainParameter(chain: HskChain): AddEthereumChainParameter {
  return {
    chainId: chain.chainIdHex,
    chainName: chain.name,
    nativeCurrency: {
      name: chain.currencySymbol,
      symbol: chain.currencySymbol,
      decimals: 18,
    },
    rpcUrls: [chain.rpcUrl],
    blockExplorerUrls: [chain.explorerUrl],
  }
}