# CREDITCHAIN — Frontend PWA (Web3 Client)

> **Microcrédito verificable · Reputación financiera soberana · Auditoría token-gated**

Cliente de **CREDITCHAIN** (antes "LIBRETA") para el **ETH Bolivia Buildathon 2026**: una
**Progressive Web App** que usa **MetaMask** para interactuar con **HashKey Chain (HSK)**,
**Unlock Protocol** y **Pollar/Stellar** sin exponer datos personales en claro.

Stack: **Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query 5 · Zustand 5 ·
ethers.js 6 · @pollar/react · @unlock-protocol** (checkout oficial y compra nativa HSK).

---

## 1. Arquitectura del cliente

```text
┌────────────────────────────── PWA (React 19) ─────────────────────────────┐
│                                                                           │
│  HomePage · Registro/Login (authStore) · LenderPortal · BorrowerPortal    │
│  AuditDossier (Token-Gated) · ConfirmPaymentForm · RegisterLoanForm       │
│                                                                           │
│  features/  loans · unlock · pollar · wallet · auth · borrower · lender   │
│  lib/web3/  provider.ts · contract.ts · chains.ts · unlock/*              │
│                                                                           │
│  TanStack Query (staleTime/retry) ──────────────┐                         │
│  Zustand (walletStore: address, isConnected)    │                         │
│  httpClient.ts (fetch → NestJS)                 │                         │
└──────────────┬──────────────────────────────────┼─────────────────────────┘
               │ MetaMask (BrowserProvider)       │ REST /api/*
               ▼                                  ▼
       HSK Chain (133)                       CREDITCHAIN Backend
       Unlock PublicLock                     (NestJS + Supabase)
       Pollar Stellar (USDC testnet)
```

## 2. Unlock Protocol — Miembrosía token-gated

### Control de acceso
El botón **"Adquirir Membresía de Auditoría"** desbloquea el expediente forense completo
(`getLoanProofs`) del prestatario. Solo los titulares de una **Key NFT** en el `PublicLock`
**"Auditor Financiero Certificado — CREDITCHAIN"** pueden leerlo.

### Lectura de membresía (`src/lib/web3/unlock/unlockContract.ts`)
`verifyUnlockMembership(addr)` consulta el Lock vía RPC de la red configurada
(`VITE_UNLOCK_RPC_URL` o soporte por defecto por Chain ID) con **timeout de 10 s**:

```ts
const PUBLIC_LOCK_ABI = [
  'function getHasValidKey(address) external view returns (bool)',
  'function keyExpirationTimestampFor(address) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address,uint256) external view returns (uint256)',
  'function keyPrice() external view returns (uint256)',
  'function tokenAddress() external view returns (address)',
  'function purchase(uint256[] values, address[] recipients, address[] referrers, address[] keyManagers, bytes[] data) external payable returns (uint256[] tokenIds)',
] as const
```

El hook `useUnlockMembership` la expone con `queryKey` por `lock + wallet` y `staleTime: 30 s`;
`useUnlockLockInfo` muestra **precio, token de pago y duración** de la membresía.

### Flujo de compra/reclamación (`usePurchaseUnlockKey`)
Compra nativa con gas en **HSK/ETH** (para Locks en HSK) o checkout oficial de Unlock (iframe)
para otras redes. La ruta nativa garantiza:

1. **Red correcta** → `wallet_switchEthereumChain` (y `wallet_addEthereumChain` para HSK en 4902).
2. **Fondos** → `estimateGas` + balance: `Saldo HSK insuficiente: necesitas X y tienes Y`.
3. **Hash real** → valida `tx.hash`; si la wallet no devuelve hash lanza
   `No transaction hash returned. Failed to claim membership.`
4. **`await tx.wait()`** antes de renderizar el éxito y `onAcquired()` (re-verificación).

```ts
const tx = (await contract.purchase(
  [keyPrice], [recipient], [recipient], [ZeroAddress], [[]], { value: keyPrice },
)) as ContractTransactionResponse
if (!tx || typeof tx.hash !== 'string' || tx.hash.length === 0)
  throw new Error('No transaction hash returned. Failed to claim membership.')
await tx.wait()
setStatus({ kind: 'success', txHash: tx.hash })
```

### Verificación del lado del servidor
El dossier completo solo se entrega tras `POST /api/passports/:slug/verify-key` con la **dirección
firmada** (mensaje `LIBRETA Unlock Audit Access: ${timestamp}`, validez 5 min). El backend consulta
`hasValidKey`, registra `AUDIT_DOSSIER_GENERATED` (o `UNAUTHORIZED_ACCESS_ATTEMPT`) y devuelve
`generateAuditReport()` (informe **sin firma**, no una credencial falsa).

### Componentes involucrados
`AuditDossier.tsx` (gate del expediente) · `UnlockCheckoutModal.tsx` (iframe oficial, valida el
`event.origin` de postMessage y escucha `unlockProtocol.transactionSent/Confirmed`) ·
`TransactionStatus.tsx` (estados idle/pending/success/error + link al explorador `unlockTxExplorerUrl`).

