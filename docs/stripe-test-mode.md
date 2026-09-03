# Pruebas manuales de Stripe

Esta guía prueba el flujo completo: Checkout de Stripe, webhook y asignación del plan.

## 1. Preparar Stripe en modo prueba

1. En el Dashboard de Stripe activa **Test mode**.
2. Copia la clave secreta `sk_test_...`.
3. No uses claves `sk_live_...` en desarrollo.

## 2. Preparar MongoDB de prueba

Usa una base separada, por ejemplo `ariseXR_test`. Crea los planes si todavía no existen:

```powershell
cd backend
bun run seed:plans:test
```

Este comando carga explícitamente `.env.test`.

Crea `backend/.env.test` a partir de `.env.test.example` y configura `MONGODB_URI` apuntando a esa base y `STRIPE_SECRET_KEY` con una clave `sk_test_...`.

El backend usa `.env` en desarrollo. Para iniciar el servidor manual con la base y APIs de prueba:

```powershell
cd backend
bun run test:manual
```

Al iniciar verás en consola el nombre de la base de datos seleccionada, sin mostrar usuario ni contraseña.

Los comandos quedan separados así:

```text
bun dev                   -> servidor con .env
bun run test:manual       -> servidor manual con .env.test
bun test                  -> pruebas automatizadas, no levanta el servidor
```

Para el frontend manual, crea `frontend/.env.test` a partir de `frontend/.env.test.example`, asegúrate de que `BACKEND_URL=http://localhost:4000` y ejecuta en otra terminal:

```powershell
cd frontend
bun run test:manual
```

El frontend manual apuntará al backend de prueba en `http://localhost:4000`.

## 3. Crear los productos y precios de prueba

Desde `backend` ejecuta:

```powershell
bun run seed:plans:test
bun run stripe:seed:test
```

El script crea o reutiliza un producto y un precio único (`price_...`) para cada plan y guarda el `stripePriceId` en MongoDB. En Stripe los IDs de precios de prueba también empiezan por `price_`; lo que los diferencia es que fueron creados mientras está activo **Test mode**.

`no_life` también usa un precio único porque la aplicación actual utiliza Checkout con `mode: payment`. La compra otorga una membresía de un mes; no es una suscripción recurrente de Stripe.

## 4. Conectar el webhook local

En una terminal ejecuta:

```powershell
cd backend
.\stripe.exe login
.\stripe.exe listen --forward-to localhost:4000/api/payments/webhook
```

La URL que debes registrar o reenviar es:

```text
POST http://localhost:4000/api/payments/webhook
```

También existe el alias `POST /api/order/webhook`, pero se recomienda usar `/api/payments/webhook`.

Stripe CLI mostrará un secreto `whsec_...`. Ponlo como `STRIPE_WEBHOOK_SECRET` en la terminal donde iniciarás el backend:

```powershell
bun run test:manual
```

También es válido reenviar a `/api/order/webhook`; ambas rutas están soportadas.

## 5. Ejecutar una compra real de prueba

1. Inicia el frontend y el backend.
2. Inicia sesión con un usuario existente en la base de prueba.
3. Abre la sección de paquetes y compra uno.
4. Completa Stripe Checkout con:

```text
Número: 4242 4242 4242 4242
Fecha: cualquier fecha futura
CVC: cualquier valor
Código postal: cualquier valor
```

5. Revisa la terminal de Stripe CLI: debe aparecer `checkout.session.completed` con respuesta `200`.
6. Comprueba el perfil del usuario y la colección `PlanAssignment`.

Para `no_life` se debe verificar:

- `planSlug: no_life`
- `trackingMode: time`
- `grantedHours: 0`
- `expiresAt`: exactamente un mes después de `assignedAt`
- las sesiones se registran, pero no reducen horas

La barra de progreso avanza por días desde `assignedAt` hasta `expiresAt`.

## 6. Probar reintentos del webhook

Stripe puede reenviar eventos. El mismo `invoiceId` no debe crear una segunda asignación. El backend responde `500` si falla el procesamiento para permitir el reintento; el índice único e `invoiceId` hacen el procesamiento seguro.

Para probar únicamente un evento sintético:

```powershell
.\stripe.exe trigger checkout.session.completed
```

Ese evento no contiene necesariamente el usuario y el plan de una compra real, por lo que la prueba recomendada es completar el Checkout.

## 7. Verificación rápida

```powershell
cd backend
npm test
```

Las pruebas automatizadas validan los siete paquetes, el modo mensual de `no_life`, el vencimiento y la acumulación de paquetes por horas.
