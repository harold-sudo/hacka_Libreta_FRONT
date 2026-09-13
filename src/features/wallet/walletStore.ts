import { formatEther } from 'ethers'
import { create } from 'zustand'
import {
  getEthereumProvider,
  selectEthereumProvider,
  getBalanceHsk,
  getCurrentChainId,
  requestAccount,
  switchToHskChain,
} from '../../lib/web3/provider'

interface WalletState {
  address: string | null
  chainId: number | null
  balanceHsk: string | null
  isConnecting: boolean
  isMetaMaskInstalled: boolean
  hasMetaMaskError: boolean
  error: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

let listenersInstalled = false

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  chainId: null,
  balanceHsk: null,
  isConnecting: false,
  isMetaMaskInstalled: false,
  hasMetaMaskError: false,
  error: null,
  isConnected: false,

  connect: async () => {
    const wallet = get()
    if (wallet.isConnecting) return

    const provider = selectEthereumProvider()
    if (!provider) {
      set({ hasMetaMaskError: true, error: 'MetaMask no detectado. Instala la extensión y recarga la página.' })
      return
    }
    if (!wallet.isMetaMaskInstalled) set({ isMetaMaskInstalled: true })

    set({ isConnecting: true, error: null, hasMetaMaskError: false })
    try {
      const address = await requestAccount()
      await switchToHskChain().catch(() => {
        /* Si el usuario rechaza el cambio de red, se continúa con la red activa. */
      })
      const chainId = await getCurrentChainId()
      set({
        address,
        chainId,
        balanceHsk: null,
        isConnected: true,
        isConnecting: false,
      })
      installWalletListeners(get().refreshBalance)
      // A slow/unavailable RPC balance must not invalidate an authorized account.
      void get().refreshBalance()
    } catch (error) {
      set({
        isConnecting: false,
        error: walletConnectionError(error),
      })
    }
  },

  disconnect: () => {
    set({
      address: null,
      chainId: null,
      balanceHsk: null,
      isConnected: false,
      error: null,
    })
  },

  refreshBalance: async () => {
    const { address } = get()
    if (!address) return
    try {
      const balanceHsk = await getBalanceHsk(address)
      set({ balanceHsk: formatEther(balanceHsk ?? 0n) })
    } catch {
      /* Silencia fallos de red al refrescar el saldo. */
    }
  },
}))

function installWalletListeners(refreshBalance: () => Promise<void>) {
  if (listenersInstalled) return
  const provider = getEthereumProvider()
  if (!provider) return

  provider.on('accountsChanged', (accounts: unknown) => {
    const list = accounts as string[]
    const next = list[0] ?? null
    useWalletStore.setState({ address: next, isConnected: Boolean(next) })
    void useWalletStore.getState().refreshBalance()
  })
  provider.on('chainChanged', (_chainId: unknown) => {
    void getCurrentChainId().then((chainId) => {
      useWalletStore.setState({ chainId })
    })
    void refreshBalance()
  })
  provider.on('disconnect', () => {
    useWalletStore.getState().disconnect()
  })
  listenersInstalled = true
}

function walletConnectionError(error: unknown): string {
  const code = (error as { code?: number } | null)?.code
  if (code === 4001) return 'Rechazaste la conexión en MetaMask. Puedes volver a intentarlo.'
  if (code === -32002) return 'Ya hay una solicitud pendiente. Abre la extensión MetaMask y apruébala o cancélala.'
  return error instanceof Error ? error.message : 'Ocurrió un error al conectar la wallet.'
}