### Configuración
```dotenv
VITE_UNLOCK_LOCK_ADDRESS=0x...PublicLock...
VITE_UNLOCK_NETWORK=133                     # 133 HSK Testnet · 8453 Base · 11155111 Sepolia…
VITE_UNLOCK_RPC_URL=                        # opcional (soporte por defecto por red)
```

---

## 3. Pollar + Capa de Datos Cloud

### Pagos de cuotas con Pollar
La PWA integra **@pollar/react y @pollar/core** para pagar cuotas de microcrédito en **USDC
testnet (Stellar)**:

- **`PollarWalletPayment` / `PollWalletPayment`**: genera el intento de pago en el backend
  (`pollar_payment_intents`), muestra la wallet Stellar del prestatario y la app Pollar.
- **`useSettlements.ts`**: lista préstamos + cuotas (+ intents) desde `GET /api/pollar/...`.
- **Rail de pago**: `CASH` (efectivo con OTP presencial) o `POLLAR` (USDC). El backend concilia vía
  Horizon con estados irreversibles `CREATED → VERIFIED → ANCHORED` y lo deja inmutable en SQL.

### Capa de datos en la nube
El frontend **no almacena PII en cliente**: todos los expedientes viven en **Supabase (PostgreSQL)**,
que el gateway NestJS administra con `service_role`, RLS habilitado y cifrado **AES-256-GCM (envelope)**
de los datos personales off-chain. En la app solo fluyen hashes, wallets y métricas agregadas —
permitiendo **baja latencia** (caché de TanStack Query) y **alta concurrencia** (escrituras
single-writer en el backend, triggers de inmutabilidad).

```dotenv
VITE_API_URL=http://localhost:3001
VITE_POLLAR_APP_ID=pollar_app_live_xxxx
VITE_POLLAR_PUBLISHABLE_KEY=pub_testnet_...
VITE_POLLAR_CHAIN_ID=1                     # USDC Mainnet (bounty)
VITE_DEV_USER_ID=00000000-0000-0000-0000-000000000002   # demo (header x-dev-user-id)
```

Ver [`docs/POLLAR_SETUP.md`](docs/POLLAR_SETUP.md) y [`docs/POLLAR_INSTALLMENTS.md`](docs/POLLAR_INSTALLMENTS.md).

---

## 4. HashKey Chain (HSK) — Capa EVM

### Rol
**HashKey Chain** (red EVM orientada a *PayFi*/RWA y cumplimiento) es donde vive el
`LibretaRegistry`: el libro verificable de préstamos y comprobantes. El frontend la usa como
**fuente de verdad read-only** para auditoría forense y como red de escritura para registrar/confirmar
(mediante MetaMask vía `BrowserProvider`).

### Redes soportadas (`src/lib/web3/chains.ts`)
| Red | Chain ID (hex) | Prefijo | RPC | Explorador |
|---|---|---|---|---|
| HSK Testnet | `133` (`0x85`) | `testnet` | `https://testnet.hsk.xyz` | `https://testnet-explorer.hsk.xyz` |
| HSK Mainnet | `177` (`0xb1`) | `mainnet` | `https://mainnet.hsk.xyz` | `https://hsk.blockscout.com` |

```dotenv
VITE_HSK_CHAIN_ID=133
VITE_HSK_CONTRACT_ADDRESS=0x...LibretaRegistry...
VITE_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz
```

### Lecturas forenses
`useLoanRegistry.ts` y `useBorrowerForensic.ts` consultan el contrato (public RPC, `FetchRequest`
con timeout 10 s):

```ts
const contract = getLibretaContract() // read-only sin runner
await contract.loans(loanId)                 // estado del crédito
await contract.getLoanProofs(loanId)        // recibos de pago (zero-PII)
await contract.getBorrowerLoanCount(addr)   // paginación por prestatario
await contract.borrowerLoans(addr, i)
// vincula cada prueba con su tx/bloque:
contract.filters.PaymentConfirmed(loanId) → queryFilter(fromBlock)
```

`AuditDossier` (gateado por Unlock) usa `useBorrowerForensic` para renderizar el **historial
forense completo**: por Loan ID (bytes32/texto) o por dirección del prestatario.

### Escritura y gas
`provider.ts` implementa `BrowserProvider(provider, 'any')` + secuencia EIP-3326
(`wallet_switchEthereumChain` / `wallet_addEthereumChain` para HSK). Los formularios de registro y
confirmación de pago (`RegisterLoanForm`, `ConfirmPaymentForm`) envían Tx con MetaMask; el **gas se
paga en HSK testnet**, y `userFriendlyError` traduce códigos (`INSUFFICIENT_FUNDS`, `CALL_EXCEPTION`,
`ACTION_REJECTED`…) a mensajes accionables.

```dotenv
VITE_HSK_CHAIN_ID=133
VITE_UNLOCK_NETWORK=133       # deben coincidir si el Lock vive en HSK
```

---

## 5. Rutas y funciones de la APP

