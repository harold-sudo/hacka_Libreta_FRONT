# ESPECIFICACIÓN TÉCNICA DEL FRONTEND & ARQUITECTURA PWA — LIBRETA

**Proyecto:** LIBRETA — Microcrédito Verificable & Portabilidad de Reputación Financiera  
**Hackathon:** ETH Bolivia Buildathon 2026 (Cochabamba)  
**Tracks:** Bolivia Hackathon | Real-World Ethereum Applications | HSK Chain Track | Bounties: Pollar & Unlock Protocol  
**Versión:** 1.0.0  

---

## 1. VISIÓN GENERAL DE LA APLICACIÓN CLIENTE (PWA)

El frontend de **LIBRETA** es una **Progressive Web Application (PWA)** construida con React 19, TypeScript, Vite y Tailwind CSS. Su diseño está concebido para operar bajo condiciones del mundo real en América Latina y mercados informales, donde la conectividad a internet puede ser intermitente para los cobradores de ruta, mientras que para los prestatarios y entidades financieras ofrece una experiencia fluida, inclusiva y transparente.

### 1.1. Pilares Arquitectónicos del Frontend

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LIBRETA FRONTEND (PWA)                             │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│    PRESTATARIO    │     COBRADOR      │    PRESTAMISTA    │ AUDITOR BANCARIO│
│ (Portal Móvil/Web)│  (Offline-First)  │ (Dashboard Admin) │  (Token-Gated)  │
├───────────────────┴───────────────────┴───────────────────┴─────────────────┤
│                              CAPA DE PRESENTACIÓN                           │
│       React 19 + React Router v7 + Tailwind CSS v4 + React Hook Form        │
├───────────────────────────────────────┬─────────────────────────────────────┤
│        ESTADO Y CACHÉ REMOTO          │      ALMACENAMIENTO LOCAL           │
│  TanStack Query v5 + Zustand Stores   │  IndexedDB (Cola de Sync Offline)   │
├───────────────────────────────────────┴─────────────────────────────────────┤
│                         INTEGRACIONES WEB3 & PROTOCOLOS                     │
│  • Pollar Engine SDK (@pollar/react) ➔ Pagos 1 USDC en Mainnet             │
│  • Unlock Protocol Paywall (@unlock-protocol/paywall) ➔ Acceso Token-Gated │
│  • HSK Chain RPC Reader (viem / wagmi) ➔ Verificación de Hashes On-Chain   │
├─────────────────────────────────────────────────────────────────────────────┤
│                          COMUNICACIÓN CON BACKEND                           │
│       HTTP Client (Fetch API) hacia Backend Gateway NestJS / Supabase       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. STACK TECNOLÓGICO Y JUSTIFICACIÓN

| Herramienta | Versión | Rol en el Proyecto | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **React** | `^19.2.8` | Biblioteca de UI | Concurrencia nativa, renderizado reactivo ultrarrápido y compatibilidad de largo plazo. |
| **Vite** | `^8.3.0` | Bundler & Dev Server | Arranque instantáneo (HMR), optimización de assets estáticos y generación de bundles PWA mínimos. |
| **TypeScript** | `~6.0.2` | Tipado Estático | Garantía de consistencia en contratos de datos entre NestJS, Supabase y Smart Contracts. |
| **Tailwind CSS** | `^4.3.3` | Sistema de Diseño | Clases utilitarias atómicas, responsive-first (móvil, tablet, desktop) y cero CSS runtime overhead. |
| **TanStack Query** | `^5.102.8`| Server State & Caching | Manejo automático de revalidaciones, invalidación de queries, estados de carga y reintentos. |
| **Zustand** | `^5.0.15`| Client State | Gestión minimalista del estado local de sesión, modo offline y sincronización sin boilerplate. |
| **React Router** | `^7.18.3` | Enrutamiento SPA | Navegación protegida por roles (`BORROWER`, `COLLECTOR`, `LENDER`, `AUDITOR`). |
| **React Hook Form + Zod** | `^7.88` / `^4.6` | Formularios & Validación | Formularios de alto rendimiento sin re-renders innecesarios y validación declarativa tipada. |
| **@pollar/react** | Latest | Pasarela USDC Mainnet | Integración nativa de pagos Web3 en 1 USDC sin complejidad de wallets para el prestatario. |
| **@unlock-protocol/paywall** | Latest | Token-Gated Paywall | Bloqueo criptográfico del dossier de auditoría forense con NFTs de membresía (ERC-721). |
| **idb-keyval / IndexedDB** | Standard W3C | Persistencia Offline | Almacenamiento transaccional en el dispositivo para cobros en ruta sin conexión. |

