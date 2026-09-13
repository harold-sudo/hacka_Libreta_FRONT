import { Contract, FetchRequest, JsonRpcProvider, type ContractRunner } from 'ethers'
import { UNLOCK_IS_CONFIGURED, UNLOCK_LOCK_ADDRESS, UNLOCK_RPC_URL } from './config'

export const PUBLIC_LOCK_ABI = [
  'function getHasValidKey(address _recipient) external view returns (bool)',
  'function keyExpirationTimestampFor(uint256 _tokenId) external view returns (uint256)',
  'function keyExpirationTimestampFor(address _recipient) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256)',
  'function keyPrice() external view returns (uint256)',
  'function tokenAddress() external view returns (address)',
  'function expirationDuration() external view returns (uint256)',
  'function purchase(uint256[] _values, address[] _recipients, address[] _referrers, address[] _keyManagers, bytes[] _data) external payable returns (uint256[] tokenIds)',
] as const

let readProvider: JsonRpcProvider | null = null

function getReadProvider(): JsonRpcProvider {
  readProvider ??= new JsonRpcProvider(requestWithTimeout(UNLOCK_RPC_URL))
  return readProvider
}

function requestWithTimeout(url: string): FetchRequest {
  const request = new FetchRequest(url)
  request.timeout = 10_000
  return request
}

/**
 * Instancia tipada del contrato PublicLock de Unlock Protocol.
 * Sin runner lee vía RPC de la red del Lock; con un Signer permite purchase().
 */
export function getUnlockLockContract(runner?: ContractRunner): Contract {
  if (!UNLOCK_IS_CONFIGURED) {
    throw new Error(
      'Lock de Unlock Protocol no configurado. Define VITE_UNLOCK_LOCK_ADDRESS y VITE_UNLOCK_NETWORK.',
    )
  }
  return new Contract(UNLOCK_LOCK_ADDRESS, PUBLIC_LOCK_ABI, runner ?? getReadProvider())
}

export interface UnlockMembership {
  hasValidKey: boolean
  expirationTimestamp: bigint
  tokenId: string | null
}

/** Verifica si la wallet posee una Key (membresía) válida en el Lock de Unlock Protocol. */
export async function verifyUnlockMembership(walletAddress: string): Promise<UnlockMembership> {
  const contract = getUnlockLockContract()
  const hasValidKey = (await contract.getHasValidKey(walletAddress)) as boolean

  let expirationTimestamp = 0n
  let tokenId: string | null = null

  if (hasValidKey) {
    try {
      const id = (await contract.tokenOfOwnerByIndex(walletAddress, 0)) as bigint
      tokenId = id.toString()
    } catch {
      tokenId = null
    }

    try {
      if (tokenId !== null) {
        expirationTimestamp = (await contract['keyExpirationTimestampFor(uint256)'](
          BigInt(tokenId),
        )) as bigint
      }
    } catch {
      try {
        expirationTimestamp = (await contract['keyExpirationTimestampFor(address)'](
          walletAddress,
        )) as bigint
      } catch {
        expirationTimestamp = 0n
      }
    }
  }

  return { hasValidKey, expirationTimestamp, tokenId }
}