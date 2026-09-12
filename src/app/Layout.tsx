import { Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(134,59,255,0.15),transparent)]" />
      <div className="relative">
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}