---

## 3. ESTRATEGIA OFFLINE-FIRST & COLA DE SINCRONIZACIÓN (MODO COBRADOR)

Los cobradores de microcrédito suelen desplazarse por ferias, zonas rurales o mercados populares donde la señal móvil (3G/4G) es precaria o nula.

### 3.1. Flujo de Captura y Sincronización

```
[Cobrador en la Calle] (Sin Internet)
        │
        ├── 1. Escanea código QR del Prestatario (Libreta)
        ├── 2. Prestatario dicta código de un solo uso (OTP de 6 dígitos) o firma en pantalla
        ├── 3. Cobrador registra monto recibido en efectivo
        └── 4. PWA computa receiptHash localmente y guarda en IndexedDB (Status: QUEUED)
        │
[Recuperación de Conectividad] (Online)
        │
        ├── 5. Listener `window.addEventListener('online')` se activa
        ├── 6. Sync Worker extrae los cobros encolados en IndexedDB
        ├── 7. PWA despacha POST /api/sync/batch con las pruebas acumuladas
        ├── 8. Backend valida, persiste en Supabase y emite confirmPayment en HSK Chain
        └── 9. PWA marca las cuotas como 'SYNCED' y actualiza el contador visual
```

### 3.2. Estructura de Datos en IndexedDB (`offline_sync_store`)

```typescript
export interface OfflinePaymentRecord {
  clientTxId: string;            // UUID v4 generado localmente
  loanId: string;                // ID del préstamo
  installmentNumber: number;     // Número secuencial de cuota
  amount: number;                // Monto cobrado en moneda local (BOB)
  borrowerOtp: string;           // Código de 6 dígitos validado off-line
  collectedAt: string;           // ISO 8601 Timestamp local
  receiptHash: string;           // keccak256(loanId, installmentNumber, amount, otp)
  syncStatus: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'ERROR';
  syncAttempts: number;
  errorMessage?: string;
}
```

### 3.3. Algoritmo de Sincronización y Reintentos
- **Disparadores:** Evento `online` del navegador, apertura de la PWA, o botón explícito *"Sincronizar Ahora"*.
- **Estrategia de reintentos:** Exponencial (`1s, 3s, 9s, max 30s`) ante fallos de red.
- **Idempotencia:** Cada pago local lleva un `clientTxId` único; el backend ignora cobros duplicados basados en `(loan_id, installment_number)`.

---

## 4. INTEGRACIONES PROTOCOLARES & BOUNTIES

### 4.1. Integración con Pollar (@pollar/react) — Bounty Pollar
- **Objetivo:** Permitir a prestatarios liquidar sus cuotas digitalmente en **1 USDC en Mainnet**.
- **Flujo de Usuario en Frontend:**
  1. El prestatario entra a su portal `/borrower` y visualiza la cuota vigente.
  2. Presiona el botón de acción **"Pagar con Pollar (1 USDC)"**.
  3. Se despliega el modal interactivo de checkout de `@pollar/react` configurado con la wallet del prestamista como destinatario y el `loanId + installmentNumber` en los metadatos.
  4. El prestatario autoriza y transacciona el monto en USDC en red principal.
  5. La PWA captura el callback exitoso de Pollar con el `txHash`.
  6. Se muestra pantalla de éxito instantánea con el link al explorador de bloques y el backend confirma la cuota vía Webhook seguro (HMAC-SHA256).

