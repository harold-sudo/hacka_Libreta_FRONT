> **Estado Pollar — 2026-09-12:** integración de cuotas implementada para Stellar testnet y HSK 133: intenciones autenticadas, verificación del pago, conciliación SQL idempotente y anclaje HSK con recuperación. Migración aplicada y verificada en Supabase; falta validar una cuota real de testnet. La transferencia libre no liquida cuotas. Las referencias posteriores a Ethereum/Mainnet, webhooks de liquidación o widgets antiguos son diseño histórico. [Contrato vigente y activación paso a paso](POLLAR_INSTALLMENTS.md).

# HISTORIAS DE USUARIO INTEGRALES DEL FRONTEND & CONTRATOS BACKEND — LIBRETA

**Proyecto:** LIBRETA — Microcrédito Verificable & Portabilidad de Reputación Financiera  
**Hackathon:** ETH Bolivia Buildathon 2026 (Cochabamba)  
**Tracks:** Bolivia Hackathon | Real-World Ethereum Applications | HSK Chain Track  
**Bounties:** Pollar Engine (1 USDC Mainnet) | Unlock Protocol (Token-Gated Content Portal)  
**Versión:** 2.0.0 (Documento Definitivo de Requerimientos Frontend / Backend)  
**Audiencia:** Desarrolladores Frontend, Desarrolladores Backend (NestJS / Supabase), Auditores de Smart Contracts & Jurado Evaluador  

---

## TABLA DE CONTENIDO Y MATRIZ DE TRAZABILIDAD

| Módulo | ID | Título de la Historia | Protocolo / Bounty | Endpoint Backend Asociado |
| :--- | :--- | :--- | :--- | :--- |
| **Prestatario** | `[US-F01]` | Visualización de Libreta Activa y Cronograma de Cuotas | Supabase REST | `GET /api/borrower/loans/active` |
| **Prestatario** | `[US-F02]` | Generación de Código OTP para Doble Atestación de Cobro en Efectivo | Criptografía Local | `POST /api/installments/:id/otp-challenge` |
| **Prestatario** | `[US-F03]` | Liquidación Digital Directa de Cuota con Pollar (1 USDC Mainnet) | **Bounty Pollar** | `POST /api/webhooks/pollar` & `POST /api/installments/:id/pollar-init` |
| **Prestatario** | `[US-F04]` | Consulta y Gestión de Privacidad de Mi Libreta Passport | HSK Chain / Supabase | `GET /api/borrower/passport` & `PATCH /api/borrower/passport` |
| **Cobrador** | `[US-F05]` | Hoja de Ruta Diaria con Detección Automática de Conectividad | PWA Offline-First | `GET /api/collector/routes/today` |
| **Cobrador** | `[US-F06]` | Escáner QR de Libreta y Registro de Cobro con Doble Atestación | IndexedDB + HSK Hash | `POST /api/installments/:id/collect-cash` |
| **Cobrador** | `[US-F07]` | Monitor de Cola de Sincronización en IndexedDB y Despacho en Lote | **Track HSK Chain** | `POST /api/sync/batch` |
| **Prestamista** | `[US-F08]` | Dashboard Operativo de Cartera y Métricas de Recaudación | LRI Analytics | `GET /api/lender/analytics/overview` |
| **Prestamista** | `[US-F09]` | Originación y Anclaje Criptográfico de Nuevo Microcrédito | **Track HSK Chain** | `POST /api/loans` (`registerLoan` on-chain) |
| **Prestamista** | `[US-F10]` | Gestión de Cobradores y Asignación de Rutas Diarias | Supabase RLS | `POST /api/lender/routes/assign` |
| **Auditor** | `[US-F11]` | Previsualización Pública de Reputación LRI (Zero PII) | LRI Engine | `GET /api/passports/:slug/summary` |
| **Auditor** | `[US-F12]` | Desbloqueo Token-Gated del Expediente Forense | **Bounty Unlock** | `POST /api/passports/:slug/verify-key` |
| **Auditor** | `[US-F13]` | Descarga del Dossier Certificado W3C Verifiable Credential | W3C VC / HSK Proofs | `GET /api/passports/:slug/audit-dossier` |

---

# 1. MÓDULO PRESTATARIO (BORROWER)

## `[US-F01]` Visualización de Libreta Activa y Cronograma de Cuotas

### Narrativa
* **Como:** Prestatario registrado en LIBRETA con un crédito vigente,
* **Quiero:** Visualizar una tarjeta digital interactiva que emule la libreta física de papel, mostrando mi saldo remanente, número de cuotas abonadas, próximas fechas de vencimiento y el historial de sellos de pago,
* **Para:** Tener absoluta transparencia sobre mi deuda, evitar cobros indebidos y verificar que cada centavo abonado haya sido respaldado de manera inmutable.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Carga exitosa del crédito activo
  Dado que el prestatario está autenticado con JWT en el frontend
  Cuando navega a la ruta "/borrower"
  Entonces se realiza la petición "GET /api/borrower/loans/active"
  Y la interfaz renderiza el componente "BorrowerPassbookCard" con:
    | Campo                | Formato / Ejemplo                   |
    | Monto Total del Crédito | "1,200.00 BOB"                      |
    | Saldo Restante       | "500.00 BOB"                        |
    | Cuotas Pagadas       | "7 de 12 cuotas (58%)"              |
    | Próxima Cuota        | "Cuota #8 - Vence: 18 Sep 2026"     |
    | Valor de la Cuota    | "100.00 BOB"                        |
  Y el componente "InstallmentList" despliega la grilla de cuotas ordenadas del 1 al 12:
    - Cuotas 1 a 7 con badge verde "PAID" y enlace a comprobante.
    - Cuota 8 con badge amarillo "PENDING" y botones de acción activa ("Pagar con Pollar" y "Código en Efectivo").
    - Cuotas 9 a 12 con badge gris "UPCOMING".

