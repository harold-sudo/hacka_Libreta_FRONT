# HISTORIAS DE USUARIO DETALLADAS DEL FRONTEND — LIBRETA

**Proyecto:** LIBRETA — Microcrédito Verificable & Portabilidad de Reputación Financiera  
**Hackathon:** ETH Bolivia Buildathon 2026 (Cochabamba)  
**Versión:** 1.0.0  
**Audiencia:** Desarrolladores Frontend, Diseñadores UX/UI, QA & Jurado Evaluador  

---

## ÍNDICE DE HISTORIAS DE USUARIO POR MÓDULO

1. **MÓDULO PRESTATARIO (BORROWER)**
   - `[US-F01]` Visualización de Libreta Activa y Cronograma de Cuotas
   - `[US-F02]` Generación de Código OTP para Doble Atestación de Cobro en Efectivo
   - `[US-F03]` Liquidación Digital Directa de Cuota con Pollar (1 USDC Mainnet)
   - `[US-F04]` Consulta y Compartición del Libreta Passport Soberano

2. **MÓDULO COBRADOR EN RUTA (COLLECTOR - PWA OFFLINE-FIRST)**
   - `[US-F05]` Hoja de Ruta Diaria con Detección de Conectividad
   - `[US-F06]` Escáner QR de Libreta y Registro de Cobro en Efectivo con Doble Atestación
   - `[US-F07]` Monitor de Cola de Sincronización en IndexedDB y Despacho en Lote

3. **MÓDULO PRESTAMISTA / ADMINISTRADOR (LENDER)**
   - `[US-F08]` Dashboard Operativo de Cartera y Métricas de Recaudación
   - `[US-F09]` Originación y Anclaje Criptográfico de Nuevo Microcrédito en HSK Chain
   - `[US-F10]` Gestión de Cobradores y Asignación de Rutas

4. **MÓDULO AUDITOR / OFICIAL FINANCIERO (AUDITOR - TOKEN-GATED)**
   - `[US-F11]` Previsualización Pública de Reputación LRI en Libreta Passport
   - `[US-F12]` Desbloqueo Token-Gated del Expediente Forense con Unlock Protocol
   - `[US-F13]` Descarga del Dossier Certificado W3C Verifiable Credential y Pruebas HSK

---

## 1. MÓDULO PRESTATARIO (BORROWER)

### `[US-F01]` Visualización de Libreta Activa y Cronograma de Cuotas

* **Como:** Prestatario registrado en LIBRETA,
* **Quiero:** Visualizar una tarjeta digital tipo "libreta de mano" que resuma mi crédito activo, cuotas vencidas, cuotas pendientes y el historial de pagos confirmados,
* **Para:** Tener total certidumbre de mi deuda y comprobar que mis pagos han sido reconocidos legal y digitalmente.

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario: Consulta exitosa de la libreta activa
  Dado que el prestatario ha iniciado sesión en "/borrower"
  Cuando la página carga el crédito activo desde el backend
  Entonces se muestra el resumen del crédito:
    | Campo               | Ejemplo       |
    | Monto Prestado      | 1,200.00 BOB  |
    | Cuota Regular       | 100.00 BOB    |
    | Progreso de Cuotas  | 7 / 12 pagadas|
    | Próximo Vencimiento | 15 Sep 2026   |
  Y se muestra la lista ordenada de cuotas con sus badges de estado:
    | Estado | Color     | Acción Permitida           |
    | PAID   | Verde     | Ver comprobante / hash HSK |
    | PENDING| Ámbar     | "Pagar con Pollar" / "OTP" |
    | OVERDUE| Rojo      | Alerta de regularización   |

Escenario: El usuario no tiene créditos activos
  Dado que el prestatario no registra préstamos vigentes
  Entonces se muestra un estado vacío (Empty State) con un botón para invitar a su prestamista o solicitar uno nuevo.