```tsx
// Ejemplo de componente de integración Pollar en el Frontend
import { PollarPayButton } from '@pollar/react';

interface PollarPaymentProps {
  installmentId: string;
  loanId: string;
  installmentNumber: number;
  recipientWallet: string;
  onSuccess: (txHash: string) => void;
}

export const PollarInstallmentPay = ({
  loanId,
  installmentNumber,
  recipientWallet,
  onSuccess,
}: PollarPaymentProps) => {
  return (
    <PollarPayButton
      amount={1.0} // 1 USDC Mainnet según requerimiento del bounty
      currency="USDC"
      recipient={recipientWallet}
      metadata={{
        loanId,
        installmentNumber,
        app: 'LIBRETA_BOLIVIA_2026',
      }}
      onPaymentSuccess={(data) => {
        onSuccess(data.transactionHash);
      }}
    />
  );
};
```

---

### 4.2. Integración con Unlock Protocol (@unlock-protocol/paywall) — Bounty Unlock
- **Objetivo:** Implementar un **Portal de Contenido Token-Gated** para auditores bancarios y oficiales de riesgo financiero.
- **Flujo de Usuario en Frontend (Descubrir → Previsualizar → Verificar Membresía → Desbloquear):**
  1. **Descubrir:** El analista ingresa a la URL pública del prestatario: `/p/:slug`.
  2. **Previsualizar (Acceso Libre):** Visualiza el resumen agregado del **Libreta Passport**:
     - Calificación global del Índice LRI (ej. 98/100).
     - Cuotas pagadas puntuales vs. retrasadas.
     - Cantidad de créditos completados.
     - *(Sin datos personales identificables - Zero PII)*.
  3. **Verificar Membresía:** En la sección "Expediente Forense de Auditoría", el sistema consulta si la wallet conectada posee una **Key (NFT)** válida en el contrato `PublicLock` de Unlock Protocol.
  4. **Adquirir Acceso (Paywall):** Si el usuario no tiene llave, se muestra un mensaje informativo y el botón **"Desbloquear Expediente con Unlock"**, el cual invoca el checkout modal de Unlock.
  5. **Desbloquear (Contenido Completo):** Una vez confirmada la membresía, la UI se desbloquea en tiempo real mostrando:
     - Tabla forense de hashes en **HSK Chain** para cada cuota.
     - Marcas temporales exactas de pago.
     - Hashes cruzados de transacciones en Mainnet (Pollar).
     - Botón de descarga de la **Credencial Verificable W3C**.

```typescript
// Configuración de Paywall para Unlock Protocol en Vite (.env)
export const unlockPaywallConfig = {
  network: 8453, // Red Base o Polygon según despliegue
  locks: {
    [import.meta.env.VITE_UNLOCK_LOCK_ADDRESS]: {
      name: 'Auditor Financiero Certificado - LIBRETA',
      network: 8453,
    },
  },
  icon: 'https://libreta.app/favicon.svg',
  callToAction: {
    default: 'Conecta tu wallet institucional o adquiere una membresía para auditar este expediente.',
  },
};
```

---

### 4.3. Integración con HSK Chain — Track HSK Chain
- **Contrato:** `LibretaRegistry.sol`
- **Función en Frontend:**
  - Los registros de microcréditos (`registerLoan`) y pagos (`confirmPayment`) quedan sellados criptográficamente en HSK Chain.
  - El frontend provee **enlaces directos y verificadores visuales** al explorador de bloques de HSK (`https://hskchain.net/tx/...` o equivalente en testnet/mainnet).
  - Estado de cada cuota reflejado con un badge: `HSK Synced` con su `receiptHash` verificable.

---

## 5. MAPA DE NAVEGACIÓN Y RUTAS

