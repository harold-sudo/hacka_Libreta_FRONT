> **Estado Pollar — 2026-09-12:** integración de cuotas implementada para Stellar testnet y HSK 133: intenciones autenticadas, verificación del pago, conciliación SQL idempotente y anclaje HSK con recuperación. Migración aplicada y verificada en Supabase; falta validar una cuota real de testnet. La transferencia libre no liquida cuotas. Las referencias posteriores a Ethereum/Mainnet, webhooks de liquidación o widgets antiguos son diseño histórico. [Contrato vigente y activación paso a paso](POLLAR_INSTALLMENTS.md).

# ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA DEL FRONTEND (PWA) — LIBRETA

**Proyecto:** LIBRETA — Microcrédito Verificable & Portabilidad de Reputación Financiera  
**Hackathon:** ETH Bolivia Buildathon 2026 (Cochabamba)  
**Tracks:** Bolivia Hackathon | Real-World Ethereum Applications | HSK Chain Track  
**Bounties:** Pollar Engine (1 USDC Mainnet) | Unlock Protocol (Token-Gated Content Portal)  
**Versión:** 2.0.0 (Especificación Técnica Definitiva)  
**Stack Principal:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Zustand, IndexedDB (`idb-keyval`)  

---

## 1. VISIÓN GENERAL Y PROPÓSITO ARQUITECTÓNICO

El frontend de **LIBRETA** es una **Progressive Web Application (PWA)** de grado de producción concebida para operar en mercados informales y ferias populares de América Latina (como "La Cancha" en Cochabamba, Bolivia). El sistema resuelve la brecha de conectividad física que sufren los cobradores de ruta mediante una arquitectura **Offline-First**, al mismo tiempo que provee a prestatarios, prestamistas y auditores bancarios interfaces reactivas de alta fidelidad conectadas a contratos inteligentes en **HSK Chain**, liquidaciones en **1 USDC Mainnet con Pollar** y acceso token-gated con **Unlock Protocol**.

### 1.1. Diagrama de Capas de la Aplicación Cliente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LIBRETA FRONTEND (PWA ARCHITECTURE)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. CAPA DE VISTAS & COMPONENTES (React 19 + Tailwind CSS v4)                │
│    ├── Portal Prestatario: /borrower (Libreta digital, OTP, Checkout Pollar)│
│    ├── Modo Cobrador PWA: /collector (Ruta diaria, Scanner QR, Offline UI)  │
│    ├── Panel Prestamista: /lender (Dashboard KPIs, Originación de crédito)  │
│    └── Pasaporte Soberano: /p/:slug (Resumen público + Paywall Unlock)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. CAPA DE ENRUTAMIENTO & CONTROL DE ACCESO (React Router v7)               │
│    ├── ProtectedRoute (Guard de roles: BORROWER, COLLECTOR, LENDER, AUDITOR)│
│    └── PublicRoute (/login, /p/:slug, landing institucional)                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. CAPA DE ESTADO Y SINCRONIZACIÓN                                          │
│    ├── TanStack Query v5: Servidor remoto, caché y revalidación reactiva    │
│    ├── Zustand Stores: authStore, networkStore, syncQueueStore              │
│    └── IndexedDB Engine (idb-keyval): Persistencia offline transaccional    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. CAPA DE INTEGRACIONES WEB3 & PROTOCOLOS EXTERNOS                         │
│    ├── Pollar Engine SDK (@pollar/react): Pagos en 1 USDC en Mainnet        │
│    ├── Unlock Protocol (@unlock-protocol/paywall): Token-Gated Locks NFT   │
│    └── HSK Chain RPC Client (viem): Lectura directa de eventos on-chain     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. CAPA DE COMUNICACIÓN HTTP (httpClient.ts)                                │
│    └── Fetch API wrapper hacia NestJS Backend Gateway (Supabase + Auth JWT) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. STACK TECNOLÓGICO Y DEPENDENCIAS CLAVE