Escenario: El prestatario no registra crédito activo
  Dado que el prestatario no tiene créditos vigentes en el sistema
  Cuando la API responde con HTTP 404 o "{ activeLoan: null }"
  Entonces se muestra un "Empty State" con ilustración amigable y el botón "Solicitar nuevo microcrédito a mi prestamista".
```

### Especificación de UI y Estado
* **Componentes:** `BorrowerPassbookCard.tsx`, `InstallmentList.tsx`, `InstallmentItem.tsx`, `InstallmentStatusBadge.tsx`.
* **Manejo de Estado:** `useQuery({ queryKey: ['borrower', 'active-loan'], queryFn: fetchBorrowerActiveLoan })`.

### Contrato API Requerido al Backend
* **Método & Endpoint:** `GET /api/borrower/loans/active`
* **Headers:** `Authorization: Bearer <jwt_supabase>`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "loanId": "a9d8f33c-412e-48cb-b461-829e5033c411",
    "hskLoanId": "0x4b78912e987cba1234567890abcdef1234567890abcdef1234567890abcdef12",
    "capital": 1200.00,
    "currency": "BOB",
    "totalInstallments": 12,
    "paidInstallments": 7,
    "installmentAmount": 100.00,
    "frequency": "WEEKLY",
    "status": "ACTIVE",
    "lender": {
      "alias": "Asociación Microcrédito Cancha Central",
      "walletAddress": "0x1234567890123456789012345678901234567890"
    },
    "installments": [
      {
        "id": "e8123456-1111-2222-3333-444455556666",
        "installmentNumber": 1,
        "amount": 100.00,
        "dueDate": "2026-08-01",
        "paidDate": "2026-08-01T10:15:00Z",
        "status": "PAID",
        "paymentMethod": "CASH",
        "receiptHash": "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        "hskSyncStatus": "SYNCED"
      },
      {
        "id": "e8123456-2222-3333-4444-555566667777",
        "installmentNumber": 8,
        "amount": 100.00,
        "dueDate": "2026-09-18",
        "paidDate": null,
        "status": "PENDING",
        "paymentMethod": null,
        "receiptHash": null,
        "hskSyncStatus": "PENDING"
      }
    ]
  }
}
```

### Guía de Implementación para el Backend (NestJS / Supabase)
1. Crear el módulo `BorrowerModule` con `BorrowerController` y `BorrowerService`.
2. Validar identidad con `SupabaseAuthGuard` extrayendo el `auth_user_id`.
3. Consultar la tabla `public.loans` filtrando por `borrower_id` y `status = 'ACTIVE'`.
4. Realizar un `JOIN` con `public.installments` ordenados por `installment_number ASC`.
5. Proteger mediante política RLS en Supabase: prestatario solo lee sus propios registros.

---

## `[US-F02]` Generación de Código OTP para Doble Atestación de Cobro en Efectivo

### Narrativa
* **Como:** Prestatario entregando el importe de mi cuota física en mano al cobrador,
* **Quiero:** Generar un código numérico seguro de 6 dígitos (OTP) o un código QR dinámico en la pantalla de mi celular,
* **Para:** Dictárselo o mostrárselo al cobrador, asegurando que el cobro solo se selle cuando ambas partes validen la entrega física, sin riesgo de cobros fantasmas y con funcionamiento offline.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Generación de token bilateral presencial
  Dado que el prestatario se sitúa en la cuota en estado "PENDING"
  Cuando hace clic en "Pagar en Efectivo (Generar Código OTP)"
  Entonces se abre el modal "BorrowerOtpModal"
  Y se muestra:
    1. Código OTP de 6 dígitos espaciado: "7 3 2 - 9 1 4"
    2. Código QR dinámico con payload JSON: {"loanId":"...","installmentNumber":8,"otp":"732914","salt":"0xfa29..."}
    3. Cuenta regresiva circular de 5 minutos (300 segundos).
    4. Advertencia: "Entrega tu dinero y muestra este código al cobrador".

Escenario: Caducidad del OTP
  Dado que han transcurrido los 5 minutos sin que el cobrador registre el pago
  Cuando el contador llega a "00:00"
  Entonces el código se opaca y se activa el botón "Generar Nuevo Código".
