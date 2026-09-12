import { ethers } from 'ethers'

const BYTES32_HEX = /^0x[0-9a-fA-F]{64}$/

/** Convierte texto plano a bytes32 (keccak256). Si ya es un 0x-hex de 32 bytes, lo usa tal cual. */
export function toBytes32(value: string): string {
  const trimmed = value.trim()
  if (BYTES32_HEX.test(trimmed)) return trimmed.toLowerCase()
  return ethers.keccak256(ethers.toUtf8Bytes(trimmed))
}

/** Genera un hash bytes32 para recibos/loanHash a partir de texto plano. */
export function hashText(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value.trim()))
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}

export function isBytes32(value: string): boolean {
  return BYTES32_HEX.test(value.trim())
}

export function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatHsk(balance: bigint | string): string {
  const value = typeof balance === 'bigint' ? balance : BigInt(balance)
  return `${Number(ethers.formatEther(value)).toFixed(4)}`
}