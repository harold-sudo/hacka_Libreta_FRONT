export const LIBRETA_ABI = [
  {
    type: 'function',
    name: 'registerLoan',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_loanId', type: 'bytes32', internalType: 'bytes32' },
      { name: '_loanHash', type: 'bytes32', internalType: 'bytes32' },
      { name: '_borrower', type: 'address', internalType: 'address' },
      { name: '_totalInstallments', type: 'uint16', internalType: 'uint16' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'confirmPayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_loanId', type: 'bytes32', internalType: 'bytes32' },
      { name: '_installmentNumber', type: 'uint16', internalType: 'uint16' },
      { name: '_receiptHash', type: 'bytes32', internalType: 'bytes32' },
      { name: '_isDigital', type: 'bool', internalType: 'bool' },
      { name: '_externalTxHash', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'loans',
    stateMutability: 'view',
    inputs: [{ name: 'loanId', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct LibretaRegistry.Loan',
        components: [
          { name: 'loanHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'lender', type: 'address', internalType: 'address' },
          { name: 'borrower', type: 'address', internalType: 'address' },
          { name: 'totalInstallments', type: 'uint16', internalType: 'uint16' },
          { name: 'paidInstallments', type: 'uint16', internalType: 'uint16' },
          { name: 'createdAt', type: 'uint256', internalType: 'uint256' },
          { name: 'completedAt', type: 'uint256', internalType: 'uint256' },
          { name: 'status', type: 'uint8', internalType: 'enum LibretaRegistry.LoanStatus' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getLoanProofs',
    stateMutability: 'view',
    inputs: [{ name: '_loanId', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct LibretaRegistry.PaymentProof[]',
        components: [
          { name: 'receiptHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'installmentNumber', type: 'uint16', internalType: 'uint16' },
          { name: 'timestamp', type: 'uint256', internalType: 'uint256' },
          { name: 'isDigital', type: 'bool', internalType: 'bool' },
          { name: 'externalTxHash', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getBorrowerLoanCount',
    stateMutability: 'view',
    inputs: [{ name: '_borrower', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'borrowerLoans',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'PaymentConfirmed',
    inputs: [
      { name: 'loanId', type: 'bytes32', indexed: true },
      { name: 'installmentNumber', type: 'uint16', indexed: true },
      { name: 'receiptHash', type: 'bytes32', indexed: false },
      { name: 'isDigital', type: 'bool', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const

export const LoanStatus = {
  CREATED: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  DEFAULTED: 3,
} as const

const STATUS_LABELS: Record<number, string> = {
  [LoanStatus.CREATED]: 'CREATED',
  [LoanStatus.ACTIVE]: 'ACTIVE',
  [LoanStatus.COMPLETED]: 'COMPLETED',
  [LoanStatus.DEFAULTED]: 'DEFAULTED',
}

export function statusLabel(status: number): string {
  return STATUS_LABELS[status] ?? `DESCONOCIDO(${status})`
}

export interface Loan {
  loanId?: string
  loanHash: string
  lender: string
  borrower: string
  totalInstallments: number
  paidInstallments: number
  createdAt: bigint
  completedAt: bigint
  status: number
}

export interface PaymentProof {
  receiptHash: string
  installmentNumber: number
  timestamp: bigint
  isDigital: boolean
  externalTxHash: string
  hskTxHash?: string
  blockNumber?: number
}

export function statusTone(status: number): string {
  switch (status) {
    case LoanStatus.COMPLETED:
      return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
    case LoanStatus.CREATED:
    case LoanStatus.ACTIVE:
      return 'text-sky-400 border-sky-400/30 bg-sky-400/10'
    case LoanStatus.DEFAULTED:
      return 'text-rose-400 border-rose-400/30 bg-rose-400/10'
    default:
      return 'text-slate-300 border-slate-500/30 bg-slate-500/10'
  }
}