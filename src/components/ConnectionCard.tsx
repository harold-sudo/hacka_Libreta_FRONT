import { useWalletStore } from '../features/wallet/walletStore'
import { addressExplorerUrl, hskChain } from '../lib/web3/config'
import { shortenAddress } from '../lib/web3/utils'
import { Button, Card, CodeText, StatusPill } from './ui/primitives'

export function ConnectionCard() {
  const wallet = useWalletStore()

  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Cartera · MetaMask
          </h2>
          {wallet.isConnected && wallet.address ? (
            <ConnectedInfo
              chainId={wallet.chainId}
              balance={wallet.balanceHsk}
              onRefresh={() => {
                void wallet.refreshBalance()
              }}
            />
          ) : (
            <p className="text-sm text-slate-400">
              Conecta MetaMask para interactuar con la red.{' '}
              <CodeText>{hskChain.shortName}</CodeText>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wallet.isConnected && wallet.address ? (
            <a
              href={addressExplorerUrl(wallet.address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-slate-200 underline-offset-2 hover:text-violet-300 hover:underline"
            >
              {shortenAddress(wallet.address)}
            </a>
          ) : null}
          {wallet.isConnected ? (
            <Button variant="ghost" size="sm" onClick={wallet.disconnect}>
              Desconectar
            </Button>
          ) : (
            <Button
              size="lg"
              loading={wallet.isConnecting}
              onClick={() => void wallet.connect()}
            >
              {wallet.isConnecting ? 'Conectando…' : 'Conectar Wallet'}
            </Button>
          )}
        </div>
      </div>

      {wallet.hasMetaMaskError && (
        <p className="mt-3 text-sm text-rose-300">
          {wallet.error ?? 'MetaMask no detectado.'}{' '}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-rose-200 underline underline-offset-2"
          >
            Descargar MetaMask
          </a>
        </p>
      )}
      {!wallet.isMetaMaskInstalled && !wallet.hasMetaMaskError && !wallet.isConnected && (
        <p className="mt-3 text-sm text-slate-500">
          Necesitas MetaMask en este navegador. Puedes instalarla en{' '}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-300 underline underline-offset-2"
          >
            metamask.io
          </a>
          .
        </p>
      )}
      {wallet.error && !wallet.hasMetaMaskError && (
        <p className="mt-3 text-sm text-rose-300">{wallet.error}</p>
      )}
    </Card>
  )
}

function ConnectedInfo({
  chainId,
  balance,
  onRefresh,
}: {
  chainId: number | null
  balance: string | null
  onRefresh: () => void
}) {
  const isCorrectChain = chainId === hskChain.chainId
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusPill
        tone={
          isCorrectChain
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
            : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
        }
      >
        {isCorrectChain
          ? hskChain.shortName
          : chainId === null
            ? 'Red desconocida'
            : `Red ${chainId} (esperada ${hskChain.chainId})`}
      </StatusPill>
      <button
        type="button"
        onClick={onRefresh}
        className="group flex items-center gap-1.5 font-mono text-sm text-slate-200"
        title="Refrescar saldo"
      >
        <span className="text-emerald-300">◈</span> {balance !== null ? balance : '—'} HSK
      </button>
      {!isCorrectChain && (
        <span className="text-xs text-amber-300/90">
          Cambia de red en MetaMask o desconecta y vuelve a conectar.
        </span>
      )}
    </div>
  )
}