```

### Especificación de UI y Estado
* **Componente:** `BorrowerOtpModal.tsx`, `OtpCountdownTimer.tsx`, `QrCodeDisplay.tsx`.
* **Algoritmo de Derivación Local:** Para modo 100% offline entre ambos dispositivos, el OTP se genera determinísticamente mediante `HMAC-SHA256(secretKey, installmentNumber + dateWindow) % 1000000`.

### Contrato API Requerido al Backend
* **Método & Endpoint:** `POST /api/installments/:id/otp-challenge`
* **Request Body:** `{ "clientTimestamp": 1789456000 }`
* **Respuesta Exitosa (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "otpCode": "732914",
    "expiresAt": "2026-09-11T23:35:00Z",
    "challengeHash": "0x29841f...89e1"
  }
}
```

### Guía de Implementación para el Backend
1. Generar token criptográficamente seguro (`crypto.randomInt(100000, 999999)`).
2. Almacenar temporalmente en caché o sesión de base de datos con TTL de 300s vinculado al `installment_id`.
3. Validar que la cuota esté en estado `PENDING`.

---

## `[US-F03]` Liquidación Digital Directa de Cuota con Pollar (1 USDC Mainnet)

### Narrativa
* **Como:** Prestatario que cuenta con saldo digital en USDC en su billetera Web3,
* **Quiero:** Pagar mi cuota directamente desde la aplicación pulsando el botón oficial de Pollar,
* **Para:** Salir de la cuota en 10 segundos, obtener comprobante definitivo en Ethereum Mainnet y evitar el manejo de efectivo.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Liquidación digital exitosa en Mainnet con Pollar
  Dado que el prestatario selecciona la cuota #8 en estado "PENDING"
  Cuando hace clic en el botón "Pagar con Pollar (1 USDC)"
  Entonces se ejecuta el widget no custodial de "@pollar/react" configurado con:
    | Parámetro  | Valor                                              |
    | Monto      | 1.00                                               |
    | Moneda     | "USDC"                                             |
    | Destinatario| Dirección de wallet del prestamista                |
    | Metadatos  | {"loanId": "...", "installmentNumber": 8, "app": "LIBRETA"} |
  Cuando el usuario aprueba la transacción y se confirma en Ethereum Mainnet
  Entonces el widget dispara el callback "onPaymentSuccess(txData)"
  Y el frontend envía "POST /api/installments/:id/pollar-confirm" con el "pollarTxHash"
  Y la UI actualiza inmediatamente la cuota a "PAID (Pollar USDC)" con link a Etherscan
  Y se emite la notificación de éxito "¡Cuota liquidada y anclada en blockchain!".

Escenario: Transacción fallida o rechazada por el usuario en el modal de Pollar
  Dado que el usuario cancela la firma en el widget de Pollar
  Entonces el modal se cierra, la cuota permanece en "PENDING" y se notifica sin error bloqueante.
```

### Especificación de UI e Integración SDK
* **Paquete:** `@pollar/react`
* **Componente:** `PollarPaymentButton.tsx`
```tsx
import { PollarPayButton } from '@pollar/react';

export const PollarPaymentAction = ({ loanId, installmentId, installmentNumber, lenderWallet }: Props) => {
  return (
    <PollarPayButton
      appId={import.meta.env.VITE_POLLAR_APP_ID}
      amount={1.0} // Requerimiento estricto del Bounty Pollar Buildathon 2026
      currency="USDC"
      recipient={lenderWallet}
      metadata={{ loanId, installmentId, installmentNumber, origin: 'LIBRETA_BOLIVIA' }}
      onPaymentSuccess={async (result) => {
        await notifyPollarSuccess(installmentId, result.transactionHash, result.chainId);
      }}
      onError={(err) => console.error('Pollar error', err)}
    />
  );
};
```

### Contrato API Requerido al Backend
* **Endpoint de Confirmación Directa:** `POST /api/installments/:id/pollar-confirm`
* **Request Body:**
```json
{
  "pollarTxHash": "0x9817234abcde5678901234567890123456789012345678901234567890123456",
  "pollarChainId": 1
}
```
* **Endpoint de Webhook Pollar (Servidor a Servidor):** `POST /api/webhooks/pollar`
* **Headers:** `x-pollar-signature: <hmac_sha256_hex>`
* **Webhook Payload:**
```json
{
  "event": "payment.completed",
  "transactionHash": "0x9817234abcde5678901234567890123456789012345678901234567890123456",
  "chainId": 1,
  "amount": "1.00",
  "currency": "USDC",
  "recipient": "0x1234567890123456789012345678901234567890",
  "metadata": {
    "loanId": "a9d8f33c-412e-48cb-b461-829e5033c411",
    "installmentId": "e8123456-2222-3333-4444-555566667777",
    "installmentNumber": 8
  }
}
```

### Guía de Implementación para el Backend
1. **Verificación HMAC:** Validar firma de webhook con `crypto.createHmac('sha256', process.env.POLLAR_WEBHOOK_SECRET)`.
2. **Actualizar Supabase:** Marcar `status = 'PAID'`, `payment_method = 'POLLAR_USDC'`, `paid_date = NOW()`.
3. **Anclaje en HSK Chain:** Ejecutar contrato `LibretaRegistry.sol` con `confirmPayment(loanId, installmentNumber, receiptHash, true, pollarTxHash)`.
4. **Idempotencia:** Si el webhook se recibe más de una vez con el mismo `pollarTxHash`, devolver HTTP 200 sin duplicar registros.

---

## `[US-F04]` Consulta y Gestión de Privacidad de Mi Libreta Passport

### Narrativa
* **Como:** Prestatario que ha pagado sus cuotas con puntualidad,
* **Quiero:** Consultar mi pasaporte digital de reputación (`/borrower/passport`), personalizar mi slug público y decidir si deseo activarlo o suspenderlo,
* **Para:** Compartir mi enlace (`libreta.app/p/mi-nombre`) ante bancos o financieras aliadas y demostrar mi solvencia moral sin intermediarios.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Configuración y compartición del Libreta Passport
  Dado que el prestatario ingresa a "/borrower/passport"
  Entonces se visualiza:
    - Enlace permanente: "libreta.app/p/dona-rosa-cancha"
    - Switch de activación: "Pasaporte Público [Activado / Desactivado]"
    - Medidor gráfico circular con el Índice LRI (ej. 98/100)
    - Desglose métrico: 100% puntualidad, 2 créditos concluidos, 0 días de mora
    - Botón "Copiar Enlace Público" con feedback visual tipo "¡Copiado!"
    - Botón "Vista Previa como Auditor" que redirige a "/p/dona-rosa-cancha".
```

