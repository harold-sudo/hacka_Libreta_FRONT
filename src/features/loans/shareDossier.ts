import { isAddress } from 'ethers'
import { toBytes32 } from '../../lib/web3/utils'

// Share only a public address or opaque loan hash; never raw input or session data.
export function dossierLink(input: string, currentUrl: string): string {
  const target = input.trim()
  if (!target) throw new Error('Genera primero un expediente.')
  const identifier = isAddress(target) ? target : toBytes32(target)
  const url = new URL('/', currentUrl)
  url.hash = new URLSearchParams({ audit: identifier }).toString()
  return url.toString()
}

export function sharedDossier(hash: string): string {
  const target = new URLSearchParams(hash.replace(/^#/, '')).get('audit') ?? ''
  return isAddress(target) || /^0x[0-9a-fA-F]{64}$/.test(target) ? target : ''
}
