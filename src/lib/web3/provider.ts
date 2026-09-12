import { BrowserProvider, type Eip1193Provider } from 'ethers'
import { toAddChainParameter, type HskChain } from './chains'
import { hskChain } from './config'

export type WalletProvider = Eip1193Provider & {
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}

export function getEthereumProvider(): WalletProvider | null {
  const eth = (window as typeof window & { ethereum?: WalletProvider }).ethereum
  return eth ?? null
}

export function getBrowserProvider(): BrowserProvider {
  const provider = getEthereumProvider()
  if (!provider) throw new Error('MetaMask no detectado. Instala la extensión y recarga la página.')
  return new BrowserProvider(provider, 'any')
}

/** Cambia la red activa de MetaMask a la cadena HSK configurada. */
export async function switchToHskChain(): Promise<void> {
  const provider = getEthereumProvider()
  if (!provider) return

  const params = [{ chainId: hskChain.chainIdHex }]
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: params as never,
    })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 4902) {
      await addHskChainToWallet(hskChain)
      return
    }
    throw error
  }
}

async function addHskChainToWallet(chain: HskChain): Promise<void> {
  const provider = getEthereumProvider()
  if (!provider) return
  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [toAddChainParameter(chain)] as never,
  })
}

/** Obtiene la cuenta y la cadena actual desde una red HSK conectada. */
export async function requestAccount(): Promise<string> {
  const provider = getEthereumProvider()
  if (!provider) throw new Error('MetaMask no detectado. Instala la extensión y recarga la página.')
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
    params: [],
  })) as string[]
  if (!accounts[0]) throw new Error('No se autorizó ninguna cuenta.')
  return accounts[0]
}

export async function getCurrentChainId(): Promise<number> {
  const provider = getEthereumProvider()
  if (!provider) return 0
  const hex = (await provider.request({ method: 'eth_chainId', params: [] })) as string
  return Number.parseInt(hex, 16)
}

export async function getBalanceHsk(address: string): Promise<bigint> {
  const provider = getBrowserProvider()
  return provider.getBalance(address)
}