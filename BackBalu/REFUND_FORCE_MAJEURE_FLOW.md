# 💸 FLUJO DE CANCELACIÓN CON REEMBOLSO POR FUERZA MAYOR

## 📋 Descripción General

Este documento describe el **flujo excepcional** para cancelar reservas pagadas y devolver el dinero al cliente en casos de **fuerza mayor** (emergencias, situaciones extraordinarias que impiden la estadía).

> ⚠️ **IMPORTANTE**: Este flujo es **excepcional** y solo puede ser ejecutado por el **Owner** del hotel. No afecta las políticas normales de cancelación que no permiten reembolsos.

---

## 🎯 Objetivo

Permitir al Owner cancelar reservas completamente pagadas y registrar la devolución del dinero en el sistema contable, manteniendo la trazabilidad completa de la operación excepcional.

---

## 🔐 Restricciones de Seguridad

### ✅ Solo Owner puede ejecutar
- **Rol requerido**: `owner`
- **Validación en backend**: Verificación estricta del rol
- **No delegable**: Ni admin ni recepcionistas pueden ejecutar este flujo

### 🚫 Validaciones Restrictivas

1. **No se puede reembolsar si el huésped ya hizo check-in**
   - Status `checked-in` → **BLOQUEADO**
   - Razón: El huésped ya está hospedado, debe hacer checkout primero

2. **No se puede reembolsar reservas completadas**
   - Status `completed` → **BLOQUEADO**
   - Razón: La estadía ya finalizó

3. **Debe haber pagos que reembolsar**
   - Si `totalPaid <= 0` → **BLOQUEADO**
   - Razón: No hay dinero que devolver

4. **Razón obligatoria**
   - Campo `refundReason` → **REQUERIDO**
   - Debe explicar el motivo excepcional (fuerza mayor)

---

## 🔄 Flujo del Proceso

