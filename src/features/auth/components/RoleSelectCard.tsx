import { cn } from '../../../lib/cn'

interface RoleSelectCardProps {
  selectedRole: 'BORROWER' | 'LENDER'
  onSelect: (role: 'BORROWER' | 'LENDER') => void
}

export function RoleSelectCard({ selectedRole, onSelect }: RoleSelectCardProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Opción 1: Prestatario / Deudor */}
      <button
        type="button"
        onClick={() => onSelect('BORROWER')}
        className={cn(
          'relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
          selectedRole === 'BORROWER'
            ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-950/50'
            : 'border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-800/60'
        )}
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-2xl" role="img" aria-label="Comercio">
            🏪
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide',
              selectedRole === 'BORROWER'
                ? 'bg-emerald-400/20 text-emerald-300'
                : 'bg-white/5 text-slate-400'
            )}
          >
            Feria & Comercio
          </span>
        </div>
        <h4 className="mt-3 font-semibold text-slate-100">
          Prestatario / Deudor
        </h4>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          Comerciante o emprendedor. Administra tus cuotas, paga cuotas en USDC de prueba, y construye tu <strong>CREDITCHAIN Passport</strong>.
        </p>
      </button>

      {/* Opción 2: Prestamista / Acreedor */}
      <button
        type="button"
        onClick={() => onSelect('LENDER')}
        className={cn(
          'relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all',
          selectedRole === 'LENDER'
            ? 'border-violet-400 bg-violet-950/30 ring-2 ring-violet-400/40 shadow-lg shadow-violet-950/50'
            : 'border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-800/60'
        )}
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-2xl" role="img" aria-label="Finanzas">
            💼
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide',
              selectedRole === 'LENDER'
                ? 'bg-violet-400/20 text-violet-300'
                : 'bg-white/5 text-slate-400'
            )}
          >
            Microfinanciera
          </span>
        </div>
        <h4 className="mt-3 font-semibold text-slate-100">
          Prestamista / Acreedor
        </h4>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          Otorga microcréditos, configura tu wallet de cobro, supervisa las cuotas y ancla atestaciones en HSK Chain.
        </p>
      </button>
    </div>
  )
}
