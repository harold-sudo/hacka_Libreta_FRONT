import { useAuthStore } from '../../auth/stores/authStore'
import { useSettlements } from '../../pollar/useSettlements'
import { Button, Card } from '../../../components/ui/primitives'
export function BorrowerPortal({onOpenPollar}: {onOpenPollar?: () => void}) {
  const user = useAuthStore(s => s.user)
  const snapshot = useSettlements()
  return <div className="space-y-5">
    <h2 className="text-xl font-bold">Mi CREDITCHAIN · {user?.aliasName}</h2>
    <Card className="p-4 space-y-2 text-sm break-all">
      <p>Comparte estos datos con tu prestamista para asignar un crédito.</p>
      <p>ID de perfil: {user?.profileId}</p><p>Dirección HSK: {user?.walletAddress}</p>
    </Card>
    {snapshot.isPending && <p>Cargando créditos…</p>}
    {snapshot.error && <p role="alert">No se pudieron consultar tus créditos: {snapshot.error.message}</p>}
    {snapshot.data && !snapshot.data.loans.length && <p>Aún no tienes créditos registrados.</p>}
    {snapshot.data?.loans.map(loan => <Card key={loan.id} className="p-4 space-y-3">
      <p className="break-all">Crédito {loan.id} · {loan.currency} · {loan.status}</p>
      {loan.hsk_verification !== 'VERIFIED' && <p className="text-amber-300">{loan.hsk_verification === 'NOT_FOUND' ? 'Este crédito no aparece en el contrato HSK actual.' : 'No se pudo verificar el crédito en HSK.'}</p>}
      <p>{loan.installments.filter(i => i.status === 'PAID').length} de {loan.installments.length} cuotas pagadas</p>
      {[...loan.installments].sort((a,b) => a.installment_number-b.installment_number).map(i => <div key={i.id} className="border-t border-white/10 pt-2 text-sm">
        Cuota {i.installment_number} · {i.amount} {loan.currency} · Vence {i.due_date} · {i.status} · HSK: {i.hsk_verified ? 'Comprobante verificado' : 'Sin comprobante verificado'}
      </div>)}
    </Card>)}
    <Button onClick={onOpenPollar}>Abrir cuotas y pagos Pollar</Button>
    <p className="text-xs text-slate-400">Los cobros por OTP y la publicación del pasaporte no están habilitados en este panel. No se generan códigos ni puntajes de demostración.</p>
  </div>
}
