import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
export function useAuth() {
  const initAuth = useAuthStore(s => s.initAuth)
  useEffect(() => { void initAuth() }, [initAuth])
  return useAuthStore()
}
