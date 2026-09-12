# Guía de conexión y pruebas de LIBRETA

Actualizada: 12 de septiembre de 2026.

## Estado comprobado

- Frontend: http://localhost:5173. Backend: http://localhost:3001.
- La clave pública estaba repetida en SUPABASE_SERVICE_ROLE_KEY. El usuario la corrigió; las tablas protegidas ahora responden con HTTP 200.
- Supabase devuelve 2 perfiles vinculados a Auth, 1 crédito BOB y 12 cuotas. Hay 0 intenciones Pollar y 0 wallets de cobro configuradas. Estos son registros existentes; no se crearon ni borraron para esta revisión.
- El crédito BOB no aparece en el contrato HSK configurado. Se muestra sin respaldo HSK verificado. No se cambia de moneda ni se declara pagado/anclado automáticamente.
- HSK responde con chain ID 133. Unlock tiene bytecode en la dirección configurada en Sepolia (11155111); esto no demuestra que un usuario tenga una membresía vigente.
- Las consultas del backend para ambos perfiles devuelven el mismo crédito y 12 cuotas, con el ID de perfil correcto.

## 1. Abrir e iniciar sesión

1. Abre http://localhost:5173.
2. Usa Iniciar Sesión con tu cuenta LIBRETA. Se eliminaron los accesos de demostración.
3. Si creas una cuenta, introduce una dirección HSK que controles o conecta MetaMask. No se generan direcciones cuya clave luego se pierde.
4. La sesión sirve tanto al panel como a Cuotas Pollar. La wallet de Pollar se conecta aparte para firmar pagos.
5. Al recargar se valida la sesión contra /api/auth/me. Si caduca, vuelve a iniciar sesión.

## 2. Preparar un crédito compatible con Pollar

El crédito existente está en BOB. Para probar USDC se requiere un crédito nuevo con términos de prueba expresamente introducidos; BOB y USDC no son intercambiables.

1. Ingresa como prestatario y copia tu ID de perfil y dirección HSK del panel.
2. En otra ventana o sesión, ingresa como prestamista.
3. Pulsa Configurar cobros y crear crédito. Se abrirá Pagar con Pollar → Cuotas de mi libreta.
4. Conecta la wallet Pollar en Stellar testnet y pulsa Usar mi wallet conectada para cobrar.
5. Abre Crear crédito de prueba en HSK y Supabase.
6. Introduce el ID de perfil y wallet HSK del prestatario, capital, número de cuotas, importe por cuota y primer vencimiento.
7. La moneda es USDC, la frecuencia semanal y la red stellar:testnet. Comprueba los términos antes de registrar.
8. El nuevo crédito debe aparecer en ambos perfiles. Su registro HSK se consulta en la red; los comprobantes solo se indican verificados si coinciden con la blockchain.

## 3. Pagar una cuota

1. Como prestatario, pulsa Abrir cuotas y pagos Pollar.
2. Conecta tu wallet Stellar de testnet. Debe disponer de USDC de prueba y XLM suficiente en la cuenta que paga comisiones.
3. En el crédito USDC, pulsa Preparar pago para la siguiente cuota.
4. Revisa importe, origen y destinatario; pulsa Confirmar y pagar esta cuota.
5. Espera la conciliación del servidor: CREATED → VERIFIED → ANCHORED. VERIFIED indica pago conciliado con anclaje pendiente.
6. Consulta el enlace Stellar y el comprobante HSK. La lectura de evidencia HSK tiene caché de hasta 30 segundos; los paneles consultan cuotas cada 5 segundos.
7. Recarga ambos perfiles y verifica que solo cambió la cuota correspondiente y que los totales se actualizan por moneda.

## 4. Comprobar recuperación e idempotencia

- Con el mismo hash, usa Verificar sin volver a pagar. No vuelvas a transferir USDC para probar idempotencia.
- Debe seguir existiendo una sola intención por cuota y una sola aplicación de la transacción.
- Si Stellar confirmó pero HSK falla, la cuota permanece conciliada y el servidor reintenta el anclaje.
- Si la red falla antes de obtener un hash, consulta el historial Pollar antes de considerar otro envío.
- Al cerrar sesión y entrar con otra cuenta no deben permanecer cuotas de la sesión anterior.

## 5. Funciones que no deben confundirse con este flujo

- Transferencia libre no paga una cuota automáticamente.
- Registrar Crédito y Confirmar Pago en herramientas técnicas actúan directamente sobre el contrato; no crean ni concilian cuotas en Supabase.
- El panel no habilita aún cobros OTP, cobrador offline ni la publicación del pasaporte. Se quitaron el OTP aleatorio, el LRI fijo y el enlace a un pasaporte inventado.
- Unlock ya no concede acceso por una dirección válida solamente: requiere firma vigente y consulta real de membresía en la red configurada. Su interfaz completa de pasaporte sigue pendiente.
- El expediente es un informe sin firma. No se presenta como credencial W3C con una firma fabricada.

## Validación técnica

Frontend: npm run lint y npm run build. Backend: npm run build, npm test -- --runInBand, npm run test:settlements:db.
Resultado de esta revisión: lint y build del frontend correctos; build del backend correcto; 54 pruebas Jest y 7 pruebas de conciliación SQL aprobadas. Vite advierte sobre el tamaño de un bundle, sin impedir la compilación.

Las pruebas usan fixtures aisladas; no introducen datos de demostración en la aplicación ni en Supabase remoto.
La revisión de conexión usa consultas de solo lectura y no sustituye la prueba de pago completa con dos sesiones de usuario.