### Contrato API Requerido al Backend
* **Endpoint de Lectura:** `GET /api/borrower/passport`
* **Endpoint de Actualización:** `PATCH /api/borrower/passport`
* **Request Body:** `{ "passportSlug": "dona-rosa-cancha", "passportEnabled": true }`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "passportSlug": "dona-rosa-cancha",
    "passportEnabled": true,
    "publicUrl": "https://libreta.app/p/dona-rosa-cancha",
    "lriScore": 98.4,
    "metrics": {
      "punctualityRate": 1.0,
      "completedLoans": 2,
      "repaymentRatio": 1.0
    }
  }
}
```

---

# 2. MÓDULO COBRADOR EN RUTA (COLLECTOR - PWA OFFLINE-FIRST)

## `[US-F05]` Hoja de Ruta Diaria con Detección Automática de Conectividad

### Narrativa
* **Como:** Cobrador que recorre puestos de ferias y mercados populares en Cochabamba,
* **Quiero:** Visualizar la lista ordenada de prestatarios a visitar hoy, con un indicador en tiempo real de si tengo señal de internet o estoy en modo offline,
* **Para:** Gestionar mi cobranza con certeza absoluta de que el sistema continuará operando y almacenando mis datos en el dispositivo.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Cobrador operando en línea
  Dado que el cobrador abre "/collector/route" conectado a red móvil o Wi-Fi
  Entonces se muestra en el encabezado la píldora verde: "🟢 En Línea"
  Y se carga la lista de cobros programados para hoy desde el backend
  Y los datos se respaldan automáticamente en la caché local de IndexedDB.

Escenario: Pérdida súbita de conectividad en el mercado
  Dado que el cobrador entra a una zona sin señal celular
  Cuando el navegador detecta "window.onoffline"
  Entonces el encabezado cambia a: "📡 Modo Offline Activo"
  Y un banner informativo confirma: "Trabajando sin conexión. Los cobros se guardarán en tu dispositivo de forma segura."
  Y la lista de clientes se renderiza inmediatamente desde IndexedDB.
```

### Contrato API Requerido al Backend
* **Endpoint:** `GET /api/collector/routes/today`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "routeId": "f1092834-9123-4412-8812-abcdef123456",
    "date": "2026-09-12",
    "totalStops": 15,
    "collectedStops": 4,
    "items": [
      {
        "orderIndex": 1,
        "loanId": "a9d8f33c-412e-48cb-b461-829e5033c411",
        "installmentId": "e8123456-2222-3333-4444-555566667777",
        "installmentNumber": 8,
        "borrowerAlias": "Dña. Rosa - Puesto 45 (Abarrotes)",
        "amountDue": 100.00,
        "visited": false
      }
    ]
  }
}
```

---

## `[US-F06]` Escáner QR de Libreta y Registro de Cobro con Doble Atestación

### Narrativa
* **Como:** Cobrador ubicado frente al prestatario en su puesto comercial,
* **Quiero:** Escanear con la cámara de mi teléfono el código QR de su libreta física o digital, confirmar el importe recibido e ingresar el código OTP que el prestatario me dicte,
* **Para:** Generar el recibo electrónico inalterable, emitir el sello digital y guardarlo en mi dispositivo aún sin conexión a internet.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Registro de cobro presencial en efectivo (Con o Sin Internet)
  Dado que el cobrador pulsa "Escanear QR de Libreta"
  Cuando apunta la cámara al QR de la libreta del cliente
  Entonces la pantalla precarga:
    - Alias: "Dña. Rosa - Puesto 45"
    - Cuota a Cobrar: Cuota #8 de 12
    - Monto Esperado: 100.00 BOB
  Cuando el cobrador verifica el efectivo recibido, introduce el OTP de 6 dígitos ("732914") dictado por el prestatario
  Y presiona "Confirmar Cobro Bilateral"
  Entonces:
    1. La aplicación calcula el "receiptHash = keccak256(loanId, 8, 100.00, 732914, timestamp)".
    2. Guarda el registro en IndexedDB ("offline_sync_store") con estado "QUEUED".
    3. Muestra ticket de cobro exitoso en verde con animación háptica.
    4. El contador flotante de la cola offline pasa de 0 a 1.
```