| Dependencia | Versión | Rol en el Frontend | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **React** | `^19.2.8` | Núcleo de UI | Acciones nativas, renderizado concurrente y componentes ultra-livianos. |
| **Vite** | `^8.3.0` | Bundler & DevServer | Tiempos de recarga en caliente (HMR) submilisegundos y code-splitting eficiente. |
| **TypeScript** | `~6.0.2` | Tipado Estricto | Garantía de integridad de contratos DTO entre Frontend, Backend y Smart Contracts. |
| **Tailwind CSS** | `^4.3.3` | Motor de Estilos | Estilizado atómico sin costo de rendimiento en tiempo de ejecución; responsive-first. |
| **TanStack Query** | `^5.102.8` | Manejo de Estado Servidor | Deduplicación de peticiones, revalidación en foco de ventana e invalidación granular. |
| **Zustand** | `^5.0.15` | Estado Global del Cliente | Almacenamiento liviano de sesión y estados de conectividad sin boilerplate. |
| **React Router** | `^7.18.3` | Enrutador SPA | Manejo declarativo de rutas jerárquicas y guards de autenticación. |
| **React Hook Form + Zod** | `^7.88` / `^4.6` | Formularios | Validación declarativa de esquemas con feedback inmediato y cero re-renders innecesarios. |
| **@pollar/react** | Latest | Pasarela Pollar Mainnet | Integración nativa del checkout en 1 USDC según el bounty de Pollar. |
| **@unlock-protocol/paywall** | Latest | Paywall Token-Gated | Bloqueo criptográfico del expediente forense bancario según el bounty de Unlock. |
| **idb-keyval** | `^6.2.1` | Persistencia en IndexedDB | Abstracción basada en promesas sobre IndexedDB para transacciones offline seguras. |
| **viem** | `^2.23.0` | Cliente Ethereum / HSK | Lectura ligera y decodificación de llamadas al contrato `LibretaRegistry.sol`. |

---

## 3. ARQUITECTURA DE DIRECTORIOS Y CONVENCIONES DE CÓDIGO

La estructura de `hacka_Libreta_FRONT/src/` sigue un modelo orientado a dominios (*feature-based*):

```
src/
├── app/
│   ├── AppProviders.tsx       # Envoltura de Providers (QueryClientProvider, AuthProvider)
│   ├── Layout.tsx             # Layout maestro (Navbar, Sidebar móvil, NetworkStatusBar)
│   └── router.tsx             # Definición de rutas protegidas y públicas
│
├── components/                # Componentes de UI atómicos y reutilizables
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── StatusBadge.tsx        # Badges para PAID, PENDING, OVERDUE, HSK_SYNCED
│   ├── QrScannerModal.tsx     # Escáner de cámara para códigos de libreta
│   ├── OtpDisplay.tsx         # Renderizador de números de verificación
│   └── NetworkStatusBar.tsx   # Barra superior de estado Online / Offline
│
├── features/                  # Módulos por dominio de negocio
│   ├── auth/                  # Inicio de sesión, roles y tokens
│   │   ├── hooks/useAuth.ts
│   │   └── stores/authStore.ts
│   │
│   ├── borrower/              # Vistas y lógica del prestatario
│   │   ├── components/BorrowerPassbookCard.tsx
│   │   ├── components/InstallmentItem.tsx
│   │   ├── components/PollarCheckoutButton.tsx
│   │   └── hooks/useBorrowerActiveLoan.ts
│   │
│   ├── collector/             # Modo cobrador en campo (Offline-First)
│   │   ├── components/DailyRouteList.tsx
│   │   ├── components/CashCollectionModal.tsx
│   │   ├── hooks/useCollectorRoute.ts
│   │   └── services/offlineStore.ts
│   │
│   ├── lender/                # Panel de control de la microfinanciera
│   │   ├── components/PortfolioKpiGrid.tsx
│   │   ├── components/NewLoanForm.tsx
│   │   └── hooks/useLenderDashboard.ts
│   │
│   └── passport/              # Reputación soberana y Unlock Token-Gated
│       ├── components/LriGaugeChart.tsx
│       ├── components/UnlockPaywallSection.tsx
│       ├── components/ForensicAuditTable.tsx
│       └── hooks/usePassportSummary.ts
│
├── lib/                       # Infraestructura y utilidades compartidas
│   ├── httpClient.ts          # Cliente HTTP centralizado con interceptores JWT
│   ├── queryClient.ts         # Instancia configurada de QueryClient
│   ├── syncManager.ts         # Orquestador del despacho de lotes offline
│   └── unlockConfig.ts        # Metadatos del Paywall de Unlock Protocol
│
├── types/                     # Interfaces y tipos globales compartidos
│   └── api.ts
│
├── App.tsx                    # Componente raíz
├── main.tsx                   # Punto de montaje Vite
└── index.css                  # Tailwind CSS v4 directives
```