```

#### Componentes Frontend Involucrados:
- `BorrowerPassbookCard.tsx` (Card principal que emula visualmente la libreta física).
- `InstallmentList.tsx` (Lista interactiva de cuotas).
- `InstallmentStatusBadge.tsx` (`PAID`, `PENDING`, `OVERDUE`, `PENDING_CONFIRMATION`).
- Hook: `useBorrowerActiveLoan()` (React Query key: `['borrower', 'active-loan']`).

---

### `[US-F02]` Generación de Código OTP para Doble Atestación de Cobro en Efectivo

* **Como:** Prestatario que está entregando dinero en efectivo al cobrador en persona,
* **Quiero:** Generar un código numérico seguro de un solo uso (OTP de 6 dígitos) o un código QR dinámico en mi pantalla,
* **Para:** Que el cobrador lo ingrese en su aplicación y se genere una atestación bilateral válida sin necesidad de que yo tenga conexión a internet.

#### Criterios de Aceptación:
```gherkin
Escenario: Generación de código de confirmación bilateral
  Dado que el prestatario se encuentra en la pantalla de su cuota pendiente
  Cuando hace clic en "Confirmar Pago en Efectivo (Generar Código)"
  Entonces se despliega un modal con:
    1. Un código numérico legible de 6 dígitos (ej. "849-201").
    2. Un código QR dinámico que encapsula: `{"loanId": "...", "installmentNumber": 3, "otp": "849201"}`.
    3. Un temporizador de cuenta regresiva de 5 minutos.
  Y un texto instructivo: "Muéstrale este código al cobrador para sellar tu recibo".
```

#### Requerimientos de UI/UX:
- Números de tipografía grande monoespaciada (`text-4xl font-mono tracking-widest text-center`).
- Botón de regeneración si el tiempo expira.
- El código se deriva determinísticamente de los datos del préstamo o se obtiene vía hook offline.

---

### `[US-F03]` Liquidación Digital Directa de Cuota con Pollar (1 USDC Mainnet)

* **Como:** Prestatario bancarizado o con saldo digital en USDC,
* **Quiero:** Pagar mi cuota directamente mediante el botón de Pollar en la aplicación,
* **Para:** Salir de la cuota al instante, sin esperar la visita del cobrador físico, y obtener mi hash de pago en Ethereum Mainnet.

#### Criterios de Aceptación:
```gherkin
Escenario: Pago exitoso vía widget de Pollar
  Dado que el prestatario tiene una cuota en estado "PENDING"
  Cuando pulsa el botón "Pagar con Pollar (1 USDC)"
  Entonces se inicializa el modal no custodial de "@pollar/react":
    - Monto fijado: 1 USDC
    - Moneda: USDC
    - Receptor: Dirección de wallet del prestamista
    - Metadatos: loanId e installmentNumber
  Cuando el usuario completa la transacción en red principal y el widget dispara `onPaymentSuccess`
  Entonces la UI muestra inmediatamente:
    - Estado de felicitación: "¡Cuota Liquidada Exitosamente!"
    - Enlace al explorador de bloques con el `txHash` en Mainnet
    - La cuota cambia de inmediato su estado visual a "PAID (Pollar USDC)"
  Y React Query invalida automáticamente la caché de cuotas (`['borrower', 'active-loan']`).

Escenario: El usuario cancela el modal de Pollar
  Dado que el modal de checkout de Pollar está visible
  Cuando el usuario cierra la ventana emergente sin firmar
  Entonces la cuota permanece en estado "PENDING" y se muestra un toast informativo no bloqueante.
