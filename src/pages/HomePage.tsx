import { useState } from 'react'
import { ConnectionCard } from '../components/ConnectionCard'
import { ConfirmPaymentForm } from '../components/ConfirmPaymentForm'
import { LoanLookup } from '../components/LoanLookup'
import { RegisterLoanForm } from '../components/RegisterLoanForm'
import { Tabs } from '../components/Tabs'
import { CodeText } from '../components/ui/primitives'
import { CONTRACT_ADDRESS, CONTRACT_IS_CONFIGURED, hskChain } from '../lib/web3/config'
import { shortenAddress } from '../lib/web3/utils'

type DashboardTab = 'register' | 'payment' | 'lookup'

export function HomePage() {
  const [tab, setTab] = useState<DashboardTab>('register')

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Libreta" className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">LIBRETA</h1>
            <p className="text-sm text-slate-400">
              Registro descentralizado de microcréditos · <CodeText>{hskChain.shortName}</CodeText>
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>
            Contrato{' '}
            <a
              href={`${hskChain.explorerUrl}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-violet-300/90 hover:underline"
            >
              {shortenAddress(CONTRACT_ADDRESS)}
            </a>
          </p>
          <p className="mt-0.5">
            {CONTRACT_IS_CONFIGURED
              ? `Red: ${hskChain.name} (${hskChain.chainId})`
              : '⚠ Configura VITE_HSK_CONTRACT_ADDRESS'}
          </p>
        </div>
      </header>

      <ConnectionCard />

      <Tabs<DashboardTab>
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'register',
            label: 'Registrar Crédito',
            description: 'Anclar un nuevo microcrédito',
            content: <RegisterLoanForm />,
          },
          {
            id: 'payment',
            label: 'Confirmar Pago',
            description: 'Sellar una cuota abonada',
            content: <ConfirmPaymentForm />,
          },
          {
            id: 'lookup',
            label: 'Consultar Crédito',
            description: 'Estado y pruebas de pago',
            content: <LoanLookup />,
          },
        ]}
      />

      <footer className="border-t border-white/10 pt-4 text-center text-xs text-slate-600">
        LIBRETA · Zero PII on-chain · HashKey HSK Chain · ETH Bolivia Buildathon 2026
      </footer>
    </div>
  )
}