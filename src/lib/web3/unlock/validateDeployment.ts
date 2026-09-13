import type { Provider } from 'ethers'

export async function validateUnlockDeployment(
  provider: Pick<Provider, 'getNetwork' | 'getCode'>,
  address: string,
  expectedChainId: number,
): Promise<void> {
  const network = await provider.getNetwork()
  if (network.chainId !== BigInt(expectedChainId)) {
    throw new Error(`El RPC de Unlock responde en la red ${network.chainId}, pero el Lock está configurado para ${expectedChainId}. Revisa VITE_UNLOCK_NETWORK y VITE_UNLOCK_RPC_URL.`)
  }
  if (await provider.getCode(address) === '0x') {
    throw new Error(`No existe un contrato en ${address} en la red ${expectedChainId}. Revisa la dirección del PublicLock y su red en la configuración de Unlock.`)
  }
}