```
/
├── (Landing pública: presentación de LIBRETA, propuesta de valor y selector de rol)
├── /login ➔ Inicio de sesión seguro / Conexión de Wallet
│
├── /borrower ➔ Portal del Prestatario
│   ├── /borrower/loans ➔ Lista de créditos activos e históricos
│   ├── /borrower/loans/:id ➔ Detalle del crédito, cuotas, generador de OTP y pago Pollar
│   └── /borrower/passport ➔ Mi Libreta Passport (vista previa y enlace público)
│
├── /collector ➔ Modo Cobrador en Ruta (Optimizada para Móvil / PWA)
│   ├── /collector/route ➔ Hoja de ruta del día y lista de clientes
│   ├── /collector/collect/:loanId ➔ Registro de cobro presencial (Escáner QR + OTP)
│   └── /collector/sync ➔ Monitor de sincronización offline / reintentos
│
├── /lender ➔ Panel del Prestamista / Operador de Crédito
│   ├── /lender/dashboard ➔ Métricas de cartera, cobros del día y tasa de mora
│   ├── /lender/loans/new ➔ Formulario de originación y anclaje de nuevo préstamo
│   ├── /lender/loans/:id ➔ Seguimiento detallado del crédito y estado HSK
│   └── /lender/collectors ➔ Gestión de cobradores y asignación de rutas
│
└── /p/:slug ➔ Libreta Passport Público
    └── /p/:slug/audit ➔ Portal Token-Gated de Auditoría Forense (Unlock Protocol)
```

---

## 6. SISTEMA DE DISEÑO, COMPONENTES Y ESTADOS UI

### 6.1. Paleta de Colores Semántica (Tailwind CSS)
- **Primary / Brand:** Azul Confianza (`#0F172A` / `#2563EB`) — transmite seguridad financiera y solidez bancaria.
- **Success / Paid:** Verde Esmeralda (`#059669`) — cuotas pagadas a tiempo y sincronización exitosa en HSK.
- **Warning / Pending:** Ámbar Cálido (`#D97706`) — cuotas pendientes o en espera de validación de prestatario.
- **Danger / Overdue:** Rojo Carmesí (`#DC2626`) — cuotas vencidas o fallos de red.
- **Web3 Badges:** 
  - Pollar: Azul Cian (`#06B6D4`)
  - Unlock Protocol: Amarillo Dorado (`#F59E0B`)
  - HSK Chain: Violeta Criptográfico (`#7C3AED`)

### 6.2. Estados Globales de la UI
Para toda pantalla o acción crítica, los componentes deben renderizar inequívocamente:
1. **Loading State:** Skeletons animados que mantienen el layout estable.
2. **Empty State:** Mensajes claros orientados a la acción (ej. *"No tienes cobros pendientes en tu ruta de hoy"*).
3. **Offline Banner:** Barra persistente en la parte superior notificando: *"Modo Offline activo — Tus cobros se guardarán de forma segura en el dispositivo"*.
4. **Syncing Badge:** Indicador pulsante con el número de transacciones encoladas.
5. **Error Boundary:** Manejo amigable con botón de reintento y preservación de datos en formularios.

---

## 7. ESQUEMA DE SEGURIDAD & HABEAS DATA EN EL FRONTEND

Siguiendo el mandato de **"Zero PII On-Chain"** y las regulaciones de Habeas Data:
1. El frontend **NUNCA** envía datos personales legibles a la blockchain.
2. Todo identificador sensible que viaje a HSK Chain es previamente hasheado (`keccak256`) o procesado a través del backend gateway.
3. El prestatario tiene control total sobre su `passport_slug`: puede activar o desactivar la visibilidad de su Passport en cualquier momento desde su panel.
4. El almacenamiento en `IndexedDB` para el cobrador almacena únicamente el alias del cliente y el monto pactado; al sincronizar, los datos temporales pueden purgarse tras la confirmación exitosa del servidor.