### Estructura de Datos en IndexedDB (`offline_sync_store`)
```typescript
export interface OfflinePaymentRecord {
  clientTxId: string;            // UUID v4 único para idempotencia
  loanId: string;                // ID del préstamo
  installmentId: string;         // ID de la cuota en base de datos
  installmentNumber: number;     // # correlativo
  amount: number;                // Monto en BOB
  borrowerOtp: string;           // Código de 6 dígitos
  collectedAt: string;           // Timestamp ISO local
  receiptHash: string;           // Hash criptográfico derivado
  syncStatus: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'ERROR';
  syncAttempts: number;
  errorMessage?: string;
}
```

---

## `[US-F07]` Monitor de Cola de Sincronización en IndexedDB y Despacho en Lote

### Narrativa
* **Como:** Cobrador que ha finalizado su jornada o vuelve a tener señal Wi-Fi/4G,
* **Quiero:** Que mis cobros guardados en el teléfono se envíen automáticamente en lote al servidor,
* **Para:** Que se asienten en la base de datos de la microfinanciera y queden sellados en el contrato inteligente `LibretaRegistry.sol` en HSK Chain.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Despacho en lote al recuperar conexión
  Dado que el cobrador tiene 6 cobros almacenados en estado "QUEUED"
  Cuando el dispositivo detecta conectividad
  Entonces el "SyncManager" de la PWA inicia el despacho automático
  Y envía "POST /api/sync/batch" con el array de 6 registros
  Cuando el servidor responde HTTP 200 confirmando la persistencia y los hashes de HSK Chain
  Entonces los 6 registros en IndexedDB se marcan como "SYNCED"
  Y la interfaz muestra el toast: "✅ 6 cobros sincronizados y anclados en HSK Chain con éxito".

Escenario: Discrepancia o error en una cuota
  Dado que una de las cuotas ya fue liquidada digitalmente por Pollar antes de la visita
  Cuando el backend procesa el lote
  Entonces devuelve status de éxito general pero marca esa cuota específica con error "ALREADY_PAID"
  Y la PWA alerta al cobrador: "Cuota #4 ya fue pagada digitalmente. Revisar con administración."
```

### Contrato API Requerido al Backend (Batch Sync)
* **Método & Endpoint:** `POST /api/sync/batch`
* **Headers:** `Authorization: Bearer <jwt_collector>`, `Content-Type: application/json`
* **Request Body Payload:**
```json
{
  "batchId": "b1827364-5555-4444-3333-222211110000",
  "payments": [
    {
      "clientTxId": "c9812734-1111-2222-3333-444455556666",
      "loanId": "a9d8f33c-412e-48cb-b461-829e5033c411",
      "installmentId": "e8123456-2222-3333-4444-555566667777",
      "installmentNumber": 8,
      "amount": 100.00,
      "borrowerOtp": "732914",
      "receiptHash": "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      "collectedAt": "2026-09-12T14:32:10Z"
    }
  ]
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "processedCount": 1,
    "failedCount": 0,
    "results": [
      {
        "clientTxId": "c9812734-1111-2222-3333-444455556666",
        "status": "SYNCED",
        "hskTxHash": "0x7a89bc1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        "confirmedAt": "2026-09-12T15:00:02Z"
      }
    ]
  }
}
```

### Guía de Implementación para el Backend
1. **Transacción ACID:** Iniciar transacción SQL en Supabase para validar cada registro contra la tabla `public.installments`.
2. **Idempotencia:** Verificar si `clientTxId` ya fue procesado en `public.sync_queue`.
3. **Smart Contract Call (HSK Chain):** Invocar `confirmPayment(loanId, installmentNumber, receiptHash, false, bytes32(0))` en `LibretaRegistry.sol` usando la cuenta del prestamista/operador.
4. **Respuesta granular:** Si un ítem falla, no abortar todo el lote; devolver el estado individual de cada uno.

---

# 3. MÓDULO PRESTAMISTA / ADMINISTRADOR (LENDER)

## `[US-F08]` Dashboard Operativo de Cartera y Métricas de Recaudación

### Narrativa
* **Como:** Prestamista o administrador de una microfinanciera,
* **Quiero:** Un panel ejecutivo con KPIs en tiempo real de colocación de capital, cobranzas de hoy, índice de mora y distribución de pagos (Efectivo vs. Pollar USDC),
* **Para:** Mantener el control financiero de mi cartera y monitorear la eficiencia de mis cobradores.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Visualización de métricas generales del prestamista
  Dado que el prestamista accede a "/lender/dashboard"
  Entonces se despliegan las siguientes tarjetas métricas:
    | Métrica                  | Valor Ejemplo  | Indicador Comparativo |
    | Capital Colocado Total   | 145,000.00 BOB | +12% este mes         |
    | Total Recaudado          | 98,200.00 BOB  | 67.7% recuperado      |
    | Cobros Recaudados Hoy    | 4,300.00 BOB   | 43 cuotas abonadas    |
    | Tasa de Cobro Digital    | 28% Pollar     | 72% Efectivo          |
    | Créditos en Mora (>3 d)  | 3 créditos     | Bajo control (<5%)    |
  Y un gráfico interactivo muestra la recaudación diaria de los últimos 30 días.
```