```text
/                                    HomePage (tabs: Auditoría Unlock, Registrar préstamo,
                                     Confirmar pago, Portales lender/borrower, Passport)
```

Componentes principales: `AuditDossier` (token-gate + expediente forense) · `RegisterLoanForm` ·
`ConfirmPaymentForm` · `LoanLookup` (LoanDetail/ProofTable) · `PollarPayment`/`PollarWalletPayment` ·
`TransactionStatus` · `UnlockCheckoutModal`.

## 6. Hooks y servicios Web3

| Módulo | Responsabilidad |
|---|---|
| `lib/web3/provider.ts` | MetaMask: BrowserProvider, switch/add chain HSK, `getBalance` |
| `lib/web3/contract.ts` | Instancia tipada de `LibretaRegistry` (+ `userFriendlyError`) |
| `lib/web3/unlock/config.ts` | Lock address/network, RPC + exploradores, paywall, checkout URL |
| `lib/web3/unlock/unlockContract.ts` | ABI PublicLock, `verifyUnlockMembership`, compra directa |
| `features/unlock/useUnlock.ts` | Queries de membresía y metadatos del Lock |
| `features/unlock/usePurchaseUnlockKey.ts` | Mutación de purchase nativo HSK (garantiza hash + wait) |
| `features/loans/useBorrowerForensic.ts` | Historial forense completo por loan/address |
| `features/pollar/*` | Pagos USDC testnet: wallet, intents, settlements |
| `features/wallet/walletStore.ts` | Estado de conexión (address, isConnected) |

## 7. Scripts

```bash
npm run dev       # desarrollo con HMR (http://localhost:5173)
npm run build     # tsc -b && vite build (validación de tipos + bundle)
npm run lint      # oxlint (0 errores objetivo)
npm run preview   # previsualizar dist/
```

## 8. Despliegue en Netlify

### URL de producción

| Recurso | URL |
|---|---|
| Frontend (Netlify) | `https://creditchat.netlify.app/` |
| Backend Gateway NestJS (Render) | `https://hacka-libreta-back.onrender.com` |

> ⚠️ **Netlify es hosting estático**: el Gateway NestJS se ejecuta en Render
> (`render.yaml` en el repo backend). El frontend resuelve los endpoints como
> `${VITE_BACKEND_URL}/api/...`. Si `VITE_BACKEND_URL` apunta al dominio estático,
> el proxy `/api/*` de `public/_redirects` reenvía hacia Render (no pongas la URL
> del sitio si el proxy no está activo).

### Configuración del repo

- `netlify.toml` — `npm run build`, publish `dist/`, y env de producción (`VITE_UNLOCK_NETWORK=133`, `VITE_BACKEND_URL=https://hacka-libreta-back.onrender.com`).
- `public/_redirects` — regla SPA `/* → /index.html 200` (evita 404 en deep links / F5) con proxy opcional documentado para `/api/*`.

### Variables de entorno en el panel de Netlify

`Site settings  >  Build & deploy  >  Environment` (valores por entorno):

| Variable | Valor producción |
|---|---|
| `VITE_BACKEND_URL` | `https://hacka-libreta-back.onrender.com` (Gateway NestJS en Render) |
| `VITE_UNLOCK_NETWORK` | `133` (HashKey Chain Testnet) |
| `VITE_UNLOCK_LOCK_ADDRESS` | `0x...` PublicLock REAL en HSK Testnet (reemplaza el cero) |
| `VITE_UNLOCK_RPC_URL` | RPC de la red del Lock si no está en los defaults |
| `VITE_POLLAR_PUBLISHABLE_KEY` | clave publicable de Pollar (nunca la secreta) |
| `VITE_HSK_CONTRACT_ADDRESS` | `0x785f...` LibretaRegistry en HSK Testnet |
| `VITE_HSK_CHAIN_ID` / `VITE_HSK_EXPLORER_URL` | `133` / `https://testnet-explorer.hsk.xyz` |

Warnings de Netlify para Vite: `site.url` debe ser `https://creditchat.netlify.app` y el
`base` de Vite se deja en `/`. El build de Vite embebe las `VITE_*` en tiempo de compilación:
después de cambiar una variable en el dashboard, dispara una nueva deploy para que surta efecto.

## 9. Documentación

- [`docs/FRONTEND_SPECIFICATION.md`](docs/FRONTEND_SPECIFICATION.md) — arquitectura PWA y Web3.
- [`docs/USER_STORIES_FRONTEND.md`](docs/USER_STORIES_FRONTEND.md) — 13 historias de usuario (Gherkin).
- [`docs/POLLAR_SETUP.md`](docs/POLLAR_SETUP.md) · [`docs/POLLAR_INSTALLMENTS.md`](docs/POLLAR_INSTALLMENTS.md).
- [`docs/GUIA_PRUEBAS_FRONTEND_ACTUAL.md`](docs/GUIA_PRUEBAS_FRONTEND_ACTUAL.md) — guía de pruebas manuales.

---

*CREDITCHAIN — ETH Bolivia Buildathon 2026 · Bounties: HashKey Chain, Unlock Protocol, Pollar.*