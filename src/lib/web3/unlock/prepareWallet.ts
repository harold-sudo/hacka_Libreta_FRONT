import { BrowserProvider, type Eip1193Provider } from 'ethers'

/** Switch using uncached wallet requests, then create a provider bound to the Lock network. */
export async function prepareUnlockWallet(
  wallet: Eip1193Provider,
  chainId: number,
  addChainParameter?: object,
): Promise<BrowserProvider> {
  const target = BigInt(chainId)
  const currentChain = async () => BigInt(await wallet.request({ method: 'eth_chainId' }) as string)
  const switchChain = () => wallet.request({
    method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }],
  })
  if (await currentChain() !== target) {
    try {
      await switchChain()
    } catch (error) {
      const code = (error as { code?: number } | null)?.code
      if (code === 4902 && addChainParameter) {
        await wallet.request({ method: 'wallet_addEthereumChain', params: [addChainParameter] })
        await switchChain()
      } else {
        throw new Error(code === 4001
          ? 'Rechazaste el cambio de red. Selecciona la red del Lock para adquirir la membresía.'
          : `No se pudo activar la red ${chainId}. Habilita esa red en MetaMask y vuelve a intentarlo.`)
      }
    }
  }
  const actual = await currentChain()
  if (actual !== target) {
    throw new Error(`MetaMask sigue en la red ${actual}; la membresía requiere ${chainId}. No se envió ninguna transacción.`)
  }
  // Do not carry over network/read caches from the provider used on HSK.
  // A later chain change must fail instead of silently moving the purchase.
  return new BrowserProvider(wallet, chainId, { cacheTimeout: -1 })
}
