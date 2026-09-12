export type CreditView = 'register' | 'pay' | 'history'
export interface CreditWorkspaceProps { view: CreditView; onViewChange: (view: CreditView) => void }
