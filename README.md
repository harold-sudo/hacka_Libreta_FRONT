> **Pollar testnet:** [Configuración desde cero y alcance de la integración](docs/POLLAR_SETUP.md). SDK y verificación disponibles; requiere crear la app Pollar. No concilia cuotas ni acredita mainnet.

# LIBRETA — Frontend PWA

Frontend cliente de **LIBRETA — Microcrédito Verificable & Portabilidad de Reputación Financiera** para el **ETH Bolivia Buildathon 2026**.

Construido como una **Progressive Web Application (PWA)** de alto rendimiento con **React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query y Zustand**.

---

## 📚 Documentación de Ingeniería

Para detalles exhaustivos de arquitectura, flujos e implementación, consulta los documentos de especificación:

- 📄 **[Especificación Técnica del Frontend](docs/FRONTEND_SPECIFICATION.md)**: Arquitectura PWA, estrategia Offline-First con IndexedDB, integraciones Web3 (@pollar/react, @unlock-protocol/paywall) y sincronización con HSK Chain.
- 📋 **[Historias de Usuario del Frontend](docs/USER_STORIES_FRONTEND.md)**: 13 Historias de usuario detalladas (US-F01 a US-F13) con criterios de aceptación Gherkin y requerimientos de UI para Prestatarios, Cobradores, Prestamistas y Auditores.
- 🌐 **[Documentación Integral del Proyecto](../README.md)**: Visión global, marco legal UNCITRAL, formulación del índice LRI y guion de demostración.

---

## 🛠️ Stack Tecnológico

| Herramienta | Para qué se usa |
|---|---|
| [Vite](https://vite.dev) | Servidor de desarrollo ultrarrápido y empaquetador para producción. |
| [React 19](https://react.dev) + TypeScript | Librería de UI con soporte concurrente nativo y tipado estático riguroso. |
| [React Router v7](https://reactrouter.com) | Navegación protegida por roles (`/borrower`, `/collector`, `/lender`, `/p/:slug`). |
| [TanStack Query v5](https://tanstack.com/query) | Caché inteligente, sincronización con backend y manejo de estados asíncronos. |
| [Zustand](https://zustand-demo.pmnd.rs/) | Gestión de estado cliente (sesión, conectividad y cola offline). |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Formularios de alto rendimiento y validación declarativa de esquemas. |
| [Tailwind CSS v4](https://tailwindcss.com) | Sistema de diseño atómico responsive-first con cero CSS runtime. |
| [@pollar/react](https://docs.pollar.xyz/) | Pasarela de liquidación digital de cuotas en **1 USDC Mainnet** (Bounty Pollar). |
| [@unlock-protocol/paywall](https://docs.unlock-protocol.com/) | Portal **Token-Gated** para auditoría bancaria con NFTs de membresía (Bounty Unlock). |
| [idb-keyval / IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) | Persistencia local y cola de transacciones para cobradores sin internet. |

---

## 🚀 Cómo Correr el Proyecto

### 1. Requisitos
- Node.js 20+
- npm

### 2. Instalación y Configuración
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Configura las variables según tu entorno local
```

### 3. Servidor de Desarrollo
```bash
npm run dev
```
Abre la aplicación en `http://localhost:5173`.

---

## 📱 Scripts Disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo con Hot Module Replacement (HMR). |
| `npm run build` | Valida tipos TypeScript y genera el build de producción en `dist/`. |
| `npm run preview` | Previsualiza localmente el build optimizado de `dist/`. |
| `npm run lint` | Ejecuta el linter (oxlint) sobre el código fuente. |

---

## 🏗️ Estructura del Código

```
src/
├── app/                      # Configuración raíz de la aplicación
│   ├── AppProviders.tsx     # TanStack Query, Zustand y Web3 Context Providers
│   ├── router.tsx           # Definición de rutas y navegación por roles
│   └── Layout.tsx           # Shell compartido (Navbar, Status Bar y Layout)
│
├── pages/                    # Vistas completas por ruta
│   ├── HomePage.tsx         # Landing y selección de rol
│   ├── borrower/            # Portal del prestatario y libreta digital
│   ├── collector/           # Modo cobrador en ruta (PWA Offline)
│   ├── lender/              # Dashboard de cartera y creación de créditos
│   └── passport/            # Libreta Passport y auditoría Token-Gated
│
├── components/               # Componentes UI reutilizables
│   ├── ui/                  # Botones, badges, inputs, skeletons, modales
│   └── web3/                # PollarPayButton, UnlockPaywallModal, HskTxLink
│
├── features/                 # Módulos de dominio y lógica de negocio
│   ├── loans/               # Hooks, tipos y servicios de microcréditos
│   ├── installments/        # Cronogramas y confirmaciones de pago
│   ├── offline-sync/        # Gestión de IndexedDB y sync queue
│   └── passport/            # Métricas LRI y expedientes forenses
│
├── lib/                      # Clientes e infraestructura
│   ├── httpClient.ts        # Cliente Fetch tipado hacia NestJS
│   └── queryClient.ts       # Configuración global de TanStack Query
│
├── App.tsx                   # Entrada de componentes (Providers + Router)
├── main.tsx                  # Bootstrap en el DOM
└── index.css                 # Import de Tailwind CSS
```

---

## 🔑 Variables de Entorno (.env)

```env
# URL del Gateway NestJS
VITE_API_URL=http://localhost:3001

# --- Track HSK Chain ---
# 133 = HashKey Chain Testnet | 177 = HashKey Chain Mainnet
VITE_HSK_CHAIN_ID=133
VITE_HSK_CONTRACT_ADDRESS=0x785f249c2B25F3306b53F9D2432313e8FC9239Ce
VITE_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz

# --- Bounty Unlock Protocol ---
# 11155111 = Sepolia | 8453 = Base Mainnet | 137 = Polygon Mainnet
VITE_UNLOCK_LOCK_ADDRESS=0x68AD159eAF099f581C5375A373D6b0607455E1D2
VITE_UNLOCK_NETWORK=11155111

# --- Bounty Pollar (1 USDC) ---
VITE_POLLAR_PUBLISHABLE_KEY=pub_testnet_a73bf6ca77116b700b9b26fb94d5e50f
VITE_POLLAR_CHAIN_ID=1
```