---

## 4. MOTOR OFFLINE-FIRST Y COLA DE SINCRONIZACIÓN EN INDEXEDDB

Para los cobradores de ruta, la aplicación debe garantizar el 100% de operatividad en ferias sin señal de telefonía celular.

### 4.1. Estructura de Datos en IndexedDB (`offline_sync_store`)
```typescript
export interface OfflinePaymentRecord {
  clientTxId: string;            // UUID v4 único generado localmente para idempotencia
  loanId: string;                // ID del crédito en Supabase
  installmentId: string;         // ID de la cuota correspondiente
  installmentNumber: number;     // # correlativo (1, 2, 3...)
  amount: number;                // Importe cobrado en efectivo (BOB)
  borrowerOtp: string;           // Código de 6 dígitos verificado con el prestatario
  receiptHash: string;           // keccak256(loanId, installmentNumber, amount, otp, timestamp)
  collectedAt: string;           // Timestamp local ISO 8601
  syncStatus: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'ERROR';
  syncAttempts: number;          // Contador de reintentos
  errorMessage?: string;         // Detalle en caso de rechazo del servidor
}
```

### 4.2. Ciclo de Vida de Captura y Sincronización

```
[COBRADOR EN MERCADO - SIN CONEXIÓN]
  1. Escanea QR del prestatario y obtiene { loanId, installmentNumber }
  2. Prestatario le dicta su código OTP de 6 dígitos
  3. Cobrador ingresa monto en efectivo y OTP en CashCollectionModal
  4. PWA computa receiptHash localmente
  5. PWA persiste el registro en IndexedDB con syncStatus: 'QUEUED'
  6. Feedback visual inmediato de "Cobro Registrado" con ticket local
                   │
                   ▼ (El cobrador sale del mercado o conecta a Wi-Fi)
[RECUPERACIÓN DE SEÑAL - EVENTO ONLINE]
  7. window.addEventListener('online') despierta a SyncManager.triggerSync()
  8. SyncManager extrae todos los registros con status 'QUEUED'
  9. Envía POST /api/sync/batch con el lote de transacciones
  10. Backend procesa la transacción SQL e invoca confirmPayment en HSK Chain
  11. Al recibir HTTP 200 con hskTxHash:
      - Actualiza syncStatus a 'SYNCED' en IndexedDB
      - Notifica al cobrador: "✅ Todos los cobros respaldados en blockchain"
```

### 4.3. Estrategia de Reintentos y Tolerancia a Fallas
* **Backoff Exponencial:** En caso de fallos intermitentes de red (HTTP 502, timeouts), el reintento se programa a `2s, 5s, 15s, 30s`.
* **Idempotencia:** Cada registro cuenta con su propio `clientTxId` UUID. Si el servidor procesó el cobro pero se cortó la respuesta del cliente, el reintento no duplicará la cuota en Supabase ni emitirá doble transacción on-chain.

---

## 5. INTEGRACIONES PROTOCOLARES & BOUNTIES DE LA HACKATHON

### 5.1. Bounty Pollar: Liquidación Digital Directa en 1 USDC Mainnet
* **Requisito del Bounty:** Demostrar una integración real en producción ejecutando al menos 1 transacción real en **Mainnet** por 1 USDC hacia la wallet del prestamista.
* **Componente de Integración (`PollarCheckoutButton.tsx`):**

