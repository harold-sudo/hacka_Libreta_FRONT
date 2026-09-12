import { useAuthStore } from '../features/auth/stores/authStore'
import { shortenAddress } from '../lib/web3/utils'
import { hskChain } from '../lib/web3/config'
import { Button } from './ui/primitives'

export function Navbar() {
  const { user, isAuthenticated, logout, openLoginModal, openRegisterModal } =
    useAuthStore()

  const isBorrower = user?.role === 'BORROWER'

  return (
    <header className="sticky top-0 z-40 -mx-6 -mt-10 mb-8 border-b border-white/10 bg-[#070a12]/80 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="CREDITCHAIN" className="h-9 w-9 drop-shadow" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                CREDITCHAIN
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                {hskChain.shortName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Microcrédito Verificable & Reputación Soberana
            </p>
          </div>
        </div>

        {/* Right side: Session State */}
        <div className="flex flex-wrap items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Role & Alias Badge */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                      isBorrower
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border border-violet-500/30 bg-violet-500/10 text-violet-300'
                    }`}
                  >
                    {isBorrower ? 'PRESTATARIO (DEUDOR)' : 'PRESTAMISTA'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100">
                  {user.aliasName}
                </p>
                {user.walletAddress && (
                  <p className="font-mono text-[11px] text-slate-400">
                    {shortenAddress(user.walletAddress)}
                  </p>
                )}
              </div>

              {/* Botón Cerrar Sesión */}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-xs text-slate-400 hover:text-rose-300"
              >
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Iniciar Sesión */}
              <Button variant="ghost" size="sm" onClick={openLoginModal}>
                Iniciar Sesión
              </Button>

              {/* Crear Cuenta (Destacado) */}
              <Button
                size="sm"
                onClick={() => openRegisterModal('BORROWER')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold shadow-md shadow-emerald-950/50 hover:from-emerald-400 hover:to-teal-500"
              >
                Crear Cuenta
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
