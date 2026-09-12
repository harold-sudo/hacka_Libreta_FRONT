import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { Button, Field } from '../../../components/ui/primitives'
import type { LoginDto } from '../types'

export function LoginForm() {
  const { login, isLoading, error, setModalMode } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginDto) => {
    await login(data)
  }

  return (
    <div className="space-y-5">
      {/* 1. Formulario Tradicional de Correo y Contraseña */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Correo Electrónico"
          type="email"
          placeholder="tu-correo@ejemplo.com"
          autoComplete="username"
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
            placeholder="Tu contraseña"
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            {...register('password', {
              required: 'La contraseña es requerida',
            })}
          />
          {errors.password?.message && (
            <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          className="w-full justify-center bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold hover:from-violet-500 hover:to-indigo-500"
        >
          {isLoading ? 'Iniciando sesión…' : 'Ingresar a mi cuenta'}
        </Button>
      </form>

      {/* Enlace para ir a Registro */}
      <div className="text-center pt-1 border-t border-white/5">
        <p className="text-xs text-slate-400">
          ¿Primera vez en CREDITCHAIN?{' '}
          <button
            type="button"
            onClick={() => setModalMode('register')}
            className="font-semibold text-emerald-400 hover:underline"
          >
            Crea tu cuenta gratis aquí
          </button>
        </p>
      </div>
    </div>
  )
}