```tsx
import React, { useState } from 'react';
import { PollarPayButton } from '@pollar/react';
import { httpClient } from '@/lib/httpClient';

interface PollarButtonProps {
  loanId: string;
  installmentId: string;
  installmentNumber: number;
  lenderWalletAddress: string;
  onSuccess: (txHash: string) => void;
}

export const PollarCheckoutButton: React.FC<PollarButtonProps> = ({
  loanId,
  installmentId,
  installmentNumber,
  lenderWalletAddress,
  onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <PollarPayButton
        appId={import.meta.env.VITE_POLLAR_APP_ID}
        amount={1.0} // 1 USDC Mainnet según requerimiento del Bounty Pollar
        currency="USDC"
        recipient={lenderWalletAddress}
        metadata={{
          loanId,
          installmentId,
          installmentNumber,
          app: 'LIBRETA_BOLIVIA_2026',
        }}
        onPaymentSuccess={async (paymentResult) => {
          setIsProcessing(true);
          try {
            // Notificar de inmediato al backend para conciliación cruzada
            await httpClient.post(`/installments/${installmentId}/pollar-confirm`, {
              pollarTxHash: paymentResult.transactionHash,
              pollarChainId: paymentResult.chainId || 1,
            });
            onSuccess(paymentResult.transactionHash);
          } catch (error) {
            console.error('Error conciliando con backend:', error);
          } finally {
            setIsProcessing(false);
          }
        }}
        onError={(err) => {
          console.error('Error en Pollar Pay:', err);
        }}
      />
      {isProcessing && (
        <span className="text-xs text-blue-600 animate-pulse text-center">
          Confirmando transacción en Ethereum Mainnet...
        </span>
      )}
    </div>
  );
};
```

---

### 5.2. Bounty Unlock Protocol: Portal de Contenido Token-Gated
* **Requisito del Bounty:** Implementar el flujo completo: *Descubrir → Previsualizar → Verificar membresía → Desbloquear → Contenido completo* utilizando contratos `PublicLock` y llaves NFT de Unlock Protocol.
* **Flujo en Frontend (`/p/:slug`):**
  1. **Descubrir & Previsualizar (Público, Zero PII):**
     Cualquier visitante ve el resumen crediticio del prestatario:
     - Calificación LRI (ej. 98.4 / 100).
     - Porcentaje de puntualidad y créditos concluidos.
     - Sin nombres completos, teléfonos ni cédulas.
  2. **Verificar Membresía Token-Gated:**
     Al scrollear hacia "Expediente Forense de Auditoría", se ejecuta el SDK de Unlock para consultar si la wallet del auditor posee una Key válida en el contrato desplegado:
     ```typescript
     import { Paywall } from '@unlock-protocol/paywall';

     export const checkUnlockAccess = async (userAddress: string) => {
       const paywall = new Paywall(unlockConfig);
       const hasAccess = await paywall.hasValidKey(
         import.meta.env.VITE_UNLOCK_LOCK_ADDRESS,
         userAddress
       );
       return hasAccess;
     };
     ```
  3. **Adquisición vía Paywall Modal:**
     Si el auditor no tiene llave, hace clic en *"Desbloquear Expediente con Unlock"* y se invoca `paywall.loadCheckoutModal()`.
  4. **Desbloqueo & Expediente Forense Completo:**
     Con la llave confirmada, la UI desbloquea la tabla forense:
     - Listado completo de `receiptHash` anclados en HSK Chain.
     - Marcas temporales de cada cuota y enlaces a exploradores de bloques.
     - Botón de exportación del certificado **W3C Verifiable Credential** en JSON-LD.

---

### 5.3. Track HSK Chain: Lectura Directa y Enlaces al Explorador
* **Contrato Inteligente:** `LibretaRegistry.sol`
* **Lectura con Viem:**
  El frontend puede consultar en tiempo real las atestaciones on-chain llamando a `getLoanProofs(bytes32 loanId)` para contrastar los datos de Supabase contra la verdad criptográfica de la blockchain.
