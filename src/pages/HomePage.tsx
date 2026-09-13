import { useState } from 'react'
import { sharedDossier } from '../features/loans/shareDossier'
import { useAuth } from '../features/auth/hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { AuthModal } from '../features/auth/components/AuthModal'
import { WelcomeHero } from '../components/WelcomeHero'
import { BorrowerPortal } from '../features/borrower/components/BorrowerPortal'
import { LenderPortal } from '../features/lender/components/LenderPortal'
import { PollarPayment } from '../features/pollar/PollarPayment'
import { AuditDossier } from '../components/AuditDossier'
import type { CreditView } from '../features/pollar/workspace'

type WorkspaceTab = CreditView | 'audit'
export function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState<WorkspaceTab>(() => sharedDossier(window.location.hash) ? 'audit' : 'history')
  const [creditView, setCreditView] = useState<CreditView>('history')
  const [auditOpened, setAuditOpened] = useState(() => Boolean(sharedDossier(window.location.hash)))
  function navigate(next: WorkspaceTab) {
    setTab(next)
    if (next === 'audit') setAuditOpened(true)
    else setCreditView(next)
    document.getElementById('credit-workspace')?.scrollIntoView({behavior:'smooth', block:'start'})
  }
  const tabs: {id:WorkspaceTab; label:string; description:string}[] = [
    ...(user?.role === 'LENDER' ? [{id:'register' as const, label:'Registrar crédito',description:'Cuotas y registro HSK en un solo paso'}] : []),
    {id:'pay',label:'Pagar cuotas',description:'USDC con Pollar · confirmación HSK automática'},
    {id:'history',label:'Créditos y comprobantes',description:'Cuotas, pagos Stellar y evidencia HSK'},
    {id:'audit',label:'Auditoría Unlock',description:'Membresía para consultar el expediente'},
  ]
  return <div className="space-y-8">
    <Navbar /><AuthModal />
    {!isAuthenticated ? <WelcomeHero /> : <details className="rounded-2xl border border-white/10 p-5">
      <summary className="cursor-pointer font-semibold">Resumen de mi cuenta · {user?.aliasName}</summary>
      <div className="mt-5">
        {user?.role === 'BORROWER' && <BorrowerPortal onOpenPollar={() => navigate('pay')} />}
        {user?.role === 'LENDER' && <LenderPortal onOpenAdvanced={() => navigate('register')} />}
      </div>
    </details>}
    <section id="credit-workspace" className="scroll-mt-4 space-y-5">
      <div><h2 className="text-xl font-bold">Mis créditos, del pago al comprobante</h2>
        <p className="mt-2 text-sm text-slate-400">Pollar procesa el pago. HSK conserva su comprobante. Unlock controla el acceso a la vista de auditoría.</p></div>
      <nav aria-label="Operaciones del crédito" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)} className={`rounded-xl border p-4 text-left ${tab === item.id ? 'border-violet-400/50 bg-violet-500/15 text-violet-100' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
          <span className="block font-semibold">{item.label}</span><span className="mt-1 block text-xs text-slate-400">{item.description}</span>
        </button>)}
      </nav>
      {/* Keep the payment provider mounted while navigating: an in-flight payment must retain its hash and recovery state. */}
      <div hidden={tab === 'audit'}><PollarPayment key={user?.id ?? 'guest'} view={creditView} onViewChange={navigate} /></div>
      {auditOpened && <div hidden={tab !== 'audit'}><AuditDossier /></div>}
    </section>
    <footer className="border-t border-white/10 pt-4 text-center text-xs text-slate-500">CREDITCHAIN · Pollar + HSK + Unlock · Testnet</footer>
  </div>
}