```

#### Especificación Técnica de Integración:
- Paquete: `@pollar/react`
- Variables requeridas: `VITE_POLLAR_APP_ID`, wallet del prestamista.
- Componente: `PollarPaymentModal.tsx`

---

### `[US-F04]` Consulta y Compartición del Libreta Passport Soberano

* **Como:** Prestatario que ha pagado sus cuotas con esfuerzo y puntualidad,
* **Quiero:** Visualizar mi perfil público de reputación financiera (**Libreta Passport**) y copiar mi enlace personal (`/p/:slug`),
* **Para:** Presentarlo ante bancos, cooperativas o comercios y demostrar mi historial de pago impecable.

#### Criterios de Aceptación:
```gherkin
Escenario: Compartir enlace de reputación financiera
  Dado que el prestatario se encuentra en "/borrower/passport"
  Entonces puede ver:
    - Su slug público configurable (ej. "libreta.app/p/maria-mercado")
    - Un switch "Hacer mi pasaporte público / privado"
    - Su calificación LRI actual (ej. 96/100) en un medidor circular
    - Botón "Copiar Enlace" que copia la URL completa al portapapeles con un tooltip de confirmación
    - Botón "Ver como visitante" que abre `/p/:slug` en una nueva pestaña
```

---

## 2. MÓDULO COBRADOR EN RUTA (COLLECTOR - PWA OFFLINE-FIRST)

### `[US-F05]` Hoja de Ruta Diaria con Detección de Conectividad

* **Como:** Cobrador en ruta de campo,
* **Quiero:** Consultar la lista de clientes que debo visitar hoy, con un indicador permanente en la cabecera que me diga si estoy **Online** u **Offline**,
* **Para:** Desplazarme con tranquilidad sabiendo que la aplicación seguirá funcionando sin importar la cobertura telefónica.

#### Criterios de Aceptación:
```gherkin
Escenario: Visualización de la ruta en modo conectado
  Dado que el cobrador accede a "/collector/route" con conexión a internet
  Entonces la cabecera muestra una píldora verde: "🟢 En Línea"
  Y se lista la ruta del día agrupada por clientes y direcciones locales.

Escenario: Pérdida súbita de conectividad
  Dado que el cobrador entra a una zona sin señal
  Cuando el navegador detecta el evento `window.onoffline`
  Entonces la cabecera cambia inmediatamente a una píldora ámbar: "📡 Modo Offline Activo"
  Y un banner persistente avisa: "Los cobros se guardarán en tu dispositivo y se sincronizarán al recuperar señal."
```

#### Componentes:
- `ConnectivityStatusBar.tsx` (Zustand hook: `useNetworkStatus()`).
- `DailyRouteList.tsx` (Lista de clientes a cobrar hoy).

---

### `[US-F06]` Escáner QR de Libreta y Registro de Cobro en Efectivo con Doble Atestación

* **Como:** Cobrador frente al cliente en su puesto de venta,
* **Quiero:** Abrir la cámara para escanear el QR de la libreta del cliente, ingresar el monto recibido y validar el código OTP dictado por el cliente,
* **Para:** Generar el recibo digital incontrovertible aun cuando ambos estemos desconectados.

#### Criterios de Aceptación:
```gherkin
Escenario: Registro de cobro presencial exitoso (Offline u Online)
  Dado que el cobrador pulsa "Escanear QR de Libreta"
  Cuando el escáner detecta el código QR del cliente
  Entonces se precarga la información del crédito:
    - Nombre / Alias del cliente
    - Número de cuota a cobrar
    - Monto esperado (ej. 100 BOB)
  Cuando el cobrador confirma el monto en efectivo e introduce los 6 dígitos del OTP del cliente
  Y presiona "Registrar Cobro Bilateral"
  Entonces:
    1. La aplicación calcula el `receiptHash` criptográfico localmente.
    2. Almacena el registro en IndexedDB con estado "QUEUED".
    3. Muestra una pantalla de éxito verde con un ticket digital y sonido de confirmación háptico.
    4. El contador de la cola de sincronización se incrementa en +1.
