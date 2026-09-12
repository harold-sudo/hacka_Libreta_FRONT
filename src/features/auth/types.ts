export type UserRole = 'BORROWER' | 'LENDER' | 'COLLECTOR' | 'AUDITOR'

export interface AuthUser {
  id: string
  profileId?: string
  email: string
  role: UserRole
  aliasName: string
  walletAddress: string
  passportSlug?: string
  passportEnabled?: boolean
  marketOrCity?: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  role: 'BORROWER' | 'LENDER'
  aliasName: string
  walletAddress: string
  marketOrCity?: string
  passportSlug?: string
}

export interface AuthResponse {
  success: boolean
  accessToken?: string
  expiresAt?: number
  user?: AuthUser
  message?: string
}
