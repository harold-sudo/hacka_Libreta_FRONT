import { useAuthStore } from '../features/auth/stores/authStore'
import { Button } from './ui/primitives'

export function WelcomeHero() {
  const { openRegisterModal, openLoginModal } = useAuthStore()

  return (
    <div className="space-y-10 py-4">
      {/* Encabezado Principal */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
          <span>⚡ ETH Bolivia Buildathon 2026</span>
          <span className="text-slate-500">•</span>
          <span>Zero PII On-Chain</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          El crédito tradicional de la feria,{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            ahora en CREDITCHAIN
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Diseñado para comerciantes y microfinancieras populares. Consulta tus cuotas, verifica pagos de prueba en Stellar y sigue el estado de sus comprobantes en HSK.
        </p>
      </div>

      {/* Tarjetas de Rol Interactivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Opción 1: Prestatario / Deudor */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 via-slate-900/40 to-slate-950 p-6 shadow-xl transition-all hover:border-emerald-400 hover:shadow-emerald-950/40">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl" role="img" aria-label="Comercio">
                🏪
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                COMERCIANTE / DEUDOR
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Soy Prestatario / Deudor
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Tengo un puesto o negocio y quiero llevar el control transparente de mis microcréditos sin abusos.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Tu CREDITCHAIN en tu celular:</strong> Visualiza tus cuotas pagadas y saldo pendiente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Pagos Pollar:</strong> Abona cuotas con USDC de prueba desde tu wallet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Comprobantes verificables:</strong> Consulta el pago y el estado de su anclaje HSK.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 space-y-2 pt-4 border-t border-white/5">
            <Button
              size="lg"
              onClick={() => openRegisterModal('BORROWER')}
              className="w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-600 font-bold hover:from-emerald-400 hover:to-teal-500"
            >
              Crear Cuenta de Prestatario
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openLoginModal}
              className="w-full justify-center text-xs"
            >
              Ya tengo cuenta · Iniciar Sesión
            </Button>
          </div>
        </div>

        {/* Opción 2: Prestamista / Acreedor */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-950/30 via-slate-900/40 to-slate-950 p-6 shadow-xl transition-all hover:border-violet-400 hover:shadow-violet-950/40">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl" role="img" aria-label="Finanzas">
                💼
              </span>
              <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                MICROFINANCIERA / ACREEDOR
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Soy Prestamista / Acreedor
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Financio capital de trabajo a comerciantes y quiero respaldo criptográfico y control de cobranza.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-violet-400 font-bold">✓</span>
                <span>
                  <strong>Anclaje inmutable:</strong> Registra créditos y consulta sus pruebas en HSK testnet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 font-bold">✓</span>
                <span>
                  <strong>Wallet de cobro:</strong> Configura la dirección Stellar que recibirá los pagos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 font-bold">✓</span>
                <span>
                  <strong>Cartera actualizada:</strong> Consulta créditos y cuotas cobradas por moneda.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 space-y-2 pt-4 border-t border-white/5">
            <Button
              size="lg"
              onClick={() => openRegisterModal('LENDER')}
              className="w-full justify-center bg-gradient-to-r from-violet-600 to-indigo-600 font-bold hover:from-violet-500 hover:to-indigo-500"
            >
              Crear Cuenta de Prestamista
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openLoginModal}
              className="w-full justify-center text-xs"
            >
              Ya tengo cuenta · Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