### Contrato API Requerido al Backend
* **Endpoint:** `GET /api/lender/analytics/overview`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "totalCapitalDeployed": 145000.00,
    "totalCapitalRecovered": 98200.00,
    "activeLoansCount": 38,
    "completedLoansCount": 14,
    "todayCollectionAmount": 4300.00,
    "todayCollectionCount": 43,
    "paymentMethodSplit": {
      "cashPercentage": 72.0,
      "pollarUsdcPercentage": 28.0
    },
    "overdueRate": 4.2
  }
}
```

---

## `[US-F09]` Originación y Anclaje Criptográfico de Nuevo Microcrédito en HSK Chain

### Narrativa
* **Como:** Prestamista que acuerda un nuevo crédito con un prestatario comerciante,
* **Quiero:** Ingresar los términos del crédito (capital, número de cuotas, periodicidad y alias del cliente) en un formulario validado,
* **Para:** Emitir la libreta digital, generar el cronograma de pagos y registrar el préstamo en el contrato inteligente `LibretaRegistry.sol` en HSK Chain con Zero PII.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Emisión y anclaje on-chain exitoso de crédito
  Dado que el prestamista completa el formulario en "/lender/loans/new":
    | Campo                | Valor              |
    | Prestatario          | Selecciona perfil  |
    | Capital (BOB)        | 1,200.00           |
    | Frecuencia           | Semanal            |
    | Total de Cuotas      | 12                 |
    | Monto de Cada Cuota  | 115.00             |
    | Fecha Primer Pago    | 2026-09-18         |
  Cuando presiona "Emitir y Anclar en HSK Chain"
  Entonces el formulario valida los datos con Zod:
    - Capital > 0
    - Cuotas entre 1 y 52
    - Monto de cuota >= Capital / Cuotas
  Y envía "POST /api/loans" al backend
  Cuando el backend procesa el anclaje en HSK Chain y responde con HTTP 201
  Entonces la UI muestra el modal de confirmación con:
    - ID del Préstamo en HSK Chain ("hskLoanId")
    - Código QR descargable de la libreta para imprimir o enviar por WhatsApp al cliente
    - Botón "Ver en Explorador HSK" y redirección al detalle del crédito.
```

### Contrato API Requerido al Backend
* **Método & Endpoint:** `POST /api/loans`
* **Request Body Payload:**
```json
{
  "borrowerId": "7b892123-5555-4444-3333-222211110000",
  "capital": 1200.00,
  "currency": "BOB",
  "totalInstallments": 12,
  "installmentAmount": 115.00,
  "frequency": "WEEKLY",
  "startDate": "2026-09-18",
  "borrowerWalletAddress": "0x7890123456789012345678901234567890123456"
}
```
* **Respuesta Exitosa (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "loanId": "a9d8f33c-412e-48cb-b461-829e5033c411",
    "hskLoanId": "0x4b78912e987cba1234567890abcdef1234567890abcdef1234567890abcdef12",
    "loanHash": "0x128391fa87bca6541234567890abcdef1234567890abcdef1234567890abcdef",
    "hskTxHash": "0x6789abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
    "qrPayload": "https://libreta.app/qr/a9d8f33c-412e-48cb-b461-829e5033c411",
    "createdAt": "2026-09-12T08:00:00Z"
  }
}
```

### Guía de Implementación para el Backend
1. **Generación de Hashes:** Calcular `hskLoanId = keccak256(uuid + Date.now())` y `loanHash = keccak256(capital + installments + frequency + salt)`.
2. **Llamada On-Chain:** Conectar vía ethers.js / viem a HSK Chain e invocar:
   `LibretaRegistry.registerLoan(hskLoanId, loanHash, borrowerWallet, totalInstallments)`.
3. **Inserción Relacional:** Insertar en `public.loans` y generar las 12 filas en `public.installments` con sus respectivas fechas de vencimiento (`due_date`).
4. **Zero PII:** No enviar datos personales a la blockchain.

---

## `[US-F10]` Gestión de Cobradores y Asignación de Rutas Diarias

### Narrativa
* **Como:** Prestamista con equipo de cobranza en calle,
* **Quiero:** Seleccionar un cobrador y asignarle los créditos que debe visitar en una fecha específica,
* **Para:** Organizar las rutas de recolección física y que cada cobrador vea únicamente sus clientes asignados en su PWA.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Asignación de ruta de cobro
  Dado que el prestamista accede a "/lender/routes"
  Cuando selecciona el cobrador "Juan Pérez", la fecha "2026-09-13" y marca 10 préstamos en la lista
  Y presiona "Guardar y Asignar Ruta"
  Entonces se despacha "POST /api/lender/routes/assign"
  Y el backend persiste la ruta en "collection_routes" y "collection_route_items"
  Y el cobrador ve inmediatamente la nueva ruta en su dispositivo al iniciar sesión.
```