```

#### Requerimientos de UI/UX:
- Componente de cámara con fallback a ingreso manual de ID de préstamo.
- Validación inmediata de formato OTP (6 dígitos numéricos).
- Feedback visual instantáneo para no retrasar la ruta del cobrador.

---

### `[US-F07]` Monitor de Cola de Sincronización en IndexedDB y Despacho en Lote

* **Como:** Cobrador que ha finalizado su jornada o regresado a una zona con Wi-Fi/4G,
* **Quiero:** Ver la lista de pagos pendientes de sincronización y un botón para forzar el envío masivo al servidor,
* **Para:** Asegurarme de que todos los cobros de mi jornada impactaron en la base de datos y en HSK Chain.

#### Criterios de Aceptación:
```gherkin
Escenario: Sincronización automática de cobros acumulados
  Dado que hay 5 cobros almacenados en IndexedDB con estado "QUEUED"
  Cuando el dispositivo detecta conexión a internet
  Entonces la PWA inicia el proceso de sincronización automática en segundo plano:
    - La barra de estado muestra: "🔄 Sincronizando 5 cobros..."
    - Se envía un POST a "/api/sync/batch" con el array de cobros
  Cuando el backend responde con HTTP 200 y la lista de IDs sincronizados
  Entonces los registros locales pasan a estado "SYNCED"
  Y la barra muestra: "✅ Todos los cobros han sido respaldados en HSK Chain".

Escenario: Error en la sincronización de un cobro específico
  Dado que un cobro falla (por ejemplo, cuota ya liquidada por Pollar previamente)
  Entonces el registro se marca como "ERROR", mostrando la causa exacta
  Y se ofrece la opción de "Reintentar" o "Reportar Discrepancia".
```

---

## 3. MÓDULO PRESTAMISTA / ADMINISTRADOR (LENDER)

### `[US-F08]` Dashboard Operativo de Cartera y Métricas de Recaudación

* **Como:** Prestamista o administrador de una microfinanciera,
* **Quiero:** Un panel de control con métricas en tiempo real de mi cartera (capital colocado, capital recaudado, mora global y cobros de hoy),
* **Para:** Tomar decisiones estratégicas y monitorear la salud de mi negocio.

#### Criterios de Aceptación:
```gherkin
Escenario: Visualización de KPIs financieros
  Dado que el prestamista accede a "/lender/dashboard"
  Entonces se muestran las métricas principales:
    | Métrica             | Valor Ejemplo |
    | Capital Colocado    | 50,000 BOB    |
    | Total Recaudado     | 32,400 BOB    |
    | Eficiencia de Cobro | 94.2%         |
    | Préstamos Activos   | 28            |
  Y gráficos de tendencia semanal de recaudación (Efectivo vs. Pollar USDC).
```

---

### `[US-F09]` Originación y Anclaje Criptográfico de Nuevo Microcrédito en HSK Chain

* **Como:** Prestamista que acuerda un nuevo crédito con un comerciante,
* **Quiero:** Llenar un formulario con el capital, número de cuotas, frecuencia y alias del prestatario,
* **Para:** Generar el cronograma de pagos, cifrar los datos sensibles en Supabase y registrar el préstamo en el contrato `LibretaRegistry.sol` en HSK Chain.

#### Criterios de Aceptación:
```gherkin
Escenario: Creación exitosa de microcrédito
  Dado que el prestamista completa el formulario en "/lender/loans/new":
    | Campo           | Valor           |
    | Prestatario     | Seleccionar / ID|
    | Capital         | 1,000.00 BOB    |
    | Frecuencia      | Semanal         |
    | Total Cuotas    | 10              |
    | Monto de Cuota  | 110.00 BOB      |
  Cuando presiona "Emitir y Anclar en Blockchain"
  Entonces el formulario valida los datos con Zod:
    - Capital > 0
    - Cuotas entre 1 y 65535
    - Monto de cuota > 0
  Y envía `POST /api/loans` al backend
  Cuando la llamada es exitosa:
    - Se muestra el `hsk_loan_id` registrado
    - Se ofrece la descarga del código QR de la libreta para entregar al cliente
    - Se redirige al detalle del crédito con el plan de pagos generado.
