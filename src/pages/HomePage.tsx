import { useState } from 'react'
import { useAuth } from '../features/auth/hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { AuthModal } from '../features/auth/components/AuthModal'
import { WelcomeHero } from '../components/WelcomeHero'
import { BorrowerPortal } from '../features/borrower/components/BorrowerPortal'
import { LenderPortal } from '../features/lender/components/LenderPortal'
import { ConnectionCard } from '../components/ConnectionCard'
import { RegisterLoanForm } from '../components/RegisterLoanForm'
import { ConfirmPaymentForm } from '../components/ConfirmPaymentForm'
import { LoanLookup } from '../components/LoanLookup'
import { PollarPayment } from '../features/pollar/PollarPayment'
import { AuditDossier } from '../components/AuditDossier'
import { Tabs } from '../components/Tabs'
import { CONTRACT_ADDRESS, CONTRACT_IS_CONFIGURED, hskChain } from '../lib/web3/config'
import { shortenAddress } from '../lib/web3/utils'

type AdvancedTab = 'pollar' | 'register' | 'payment' | 'lookup' | 'audit'

export function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState<AdvancedTab>('pollar')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isBorrower = user?.role === 'BORROWER'
  const isLender = user?.role === 'LENDER'

  return (
    <div className="space-y-8">
      {/* 1. Barra de Navegación con Estado de Sesión */}
      <Navbar />

      {/* 2. Modal de Autenticación (Login / Registro) */}
      <AuthModal />

      {/* 3. Contenido Principal según Estado */}
      {!isAuthenticated ? (
        /* Vista de Bienvenida para Primeros Usuarios */
        <WelcomeHero />
      ) : (
        /* Vistas Personalizadas por Rol */
        <div className="space-y-8">
          {isBorrower && (
            <BorrowerPortal
              onOpenPollar={() => {
                setShowAdvanced(true)
                setTab('pollar')
              }}
            />
          )}

          {isLender && (
            <LenderPortal
              onOpenAdvanced={() => {
                setShowAdvanced(true)
                setTab('pollar')
              }}
            />
          )}

          {!isBorrower && !isLender && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-center">
              <h3 className="text-base font-bold text-white">
                Bienvenido, {user?.aliasName} ({user?.role})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Billetera: {user?.walletAddress}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Sección Colapsable: Herramientas Técnicas Web3 y Contratos */}
      <div className="pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">⚙️</span>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                Herramientas Avanzadas & Smart Contracts (HSK & Pollar)
              </h4>
              <p className="text-xs text-slate-400">
                Conexión directa MetaMask, anclajes de contrato y pruebas de cuota
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-violet-300">
              {showAdvanced ? 'Ocultar ▲' : 'Explorar ▼'}
            </span>
          </div>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6 animate-fadeIn">
            {/* Información del contrato */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950 p-3 text-xs text-slate-400">
              <span>
                Contrato CREDITCHAIN (LibretaRegistry):{' '}
                <a
                  href={`${hskChain.explorerUrl}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-300 hover:underline"
                >
                  {shortenAddress(CONTRACT_ADDRESS)}
                </a>
              </span>
              <span>
                {CONTRACT_IS_CONFIGURED
                  ? `Red: ${hskChain.name} (${hskChain.chainId})`
                  : '⚠ Configura VITE_HSK_CONTRACT_ADDRESS'}
              </span>
            </div>

            {/* Conexión MetaMask */}
            <ConnectionCard />

            {/* Pestañas Técnicas */}
            <Tabs<AdvancedTab>
              active={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'pollar',
                  label: 'Pagar con Pollar',
                  description: 'USDC de prueba en Stellar',
                  content: <PollarPayment key={user?.id ?? 'guest'} />,
                },
                {
                  id: 'register',
                  label: 'Registrar Crédito',
                  description: 'Solo contrato; no crea cuotas en Supabase',
                  content: <RegisterLoanForm />,
                },
                {
                  id: 'payment',
                  label: 'Confirmar Pago',
                  description: 'Solo contrato; no concilia cuotas',
                  content: <ConfirmPaymentForm />,
                },
                {
                  id: 'lookup',
                  label: 'Consultar Crédito',
                  description: 'Estado y pruebas de pago',
                  content: <LoanLookup />,
                },
                {
                  id: 'audit',
                  label: 'Auditar Crédito (Unlock)',
                  description: 'Expediente forense token-gated',
                  content: <AuditDossier />,
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* 5. Pie de Página Institucional */}
      <footer className="border-t border-white/10 pt-4 text-center text-xs text-slate-500">
        <p>
          CREDITCHAIN · Microcrédito Verificable & Inclusión Financiera · Zero PII on-chain
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          HashKey HSK Chain (Track Tecnológico) · Pollar Engine · Unlock Protocol · ETH Bolivia Buildathon 2026
        </p>
      </footer>
    </div>
  )
}