### Contrato API Requerido al Backend
* **Endpoint:** `POST /api/lender/routes/assign`
* **Request Body Payload:**
```json
{
  "collectorId": "3b129845-9999-4444-2222-111122223333",
  "routeDate": "2026-09-13",
  "loanIds": [
    "a9d8f33c-412e-48cb-b461-829e5033c411",
    "b8c7d6e5-4444-5555-6666-777788889999"
  ]
}
```

---

# 4. MÓDULO AUDITOR / OFICIAL FINANCIERO (AUDITOR - TOKEN-GATED)

## `[US-F11]` Previsualización Pública de Reputación LRI (Zero PII)

### Narrativa
* **Como:** Oficial de crédito bancario o visitante público con el enlace de un prestatario (`libreta.app/p/:slug`),
* **Quiero:** Acceder libremente y previsualizar las estadísticas de pago y el Índice LRI del cliente sin necesidad de autenticarme,
* **Para:** Evaluar preliminarmente su puntualidad y solvencia sin acceder a datos personales sensibles.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Consulta pública libre de reputación (Zero PII)
  Dado que un visitante ingresa a "https://libreta.app/p/dona-rosa-cancha"
  Cuando la página carga "GET /api/passports/dona-rosa-cancha/summary"
  Entonces se renderizan los datos agregados:
    - Alias Comercial: "Dña. Rosa - Puesto 45 (Abarrotes)"
    - Calificación LRI: 98.4 / 100 (Grado de Confianza: "Excelente")
    - Tasa de Puntualidad: 100% de cuotas pagadas a tiempo
    - Créditos Concluidos: 2 créditos finalizados exitosamente
    - Saldo Total Amortizado: 100% del capital prestado devuelto
  Y la sección inferior muestra un candado dorado con la leyenda:
    "🔒 Expediente Forense de Auditoría (Hashes on-chain de HSK Chain y Credenciales W3C) — Acceso Token-Gated exclusivo para miembros certificados".
```

### Contrato API Requerido al Backend
* **Endpoint:** `GET /api/passports/:slug/summary` (Acceso público sin autenticación)
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "aliasName": "Dña. Rosa - Puesto 45 (Abarrotes)",
    "passportSlug": "dona-rosa-cancha",
    "passportEnabled": true,
    "lriScore": 98.4,
    "punctualityRate": 1.0,
    "completedLoans": 2,
    "repaymentRatio": 1.0,
    "totalPaidInstallments": 24,
    "totalOverdueInstallments": 0,
    "memberSince": "2026-03-01"
  }
}
```

---

## `[US-F12]` Desbloqueo Token-Gated del Expediente Forense con Unlock Protocol

### Narrativa
* **Como:** Auditor o analista de riesgos de un banco o fintech aliada,
* **Quiero:** Conectar mi billetera Web3 para verificar mi membresía en el contrato `PublicLock` de Unlock Protocol y desbloquear los datos forenses de las cuotas,
* **Para:** Realizar una auditoría criptográfica profunda de la trazabilidad en HSK Chain antes de otorgar un crédito comercial.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Auditor sin membresía de Unlock Protocol
  Dado que el auditor navega a "/p/dona-rosa-cancha" y conecta su wallet Web3
  Cuando pulsa "Desbloquear Expediente Completo con Unlock"
  Y el backend/contrato verifica que la wallet no posee un NFT Key válido
  Entonces se despliega el Paywall Modal de "@unlock-protocol/paywall"
  Y se le ofrece adquirir la membresía de auditor o renovar su llave de acceso.

Escenario: Auditor con membresía válida de Unlock Protocol
  Dado que la wallet conectada posee un NFT Key activo en el PublicLock de Unlock
  Cuando la aplicación valida la firma o membresía
  Entonces el candado de la UI cambia a verde abierto ("🔓 Expediente Desbloqueado")
  Y se despliega la tabla forense de pagos on-chain:
    | Cuota | Fecha Pago          | Método  | Receipt Hash (HSK Chain) | Hash Mainnet (Pollar) |
    | #1    | 2026-08-01 10:15:00 | Cash    | 0x89ab...5678 (Verificado)| N/A                   |
    | #2    | 2026-08-08 16:42:00 | Pollar  | 0x77d1...ba40 (Verificado)| 0x9817...456 (Etherscan)|
  Y se habilita el botón "Exportar Credencial Verificable W3C (JSON-LD)".
