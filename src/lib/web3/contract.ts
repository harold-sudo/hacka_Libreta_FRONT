import { Contract, FetchRequest, JsonRpcProvider, type ContractRunner } from 'ethers'
import { LIBRETA_ABI } from './abi'
import { CONTRACT_ADDRESS, CONTRACT_IS_CONFIGURED, hskChain } from './config'
import { getBrowserProvider } from './provider'

const readRequest = new FetchRequest(hskChain.rpcUrl)
readRequest.timeout = 10_000
const readProvider = new JsonRpcProvider(readRequest)

/**
 * Crea una instancia tipada del contrato LibretaRegistry.
 * Sin runner usa el RPC público de HSK Chain (lecturas).
 * Con un Signer permite escribir (registerLoan / confirmPayment).
 */
export function getLibretaContract(runner?: ContractRunner): Contract {
  if (!CONTRACT_IS_CONFIGURED) {
    throw new Error(
      'Contrato no configurado. Define VITE_HSK_CONTRACT_ADDRESS en tu archivo .env.',
    )
  }
  return new Contract(CONTRACT_ADDRESS, LIBRETA_ABI, runner ?? readProvider)
}

/** Obtiene el signer de la wallet conectada (requiere MetaMask). */
export async function requireSigner(): Promise<ContractRunner> {
  const provider = getBrowserProvider()
  return provider.getSigner()
}

export function userFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const e = error as Error & {
      code?: string | number
      shortMessage?: string
      reason?: string
    }
    if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
      return 'Transacción rechazada en MetaMask.'
    }
    if (e.code === 'INSUFFICIENT_FUNDS') {
      return 'Saldo HSK insuficiente para cubrir la tarifa de gas.'
    }
    if (e.code === 'UNRECOGNIZED_CHAIN_ID') {
      return 'Red no soportada. Conéctate a la red HSK Chain.'
    }
    if (e.code === 'CALL_EXCEPTION') {
      return `La transacción fue revertida${
        e.reason ? `: ${e.reason}` : '. Revisa permisos, estado del préstamo y cuotas.'
      }`
    }
    // Razones de revert típicas de Unlock Protocol (PublicLock).
    const msg = `${e.shortMessage ?? ''} ${e.reason ?? ''} ${e.message ?? ''}`
    const lower = msg.toLowerCase()
    if (lower.includes('already_has_key') || msg.includes('ALREADY_HAS_KEY')) {
      return 'Ya posees una Key activa en este Lock de Unlock. Verifica tu membresía actual.'
    }
    if (lower.includes('lock is disabled') || msg.includes('LOCK_DISABLED')) {
      return 'Este Lock de Unlock está deshabilitado o cerrado por el administrador.'
    }
    if (lower.includes('insufficient funds')) {
      return 'Saldo insuficiente en la wallet para pagar el precio de la Key más el gas.'
    }
    return e.shortMessage ?? e.reason ?? e.message
  }
  return 'Ocurrió un error desconocido.'
}