```

---

### `[US-F10]` Gestión de Cobradores y Asignación de Rutas

* **Como:** Prestamista con múltiples cobradores a su cargo,
* **Quiero:** Asignar préstamos específicos a un cobrador para una fecha determinada,
* **Para:** Que cada cobrador vea únicamente los clientes que le corresponden en su aplicación móvil.

#### Criterios de Aceptación:
- Selector de cobrador activo.
- Lista de préstamos pendientes filtrables por zona o barrio.
- Botón "Guardar y Asignar Ruta" que persiste en la tabla `collection_routes` de Supabase.

---

## 4. MÓDULO AUDITOR / OFICIAL FINANCIERO (AUDITOR - TOKEN-GATED)

### `[US-F11]` Previsualización Pública de Reputación LRI en Libreta Passport

* **Como:** Oficial de crédito de un banco o fintech visitante,
* **Quiero:** Entrar al enlace público `libreta.app/p/:slug` de un cliente y ver sus estadísticas de cumplimiento agregadas,
* **Para:** Evaluar si el solicitante es sujeto de crédito sin vulnerar su privacidad personal.

#### Criterios de Aceptación:
```gherkin
Escenario: Previsualización de reputación sin datos personales (Zero PII)
  Dado que cualquier visitante navega a "/p/:slug"
  Entonces la página renderiza:
    1. Alias del cliente (ej. "Dña. Rosa - Puesto 45") sin CI, teléfono ni dirección.
    2. Medidor del Índice LRI (ej. 98/100) con desglose:
       - Tasa de puntualidad (ej. 100%)
       - Créditos completados con éxito (ej. 3)
       - Proporción de capital devuelto (ej. 100%)
    3. Gráfico radar o de barras con el histórico de cumplimiento.
  Y en la parte inferior se muestra una sección bloqueada:
    "Expediente Forense Completo (Hashes de HSK Chain y Credenciales Verificables) — Acceso Restringido para Auditores".
```

---

### `[US-F12]` Desbloqueo Token-Gated del Expediente Forense con Unlock Protocol

* **Como:** Analista de riesgos de una entidad aliada que cuenta con membresía de auditor,
* **Quiero:** Conectar mi billetera Web3 para verificar mi Key de Unlock Protocol y desbloquear los datos de auditoría profunda,
* **Para:** Auditar matemáticamente la autenticidad de cada cuota registrada en HSK Chain.

#### Criterios de Aceptación:
```gherkin
Escenario: Usuario sin membresía activa
  Dado que el auditor no tiene una Key válida en el contrato de Unlock
  Cuando hace clic en "Desbloquear Expediente Completo"
  Entonces se ejecuta el Paywall Modal de "@unlock-protocol/paywall"
  Y se le ofrece adquirir la membresía de auditor o renovar su pase.

Escenario: Usuario con membresía activa confirmada
  Dado que el auditor conecta una wallet que posee un NFT Key válido en el Lock de Unlock
  Entonces la sección bloqueada se abre automáticamente:
    - Se muestra el listado completo de atestaciones:
      | Cuota # | Timestamp           | Tipo       | Receipt Hash (HSK) | Mainnet TX (Pollar) |
      | 1       | 2026-08-01 10:14:02 | Efectivo   | 0x3a8f...91c2      | N/A                 |
      | 2       | 2026-08-08 16:30:11 | Pollar     | 0x77d1...ba40      | 0x911c...420e       |
    - Cada hash tiene un enlace interactivo al explorador de bloques de HSK y Mainnet.
```

---

### `[US-F13]` Descarga del Dossier Certificado W3C Verifiable Credential y Pruebas HSK

* **Como:** Auditor que ha verificado el expediente con Unlock Protocol,
* **Quiero:** Exportar un informe consolidado en formato JSON-LD (W3C Verifiable Credential) y un PDF formal con firma criptográfica,
* **Para:** Adjuntar el comprobante de reputación al legajo crediticio del sistema bancario tradicional (Open Finance).

#### Criterios de Aceptación:
- Botón visible únicamente tras el desbloqueo por Unlock Protocol: *"Exportar Credencial W3C"*.
- Descarga instantánea de un archivo JSON firmado criptográficamente con el estándar de credenciales verificables.
- Opción *"Imprimir Dictamen Forense"* con formato de hoja membretada, sellos de tiempo y códigos QR de validación on-chain.