* **Explorador:** Cada cuota pagada muestra un enlace clickeable directo hacia `https://hskchain.net/tx/:txHash` o equivalente.

---

## 6. MAPA DE ENRUTAMIENTO Y CONTROL DE ACCESO (RBAC)

```tsx
// Definición de Rutas en src/app/router.tsx
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      
      // Portal Prestatario (Requiere rol BORROWER)
      {
        path: 'borrower',
        element: <ProtectedRoute allowedRoles={['BORROWER']} />,
        children: [
          { index: true, element: <BorrowerDashboardPage /> },
          { path: 'passport', element: <BorrowerPassportPage /> },
        ],
      },

      // Modo Cobrador en Campo (Requiere rol COLLECTOR - PWA)
      {
        path: 'collector',
        element: <ProtectedRoute allowedRoles={['COLLECTOR']} />,
        children: [
          { index: true, element: <CollectorRoutePage /> },
          { path: 'collect/:loanId', element: <CollectorCollectPage /> },
          { path: 'sync', element: <CollectorSyncPage /> },
        ],
      },

      // Panel Microfinanciera / Prestamista (Requiere rol LENDER)
      {
        path: 'lender',
        element: <ProtectedRoute allowedRoles={['LENDER']} />,
        children: [
          { index: true, element: <LenderDashboardPage /> },
          { path: 'loans/new', element: <LenderNewLoanPage /> },
          { path: 'loans/:id', element: <LenderLoanDetailPage /> },
          { path: 'routes', element: <LenderRouteAssignmentPage /> },
        ],
      },

      // Pasaporte Público Soberano & Portal Token-Gated Unlock (Acceso Universal)
      { path: 'p/:slug', element: <PublicPassportPage /> },
    ],
  },
]);
```

---

## 7. SISTEMA DE DISEÑO Y ESTILOS (TAILWIND CSS V4)

### 7.1. Paleta Semántica
- **Brand Navy:** `#0B132B` — Solidez bancaria y seriedad institucional.
- **Action Blue:** `#2563EB` — Botones primarios y enlaces activos.
- **Success Emerald:** `#059669` — Cuotas pagadas, atestaciones verificadas y sincronización HSK exitosa.
- **Warning Amber:** `#D97706` — Modo offline activo, cuotas pendientes y OTP en cuenta regresiva.
- **Danger Crimson:** `#DC2626` — Cuotas en mora y fallos de conectividad.
- **Pollar Cyan:** `#06B6D4` — Distintivo oficial del checkout Pollar.
- **Unlock Gold:** `#F59E0B` — Distintivo del candado y membresías NFT de Unlock Protocol.

### 7.2. Principios de Interfaz Móvil para Cobradores
1. **Zonas de Toque Amplias:** Botones principales con mínimo `h-14` (56px) para manipulación rápida en la calle.
2. **Contraste Solar:** Tipografía de alto contraste legible bajo la luz del sol en ferias abiertas.
3. **Animaciones Hápticas:** Vibración sutil del dispositivo al validar un código OTP o confirmar un cobro.

---

## 8. MATRIZ DE VARIABLES DE ENTORNO (`.env`)

```ini
# Backend API
VITE_API_URL=http://localhost:3000/api

# Bounty Pollar Engine
VITE_POLLAR_APP_ID=pollar_app_live_hacka2026
VITE_POLLAR_ENVIRONMENT=mainnet

# Bounty Unlock Protocol
VITE_UNLOCK_LOCK_ADDRESS=0x1234567890123456789012345678901234567890
VITE_UNLOCK_NETWORK=8453

# HSK Chain Track
VITE_HSK_REGISTRY_CONTRACT_ADDRESS=0x9876543210987654321098765432109876543210
VITE_HSK_RPC_URL=https://rpc.hskchain.net
VITE_HSK_EXPLORER_URL=https://hskchain.net
```
