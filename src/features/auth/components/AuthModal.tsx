import { useAuthStore } from '../stores/authStore'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { cn } from '../../../lib/cn'
import { Logo } from '../../../components/Logo'

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, setModalMode } =
    useAuthStore()

  if (!authModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c101d] p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-slate-100"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* Encabezado con logo */}
        <div className="flex items-center gap-3">
          <Logo size="h-8" />
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {authModalMode === 'login'
                ? 'Iniciar Sesión en CREDITCHAIN'
                : 'Crear Cuenta en CREDITCHAIN'}
            </h3>
            <p className="text-xs text-slate-400">
              {authModalMode === 'login'
                ? 'Accede a tu crédito digital y pasaporte crediticio'
                : 'Únete para digitalizar tus microcréditos con total transparencia en CREDITCHAIN'}
            </p>
          </div>
        </div>

        {/* Switch Selector entre Login y Register */}
        <div className="my-5 flex rounded-xl bg-slate-900/80 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setModalMode('login')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition',
              authModalMode === 'login'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setModalMode('register')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition',
              authModalMode === 'register'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Crear Cuenta (Registro)
          </button>
        </div>

        {/* Contenido del Formulario */}
        {authModalMode === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  )
}
