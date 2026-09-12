import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../lib/httpClient'
import { useAuthStore } from '../auth/stores/authStore'
export interface Intent {
  id: string; installment_id: string; sender: string; recipient: string; amount: string | number; issuer: string;
  status: 'CREATED' | 'VERIFIED' | 'ANCHORED'; tx_hash: string | null; receipt_hash: string | null;
  hsk_tx_hash: string | null; hsk_contract: string; anchor_error: string | null;
}
export interface Snapshot {
  profile: { id: string; role: 'BORROWER' | 'LENDER'; wallet_address: string };
  receivingAddress: string | null;
  loans: { id: string; capital: number | string; hsk_verification: 'VERIFIED' | 'NOT_FOUND' | 'UNAVAILABLE'; status: string; currency: string; settlement_network: string | null; installments: {
    id: string; installment_number: number; amount: number; due_date: string; status: string; hsk_sync_status: string; hsk_verified: boolean;
  }[] }[];
  intents: Intent[];
}
export function useSettlements() {
  const user = useAuthStore(s => s.user)
  return useQuery({queryKey: ['settlements', user?.id], enabled: !!user,
    queryFn: async () => (await httpClient.get<{success: boolean; data: Snapshot}>('/api/pollar/settlements')).data,
    retry: false, refetchInterval: user ? 5000 : false})
}
