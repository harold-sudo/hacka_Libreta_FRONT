import { create } from 'zustand'
import { httpClient, setApiAccessToken, onUnauthorized } from '../../../lib/httpClient'
import { queryClient } from '../../../lib/queryClient'
import type { AuthResponse, AuthUser, LoginDto, RegisterDto } from '../types'

const STORAGE_KEY = 'libreta_session_v2'
let generation = 0
interface AuthState {
  user: AuthUser | null; token: string | null; isAuthenticated: boolean; isLoading: boolean; initialized: boolean
  error: string | null; authModalOpen: boolean; authModalMode: 'login' | 'register'; initialRoleForRegister: 'BORROWER' | 'LENDER'
  openLoginModal: () => void; openRegisterModal: (role?: 'BORROWER' | 'LENDER') => void; closeAuthModal: () => void
  setModalMode: (mode: 'login' | 'register') => void; clearError: () => void
  login: (dto: LoginDto) => Promise<void>; register: (dto: RegisterDto) => Promise<void>
  logout: () => void; initAuth: () => Promise<void>
}
function save(token: string | null) {
  try { if (token) sessionStorage.setItem(STORAGE_KEY, token); else sessionStorage.removeItem(STORAGE_KEY) } catch { /* Session stays in memory. */ }
}
export const useAuthStore = create<AuthState>((set, get) => {
  const accept = (res: AuthResponse) => {
    if (!res.accessToken || !res.user) throw new Error(res.message || 'No se pudo iniciar sesión')
    queryClient.clear(); setApiAccessToken(res.accessToken); save(res.accessToken)
    set({ user: res.user, token: res.accessToken, isAuthenticated: true, initialized: true, isLoading: false, authModalOpen: false, error: null })
  }
  return {
    user:null, token:null, isAuthenticated:false, isLoading:false, initialized:false, error:null,
    authModalOpen:false, authModalMode:'login', initialRoleForRegister:'BORROWER',
    openLoginModal: () => set({authModalOpen:true,authModalMode:'login',error:null}),
    openRegisterModal: (role='BORROWER') => set({authModalOpen:true,authModalMode:'register',initialRoleForRegister:role,error:null}),
    closeAuthModal: () => set({authModalOpen:false,error:null}),
    setModalMode: mode => set({authModalMode:mode,error:null}), clearError: () => set({error:null}),
    login: async dto => {
      const current=++generation; set({isLoading:true,error:null})
      try { const res=await httpClient.post<AuthResponse>('/api/auth/login',dto); if(current===generation) accept(res) }
      catch(error) { if(current===generation) set({isLoading:false,error:error instanceof Error?error.message:'No se pudo iniciar sesión'}) }
    },
    register: async dto => {
      const current=++generation; set({isLoading:true,error:null})
      try {
        const res=await httpClient.post<AuthResponse>('/api/auth/register',dto)
        if(current!==generation) return
        if(!res.accessToken) { set({isLoading:false,authModalMode:'login',error:res.message || 'Cuenta creada. Inicia sesión.'}); return }
        accept(res)
      } catch(error) { if(current===generation) set({isLoading:false,error:error instanceof Error?error.message:'No se pudo registrar la cuenta'}) }
    },
    logout: () => {
      generation++; setApiAccessToken(null); save(null); queryClient.clear()
      set({user:null,token:null,isAuthenticated:false,isLoading:false,initialized:true,error:null})
    },
    initAuth: async () => {
      if(get().initialized) return
      set({initialized:true})
      const current=++generation
      let token: string | null=null
      try { localStorage.removeItem('libreta_session_v1'); token=sessionStorage.getItem(STORAGE_KEY) } catch { /* unavailable storage */ }
      if(!token) return
      setApiAccessToken(token); set({isLoading:true})
      try {
        const res=await httpClient.get<AuthResponse>('/api/auth/me')
        if(current!==generation) return
        if(!res.user) throw new Error('Perfil no disponible')
        accept({...res,accessToken:token})
      } catch { if(current===generation) { get().logout(); set({error:'La sesión no pudo validarse. Vuelve a iniciar sesión.'}) } }
    },
  }
})

onUnauthorized(() => { useAuthStore.getState().logout(); useAuthStore.getState().openLoginModal() })
