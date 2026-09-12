import { useAuthStore } from '../../auth/stores/authStore'
import { useSettlements } from '../../pollar/useSettlements'
import { Button, Card } from '../../../components/ui/primitives'
export function LenderPortal({onOpenAdvanced}: {onOpenAdvanced?: () => void}) {
  const user = useAuthStore(s => s.user)
  const snapshot = useSettlements()
  const currencies = [...new Set(snapshot.data?.loans.map(l => l.currency) ?? [])]
  return <div className="space-y-5">
    <h2 className="text-xl font-bold">Mi cartera · {user?.aliasName}</h2>
    {snapshot.isPending && <p>Cargando cartera…</p>}
    {snapshot.error && <p role="alert">No se pudo consultar la cartera: {snapshot.error.message}</p>}
    {snapshot.data && <>
      <p>{snapshot.data.loans.filter(l => l.status === 'ACTIVE').length} créditos activos · {snapshot.data.loans.length} registrados</p>
      {!snapshot.data.loans.length && <p>Todavía no tienes créditos registrados.</p>}
      {currencies.map(currency => {
        const loans = snapshot.data!.loans.filter(l => l.currency === currency)
        const capital = loans.reduce((sum,l) => sum + Math.round(Number(l.capital)*100),0)/100
        const paid = loans.flatMap(l => l.installments).filter(i => i.status === 'PAID')
        const collected = paid.reduce((sum,i) => sum + Math.round(Number(i.amount)*100),0)/100
        return <Card key={currency} className="p-4 space-y-2">
          <p>Capital registrado: {capital.toFixed(2)} {currency}</p>
          <p>Cuotas cobradas: {collected.toFixed(2)} {currency} · {paid.length} cuotas</p>
          <p>Comprobantes HSK verificados: {loans.flatMap(l => l.installments).filter(i => i.hsk_verified).length}</p>
          <p>Créditos sin respaldo HSK verificado: {loans.filter(l => l.hsk_verification !== 'VERIFIED').length}</p>
        </Card>
      })}
      <p className="text-sm break-all">Wallet Stellar de cobro: {snapshot.data.receivingAddress ?? 'Sin configurar'}</p>
    </>}
    <Button onClick={onOpenAdvanced}>Configurar cobros y crear crédito</Button>
    <p className="text-xs text-slate-400">En Registrar crédito conecta tu wallet de cobro y completa los datos del crédito. Se requiere el ID de perfil y la dirección HSK del prestatario registrado.</p>
  </div>
}