```
┌─────────────────────────────────────────────────────────────┐
│  OWNER IDENTIFICA CASO EXCEPCIONAL DE FUERZA MAYOR         │
│  (Emergencia médica, desastre natural, etc.)               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  1. VALIDACIÓN DE RESERVA                                   │
│     - Verificar que existe                                  │
│     - Verificar status (no checked-in ni completed)         │
│     - Verificar que hay pagos realizados                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CÁLCULO DE MONTO A REEMBOLSAR                          │
│     - Sumar todos los pagos authorized/completed           │
│     - totalRefund = suma de pagos válidos                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. REGISTRO DE REEMBOLSO (Pago Negativo)                  │
│     - amount: -totalPaid (⭐ NEGATIVO)                      │
│     - paymentType: 'refund'                                 │
│     - paymentStatus: 'completed'                            │
│     - transactionId: REFUND-{bookingId}-{timestamp}        │
│     - notes: Razón detallada del reembolso                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. ACTUALIZACIÓN DE ESTADO DE RESERVA                     │
│     - status: 'cancelled'                                   │
│     - notes: Se agrega registro del reembolso              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. LIBERACIÓN DE HABITACIÓN                               │
│     - status: null                                          │
│     - available: true                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ TRANSACCIÓN CONFIRMADA                                 │
│  El dinero debe ser devuelto manualmente al cliente        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 Endpoint API

### **POST** `/api/bookings/:bookingId/cancel-with-refund`

#### Headers
```json
{
  "Authorization": "Bearer {token_del_owner}",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{
  "refundReason": "Emergencia médica familiar - fuerza mayor",
  "refundMethod": "transfer",
  "notes": "Cliente en el hospital, imposible viajar. Se autoriza reembolso excepcional."
}
```

#### Parámetros

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `refundReason` | string | **Sí** | Motivo del reembolso (fuerza mayor) |
| `refundMethod` | string | No | Método de devolución: `transfer`, `cash`, `credit_card` (default: `transfer`) |
| `notes` | string | No | Notas adicionales sobre el caso |

#### Response Success (200)
```json
{
  "error": false,
  "success": true,
  "message": "✅ Reserva cancelada y reembolso registrado exitosamente",
  "data": {
    "booking": {
      "bookingId": 123,
      "roomNumber": "205",
      "guest": "Juan Pérez",
      "previousStatus": "paid",
      "newStatus": "cancelled"
    },
    "refund": {
      "paymentId": 456,
      "amount": 150000,
      "method": "transfer",
      "reason": "Emergencia médica familiar - fuerza mayor",
      "transactionId": "REFUND-123-1737392400000"
    },
    "financial": {
      "originalPayments": 2,
      "totalRefunded": 150000,
      "refundMethod": "transfer"
    },
    "room": {
      "number": "205",
      "status": "Disponible",
      "liberated": true
    }
  },
  "timestamp": "2026-01-20 14:30:00 GMT-5"
}
```

#### Response Errors

**403 - Acceso Denegado**
```json
{
  "error": true,
  "message": "🚫 ACCESO DENEGADO: Solo el dueño del hotel puede autorizar reembolsos por fuerza mayor"
}
```

**400 - Validación Fallida**
```json
{
  "error": true,
  "message": "❌ No se puede cancelar una reserva cuando el huésped ya está hospedado (checked-in)",
  "data": {
    "suggestion": "Debe hacer checkout primero o esperar a que el huésped se retire",
    "currentStatus": "checked-in"
  }
}
```

---

## 💾 Modelo de Datos

### Registro en Tabla `Payments`

```javascript
{
  paymentId: 456,
  bookingId: 123,
  amount: -150000, // ⭐ NEGATIVO (indica salida de dinero)
  paymentMethod: "transfer",
  paymentType: "refund", // ⭐ Tipo especial
  paymentStatus: "completed",
  paymentDate: "2026-01-20T14:30:00.000Z",
  transactionId: "REFUND-123-1737392400000",
  paymentReference: "REEMBOLSO FUERZA MAYOR - Emergencia médica familiar",
  notes: `
🚨 CASO EXCEPCIONAL - REEMBOLSO POR FUERZA MAYOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Razón: Emergencia médica familiar - fuerza mayor
Monto reembolsado: $150,000
Autorizado por: 1234567890 (Owner)
Método: transfer
Notas adicionales: Cliente en el hospital, imposible viajar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `,
  processedBy: "1234567890",
  isReservationPayment: false,
  isCheckoutPayment: false,
  includesExtras: false
}
```

### Actualización en Tabla `Bookings`

```javascript
{
  bookingId: 123,
  status: "cancelled",
  notes: `
[Notas anteriores de la reserva...]

🚨 CANCELACIÓN EXCEPCIONAL CON REEMBOLSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha: 2026-01-20 14:30:00 GMT-5
Razón: Emergencia médica familiar - fuerza mayor
Monto reembolsado: $150,000
Autorizado por: 1234567890 (Owner)
Notas: Cliente en el hospital, imposible viajar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `
}
```

---

## 📊 Impacto en Reportes Financieros

### Dashboard Financiero (`GET /api/financials/summary`)

#### Antes (sin reembolsos):
```json
{
  "revenue": {
    "total": 500000
  }
}
```

#### Ahora (con reembolsos):
```json
{
  "revenue": {
    "gross": 500000,      // ⭐ Ingresos brutos (solo positivos)
    "refunds": 150000,    // ⭐ Total de reembolsos (valor absoluto)
    "net": 350000,        // ⭐ Ingresos netos (gross - refunds)
    "online": 200000,
    "local": 300000
  }
}
```

### Reporte por Período (`GET /api/financials/revenue-by-period`)

```json
{
  "months": [
    {
      "name": "enero",
      "revenue": 500000,      // ⭐ Ingresos brutos del mes
      "refunds": 150000,      // ⭐ Reembolsos del mes
      "netRevenue": 350000,   // ⭐ Ingresos netos del mes
      "expenses": 200000,
      "balance": 150000,
      "stats": {
        "paymentCount": 25,
        "refundCount": 1      // ⭐ Número de reembolsos
      }
    }
  ],
  "summary": {
    "totalRevenue": 500000,         // ⭐ Bruto
    "totalRefunds": 150000,         // ⭐ Reembolsos
    "netRevenue": 350000,           // ⭐ Neto
    "totalExpenses": 200000,
    "balance": 150000,
    "averageMonthlyRevenue": 500000,
    "averageMonthlyNetRevenue": 350000  // ⭐ Promedio neto
  }
}
```

---

## 🔍 Cómo Identificar Reembolsos en la Base de Datos

### Query SQL
```sql
SELECT 
  p."paymentId",
  p."bookingId",
  p."amount",
  p."paymentMethod",
  p."paymentType",
  p."paymentDate",
  p."transactionId",
  p."notes",
  b."roomNumber",
  g."scostumername" as "guestName"
FROM "Payments" p
LEFT JOIN "Bookings" b ON p."bookingId" = b."bookingId"
LEFT JOIN "Buyers" g ON b."guestId" = g."sdocno"
WHERE 
  p."amount" < 0                    -- ⭐ Pagos negativos = reembolsos
  AND p."paymentType" = 'refund'    -- ⭐ Tipo refund
  AND p."paymentStatus" = 'completed'
ORDER BY p."paymentDate" DESC;
```

---

## 📱 Frontend - Componente UI (Propuesta)

### Ubicación
**Archivo:** `FrontBalu/src/Components/Admin/RefundManager.jsx`

### Características
- **Solo visible para Owner**
- **Confirmación doble** antes de ejecutar
- **Formulario con validación** de razón obligatoria
- **Advertencia visual** clara de que es una operación excepcional

### Mockup

```jsx
// RefundManager.jsx
import React, { useState } from 'react';
import axios from 'axios';

const RefundManager = ({ booking, onRefundComplete }) => {
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRefund = async () => {
    try {
      setIsProcessing(true);
      const response = await axios.post(
        `/api/bookings/${booking.bookingId}/cancel-with-refund`,
        { refundReason, refundMethod, notes }
      );
      
      alert('✅ Reembolso procesado exitosamente');
      onRefundComplete(response.data);
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="refund-manager border-red-500 border-2 p-4 rounded-lg">
      <h3 className="text-red-600 font-bold text-lg mb-2">
        🚨 CANCELACIÓN EXCEPCIONAL CON REEMBOLSO
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Solo para casos de fuerza mayor. El dinero será devuelto al cliente.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block font-medium mb-1">
            Razón del Reembolso (Obligatorio) *
          </label>
          <textarea
            className="w-full border p-2 rounded"
            rows="3"
            placeholder="Ej: Emergencia médica familiar, desastre natural, etc."
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Método de Devolución
          </label>
          <select
            className="w-full border p-2 rounded"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
          >
            <option value="transfer">Transferencia Bancaria</option>
            <option value="cash">Efectivo</option>
            <option value="credit_card">Tarjeta de Crédito</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">
            Notas Adicionales
          </label>
          <textarea
            className="w-full border p-2 rounded"
            rows="2"
            placeholder="Información adicional sobre el caso..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="bg-yellow-100 border border-yellow-400 p-3 rounded">
          <p className="text-sm">
            <strong>⚠️ IMPORTANTE:</strong>
          </p>
          <ul className="text-sm list-disc ml-5 mt-1">
            <li>Monto a reembolsar: <strong>${booking.totalPaid?.toLocaleString('es-CO')}</strong></li>
            <li>Esta operación <strong>NO se puede deshacer</strong></li>
            <li>El dinero debe ser devuelto manualmente al cliente</li>
            <li>Quedará registrado en reportes financieros</li>
          </ul>
        </div>

        {!showConfirm ? (
          <button
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
            onClick={() => setShowConfirm(true)}
            disabled={!refundReason.trim()}
          >
            💸 Procesar Reembolso Excepcional
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-red-600 font-bold">
              ⚠️ ¿Está SEGURO de procesar este reembolso?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                onClick={handleRefund}
                disabled={isProcessing}
              >
                {isProcessing ? '⏳ Procesando...' : '✅ SÍ, Confirmar Reembolso'}
              </button>
              <button
                className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
                onClick={() => setShowConfirm(false)}
                disabled={isProcessing}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefundManager;
```

---

## 🧪 Testing

### 1. Test de Validación de Rol
```bash
# Como admin (debe fallar)
curl -X POST http://localhost:4000/api/bookings/123/cancel-with-refund \
  -H "Authorization: Bearer {token_admin}" \
  -H "Content-Type: application/json" \
  -d '{"refundReason": "Prueba"}'

# Esperado: 403 Forbidden
```

### 2. Test de Reserva Checked-In (debe fallar)
```bash
# Reserva con status="checked-in"
curl -X POST http://localhost:4000/api/bookings/456/cancel-with-refund \
  -H "Authorization: Bearer {token_owner}" \
  -H "Content-Type: application/json" \
  -d '{"refundReason": "Prueba"}'

# Esperado: 400 Bad Request - No se puede cancelar checked-in
```

### 3. Test de Reembolso Exitoso
```bash
# Reserva con status="paid"
curl -X POST http://localhost:4000/api/bookings/789/cancel-with-refund \
  -H "Authorization: Bearer {token_owner}" \
  -H "Content-Type: application/json" \
  -d '{
    "refundReason": "Emergencia médica - fuerza mayor",
    "refundMethod": "transfer",
    "notes": "Cliente hospitalizado"
  }'

# Esperado: 200 OK con detalles del reembolso
```

---

## 📌 Casos de Uso Reales

### Caso 1: Emergencia Médica
**Situación**: Un cliente reservó y pagó $200,000 pero tuvo un accidente el día antes del check-in.

**Acción**:
```json
POST /api/bookings/123/cancel-with-refund
{
  "refundReason": "Emergencia médica - accidente grave",
  "refundMethod": "transfer",
  "notes": "Cliente hospitalizado. Se autoriza reembolso completo como gesto de solidaridad."
}
```

**Resultado**:
- Reserva cancelada
- $200,000 registrados como reembolso (pago negativo)
- Habitación liberada automáticamente
- Registro completo en reportes financieros

### Caso 2: Desastre Natural
**Situación**: Inundación en la zona impide el acceso al hotel.

**Acción**:
```json
POST /api/bookings/456/cancel-with-refund
{
  "refundReason": "Desastre natural - inundación zona acceso",
  "refundMethod": "transfer",
  "notes": "Situación de fuerza mayor. Carreteras cerradas, imposible llegar."
}
```

---

## ⚠️ Políticas y Recomendaciones

### Para el Owner

1. **Documentar cada caso**
   - Tomar notas detalladas del motivo
   - Guardar evidencia (fotos, certificados médicos, etc.)
   - Justificar la decisión excepcional

2. **Comunicación con el cliente**
   - Informar claramente el proceso de devolución
   - Confirmar método de pago para la devolución
   - Establecer tiempos de reembolso (3-5 días hábiles típicamente)

3. **Revisión contable**
   - Los reembolsos aparecerán como ingresos negativos
   - Revisar mensualmente el total de reembolsos
   - Evaluar impacto en flujo de caja

### Límites Sugeridos

- **Máximo recomendado**: 2-3 reembolsos por mes
- **Si supera este límite**: Revisar políticas de reserva
- **Auditoría**: Documentar todos los casos para revisión anual

---

## 🔒 Seguridad

### Logs del Sistema
Cada reembolso genera logs detallados:

```javascript
console.log('💸 [CANCEL-WITH-REFUND] ⭐ CASO EXCEPCIONAL - Cancelación con reembolso');
console.log('📥 [CANCEL-WITH-REFUND] Request:', {
  bookingId,
  refundReason,
  refundMethod,
  user: req.user?.n_document,
  role: req.user?.role
});
```

### Auditoría
- Todos los reembolsos quedan registrados en la tabla `Payments`
- Campo `processedBy` identifica al Owner que autorizó
- Campo `notes` contiene el motivo completo
- Campo `transactionId` único para rastreo

---

## 📞 Soporte

Si encuentras problemas o necesitas asistencia:

1. **Revisar logs**: Buscar `[CANCEL-WITH-REFUND]` en los logs del backend
2. **Verificar rol**: Asegurar que el usuario es `owner`
3. **Validar estado**: Confirmar que la reserva no está `checked-in` ni `completed`
4. **Consultar base de datos**: Verificar pagos registrados para la reserva

---

## ✅ Checklist de Implementación

- [x] Endpoint `cancelBookingWithRefund` creado en `bookingController.js`
- [x] Ruta POST `/api/bookings/:bookingId/cancel-with-refund` agregada
- [x] Validaciones de seguridad implementadas (solo owner)
- [x] Registro de reembolso como pago negativo
- [x] Actualización de estado de reserva a `cancelled`
- [x] Liberación automática de habitación
- [x] Actualización de `financialController.js` para contabilizar reembolsos
- [x] Dashboard financiero muestra reembolsos separados
- [x] Reporte por período incluye desglose de reembolsos
- [ ] Frontend: Componente `RefundManager` (pendiente)
- [ ] Testing en producción
- [ ] Capacitación al owner sobre uso responsable

---

## 📝 Notas Finales

Este flujo fue diseñado específicamente para **situaciones excepcionales** donde la empatía y la responsabilidad social del hotel justifican devolver el dinero al cliente, a pesar de las políticas normales de no reembolso.

**No es un flujo operativo regular**, sino una herramienta de emergencia para casos de fuerza mayor debidamente documentados.

---

**Documentado por:** GitHub Copilot  
**Fecha:** Enero 20, 2026  
**Versión:** 1.0  
**Issue:** Implementación de cancelación con reembolso por fuerza mayor
