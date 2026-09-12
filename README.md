# hacka_Libreta_FRONT

Frontend del proyecto **Libreta** (hackathon), construido con React + Vite + TypeScript.

## Stack

| Herramienta | Para qué se usa |
|---|---|
| [Vite](https://vite.dev) | Servidor de desarrollo y build. Arranca rápido y recompila al instante. |
| [React](https://react.dev) + TypeScript | Librería de UI y tipado estático. |
| [React Router](https://reactrouter.com) | Navegación entre páginas (rutas). |
| [TanStack Query](https://tanstack.com/query) | Manejo de datos que vienen del backend (fetch, cache, loading/error). |
| [Zustand](https://zustand-demo.pmnd.rs/) | Estado global simple del lado del cliente (cosas que no vienen de una API). |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Formularios y validación de datos. |
| [Tailwind CSS](https://tailwindcss.com) | Estilos, escribiendo clases directamente en el JSX. |
| [oxlint](https://oxc.rs) | Linter (detecta errores y malas prácticas en el código). |

## Requisitos

- Node.js 20+
- npm

## Cómo correr el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env y poner la URL del backend en VITE_API_URL

# 3. Levantar el servidor de desarrollo
npm run dev
```

Esto abre el proyecto en `http://localhost:5173` (o el próximo puerto libre). Los cambios en el código se reflejan al instante sin recargar la página.

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo con hot-reload. |
| `npm run build` | Chequea tipos (TypeScript) y genera el build de producción en `dist/`. |
| `npm run preview` | Sirve el build de `dist/` localmente, para probar cómo queda antes de deployar. |
| `npm run lint` | Corre el linter sobre todo el código. |

## Estructura del proyecto

```
src/
├── app/            # Configuración global de la aplicación
│   ├── AppProviders.tsx   # Envuelve la app con los providers (React Query, etc.)
│   ├── router.tsx         # Definición de todas las rutas de la app
│   └── Layout.tsx         # Esqueleto visual compartido (navbar + contenido)
│
├── pages/          # Una carpeta/archivo por cada pantalla de la app
│   └── HomePage.tsx
│
├── components/     # Componentes de UI reutilizables entre varias páginas
│                   # (botones, inputs, cards, modales, etc.)
│
├── features/       # Lógica agrupada por dominio/funcionalidad del negocio
│                   # (ej: features/notas/ con sus hooks, tipos y llamadas a la API)
│
├── lib/            # Utilidades técnicas compartidas
│   ├── httpClient.ts   # Cliente HTTP central para hablar con el backend
│   └── queryClient.ts  # Configuración de React Query
│
├── App.tsx         # Componente raíz: junta providers + router
├── main.tsx        # Punto de entrada: monta React en el HTML
└── index.css       # Import de Tailwind (estilos globales)
```

### Cómo funciona cada parte

**`main.tsx`** es lo primero que se ejecuta. Toma el `<div id="root">` de `index.html` y monta ahí el componente `App`.

**`App.tsx`** no tiene lógica propia: solo envuelve todo con `AppProviders` (para que React Query y demás funcionen en cualquier parte de la app) y con `RouterProvider` (para que la navegación funcione).

**`app/router.tsx`** define qué componente se muestra en cada URL. Para agregar una página nueva:
1. Crear el componente en `src/pages/` (ej: `src/pages/NotasPage.tsx`)
2. Agregarlo como `children` en `router.tsx` con su `path`

**`app/Layout.tsx`** es el "marco" que se repite en todas las páginas (navbar, sidebar, etc.). El `<Outlet />` es donde se inyecta el contenido de la página actual.

**`pages/`** contiene una pantalla completa por archivo. Una página arma su vista combinando componentes de `components/` y lógica de `features/`.

**`components/`** son piezas de UI chicas y reutilizables, sin lógica de negocio pesada (reciben datos por props y renderizan).

**`features/`** agrupa todo lo relacionado a una funcionalidad concreta del producto (por ejemplo, "notas", "usuarios"). Dentro de cada feature suele haber:
- hooks que usan React Query para traer/mandar datos (`useNotas.ts`)
- tipos de TypeScript propios del dominio
- lógica específica de esa parte del negocio

**`lib/httpClient.ts`** es el único lugar donde se arma la URL del backend y se manejan los errores HTTP. Cualquier llamada a la API pasa por acá (`httpClient.get('/notas')`, `httpClient.post('/notas', data)`), así no repetimos `fetch` con headers y manejo de errores en cada archivo.

**`lib/queryClient.ts`** configura React Query (por ejemplo, cuántas veces reintentar un pedido fallido).

## Cómo lo vamos a manejar

- **Datos que vienen del backend** → siempre con React Query, usando `httpClient` (nunca `fetch` directo desde un componente).
- **Estado que es solo del frontend** (ej: un modal abierto, un filtro seleccionado) → `useState` si es local a un componente, o Zustand si lo necesitan varios componentes a la vez.
- **Formularios** → React Hook Form para el manejo del formulario + Zod para definir y validar el "shape" de los datos.
- **Estilos** → Tailwind, escribiendo las clases directo en el JSX. Evitar archivos `.css` sueltos salvo casos puntuales.
- **Antes de subir cambios**: correr `npm run lint` y `npm run build` para asegurarse de que no rompimos nada.
- **Variables sensibles o de configuración** (URLs, keys) van en `.env`, nunca hardcodeadas en el código. `.env` no se sube al repo (está en `.gitignore`); `.env.example` sí, como referencia de qué variables existen.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (ej: `http://localhost:3000`) |
