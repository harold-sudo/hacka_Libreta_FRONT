import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../stores/authStore'
import { useWalletStore } from '../../wallet/walletStore'
import { RoleSelectCard } from './RoleSelectCard'
import { Button, Field } from '../../../components/ui/primitives'
import type { RegisterDto } from '../types'

const registerSchema = z.object({email:z.email(),password:z.string().min(8).max(128),role:z.enum(['BORROWER','LENDER']),aliasName:z.string().trim().min(3).max(100),walletAddress:z.string().regex(/^0x[0-9a-fA-F]{40}$/),marketOrCity:z.string().optional(),passportSlug:z.string().optional()})

export function RegisterForm() {
  const { initialRoleForRegister, register: doRegister, isLoading, error, setModalMode } =
    useAuthStore()
  const wallet = useWalletStore()

  const [role, setRole] = useState<'BORROWER' | 'LENDER'>(initialRoleForRegister)
  const [showPassword, setShowPassword] = useState(false)
  const [walletSource, setWalletSource] = useState<'metamask' | 'manual'>(
    wallet.isConnected && wallet.address ? 'metamask' : 'manual'
  )

  const defaultWallet =
    wallet.isConnected && wallet.address
      ? wallet.address
      : ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role,
      aliasName: '',
      email: '',
      password: '',
      walletAddress: defaultWallet,
      marketOrCity: '',
    },
  })

  const handleRoleChange = (newRole: 'BORROWER' | 'LENDER') => {
    setRole(newRole)
    setValue('role', newRole)
  }

  const handleUseMetaMask = async () => {
    if (!wallet.isConnected) {
      await wallet.connect()
    }
    const connectedAddress = useWalletStore.getState().address
    if (connectedAddress) {
      setValue('walletAddress', connectedAddress)
      setWalletSource('metamask')
    }
  }

  const onSubmit = async (data: RegisterDto) => {
    await doRegister({
      ...data,
      role,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 1. Selector de Rol */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          1. Selecciona tu Rol
        </label>
        <RoleSelectCard selectedRole={role} onSelect={handleRoleChange} />
      </div>

      {/* 2. Datos de Identidad */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          2. Datos de tu Cuenta
        </label>

        <Field
          label={
            role === 'BORROWER'
              ? 'Nombre / Alias Comercial en la Feria'
              : 'Nombre de la Microfinanciera o Alias'
          }
          placeholder={
            role === 'BORROWER'
              ? 'Ej. Doña Rosa - Abarrotes Cancha Central'
              : 'Ej. Asociación Microcrédito Cancha'
          }
          autoComplete="name"
          {...register('aliasName', {
            required: 'Por favor ingresa tu nombre o alias comercial',
            minLength: { value: 3, message: 'Mínimo 3 caracteres' },
          })}
          error={errors.aliasName?.message}
        />

        <Field
          label="Correo Electrónico"
          type="email"
          placeholder="tu-correo@ejemplo.com"
          autoComplete="email"
          {...register('email', {
            required: 'El correo electrónico es requerido',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Ingresa un correo electrónico válido',
            },
          })}
          error={errors.email?.message}
        />

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-200">
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            {...register('password', {
              required: 'La contraseña es requerida',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
          />
          {errors.password?.message && (
            <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
          )}
        </div>


      </div>

      {/* 3. Billetera Digital Web3 */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            3. Identidad Digital (Billetera HSK)
          </label>
          <span className="text-[11px] text-emerald-400 font-mono">
            {walletSource === 'metamask'
              ? 'Conectada con MetaMask'

              : 'Personalizada'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Conecta MetaMask o introduce la dirección pública de una wallet HSK que controles. No introduzcas claves privadas ni frases de recuperación.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={walletSource === 'metamask' ? 'primary' : 'outline'}
            onClick={handleUseMetaMask}
          >
            {wallet.isConnected ? 'Usar mi MetaMask' : 'Conectar MetaMask'}
          </Button>

        </div>

        <input
          type="text"
          className="mt-2 w-full font-mono text-xs rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-slate-300 focus:outline-none"
          {...register('walletAddress', {
            required: 'La dirección es obligatoria',
            pattern: {
              value: /^0x[0-9a-fA-F]{40}$/,
              message: 'Debe ser una dirección válida 0x...',
            },
          })}
        />
        {errors.walletAddress?.message && (
          <p className="mt-1 text-xs text-rose-400">
            {errors.walletAddress.message}
          </p>
        )}
      </div>

      {/* Zero PII Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300/90">
        <span className="text-base leading-none">🔒</span>
        <p className="leading-snug">
          <strong>Protección de Privacidad (Zero PII):</strong> Tu identidad real y teléfono nunca se envían a la blockchain. Solo se generan pruebas matemáticas y tu pasaporte de reputación.
        </p>
      </div>

      {wallet.error && <p role="alert" className="text-sm text-amber-300">{wallet.error}</p>}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Botón de Registro */}
      <Button
        type="submit"
        size="lg"
        loading={isLoading}
        className="w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold hover:from-emerald-400 hover:to-teal-500"
      >
        {isLoading
          ? 'Creando cuenta…'
          : `Registrarme como ${
              role === 'BORROWER' ? 'Prestatario / Deudor' : 'Prestamista'
            }`}
      </Button>

      {/* Enlace para cambiar a Login */}
      <div className="text-center pt-1">
        <p className="text-xs text-slate-400">
          ¿Ya tienes una cuenta en CREDITCHAIN?{' '}
          <button
            type="button"
            onClick={() => setModalMode('login')}
            className="font-semibold text-violet-400 hover:underline"
          >
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </form>
  )
}