```

### Especificación de Integración Unlock Protocol (`@unlock-protocol/paywall`)
* **Configuración del Paywall:**
```typescript
export const unlockConfig = {
  network: 8453, // Red Base / Polygon según despliegue del Hackathon
  locks: {
    [import.meta.env.VITE_UNLOCK_LOCK_ADDRESS]: {
      name: 'Auditor Financiero Certificado — LIBRETA',
      network: 8453,
    },
  },
  icon: 'https://libreta.app/logo.png',
  callToAction: {
    default: 'Conecta tu billetera institucional para auditar los registros criptográficos en HSK Chain.',
  },
};
```

### Contrato API Requerido al Backend
* **Endpoint de Validación:** `POST /api/passports/:slug/verify-key`
* **Request Body Payload:**
```json
{
  "viewerAddress": "0x9999888877776666555544443333222211110000",
  "signature": "0xabcdef...",
  "timestamp": 1789456000
}
```
* **Respuesta Exitosa (`200 OK` - Membresía Válida):**
```json
{
  "success": true,
  "data": {
    "hasValidKey": true,
    "expirationTimestamp": 1820000000,
    "tokenId": "42",
    "accessGranted": true
  }
}
```
* **Respuesta No Autorizada (`402 Payment Required` - Sin Membresía):**
```json
{
  "success": false,
  "error": "PAYMENT_REQUIRED",
  "message": "Se requiere una membresía activa en Unlock Protocol para consultar el expediente.",
  "paywallConfig": { ... }
}
```

---

## `[US-F13]` Descarga del Dossier Certificado W3C Verifiable Credential y Pruebas HSK

### Narrativa
* **Como:** Auditor bancario que ha desbloqueado el expediente mediante Unlock Protocol,
* **Quiero:** Exportar un paquete de evidencias en formato W3C Verifiable Credential (JSON-LD) y generar un reporte PDF formal,
* **Para:** Incorporar el historial de cumplimiento al sistema de scoring y legajo crediticio del banco tradicional.

### Criterios de Aceptación (Gherkin)
```gherkin
Escenario: Descarga de Credencial Verificable W3C
  Dado que el auditor tiene el expediente desbloqueado
  Cuando hace clic en "Descargar Credencial W3C (JSON-LD)"
  Entonces se realiza la petición "GET /api/passports/:slug/audit-dossier"
  Y el navegador descarga un archivo "libreta-credential-dona-rosa.json"
  Y el archivo contiene el esquema W3C con la prueba criptográfica firmada por el emisor y el listado de transacciones en HSK Chain.
```

### Contrato API Requerido al Backend
* **Endpoint:** `GET /api/passports/:slug/audit-dossier`
* **Headers:** `x-viewer-address: 0x...`, `x-unlock-signature: 0x...`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://libreta.app/contexts/financial-reputation-v1.jsonld"
  ],
  "id": "urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "type": ["VerifiableCredential", "LibretaFinancialReputationCredential"],
  "issuer": "did:ethr:hsk:0x1234567890123456789012345678901234567890",
  "issuanceDate": "2026-09-12T15:30:00Z",
  "credentialSubject": {
    "id": "did:ethr:hsk:0x7890123456789012345678901234567890123456",
    "lriScore": 98.4,
    "completedLoans": 2,
    "onTimePaymentRatio": 1.0,
    "hskContract": "0xLibretaRegistryAddressOnHSK",
    "proofs": [
      {
        "installmentNumber": 1,
        "receiptHash": "0x89abcdef...",
        "isDigital": false,
        "hskTimestamp": 1785600000
      },
      {
        "installmentNumber": 2,
        "receiptHash": "0x77d1ba...",
        "isDigital": true,
        "mainnetTxHash": "0x9817234...",
        "hskTimestamp": 1786204800
      }
    ]
  },
  "proof": {
    "type": "EthereumEip712Signature2021",
    "created": "2026-09-12T15:30:00Z",
    "proofValue": "0xabcdef..."
  }
}
```

---

## 5. RESUMEN DE DEPENDENCIAS TÉCNICAS BACKEND PARA DESARROLLO

Para que el frontend pueda operar integralmente, el backend en **NestJS** debe implementar los siguientes controladores y servicios:

1. **`LoansModule`**:
   - `POST /api/loans`: Originación, cómputo de `hskLoanId` y llamada a `registerLoan` en `LibretaRegistry.sol`.
   - `GET /api/borrower/loans/active`: Consulta del crédito actual del prestatario y cronograma de cuotas.
2. **`InstallmentsModule`**:
   - `POST /api/installments/:id/otp-challenge`: Emisión de OTP con TTL de 300s.
   - `POST /api/installments/:id/collect-cash`: Confirmación de cuota en efectivo presencial.
   - `POST /api/installments/:id/pollar-confirm`: Conciliación inmediata de pago Pollar.
3. **`SyncModule`**:
   - `POST /api/sync/batch`: Despacho en bloque de cobros guardados en IndexedDB con ejecución de `confirmPayment` on-chain en HSK Chain.
4. **`WebhooksModule`**:
   - `POST /api/webhooks/pollar`: Validación HMAC-SHA256 y liquidación de cuota Pollar en HSK Chain.
5. **`PassportsModule`**:
   - `GET /api/passports/:slug/summary`: Resumen público Zero PII con cálculo LRI.
   - `POST /api/passports/:slug/verify-key`: Verificación de membresía Unlock Protocol.
   - `GET /api/passports/:slug/audit-dossier`: Emisión de Credencial Verificable W3C.
6. **`RoutesModule`**:
   - `GET /api/collector/routes/today`: Hojas de ruta para cobradores.
   - `POST /api/lender/routes/assign`: Asignación de ruta por prestamista.
