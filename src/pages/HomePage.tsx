import { useQuery } from '@tanstack/react-query'

async function fetchStatus() {
  return { status: 'ok', service: 'Libreta frontend' }
}

export function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Libreta</h1>
      <p className="text-gray-600">
        {isLoading ? 'Cargando...' : `Estado: ${data?.status}`}
      </p>
    </div>
  )
}
