# 🎨 Integración del Componente RefundManager en Frontend

## 📍 Ubicación del Componente

**Archivo creado:** `FrontBalu/src/Components/Admin/RefundManager.jsx`

---

## 🔧 Cómo Integrarlo

### Opción 1: En la Vista de Detalles de Reserva

**Archivo:** `FrontBalu/src/Components/Booking/BookingDetails.jsx` (o similar)

```jsx
import React from 'react';
import RefundManager from '../Admin/RefundManager';
import { useAuth } from '../../hooks/useAuth'; // Tu hook de autenticación

const BookingDetails = ({ booking }) => {
  const { user } = useAuth();

  const handleRefundComplete = (refundData) => {
    console.log('Reembolso completado:', refundData);
    // Actualizar el estado de la reserva
    // Recargar datos
    // Mostrar mensaje de éxito
    window.location.reload(); // O tu método de actualización
  };

  return (
    <div className="booking-details">
      <h2>Detalles de la Reserva #{booking.bookingId}</h2>
      
      {/* ... otros componentes ... */}

      {/* ⭐ Componente de Reembolso Excepcional (solo owner) */}
      {user?.role === 'owner' && (
        <div className="mt-6">
          <RefundManager 
            booking={booking} 
            onRefundComplete={handleRefundComplete}
            userRole={user.role}
          />
        </div>
      )}

      {/* ... resto del componente ... */}
    </div>
  );
};

export default BookingDetails;
```

---

### Opción 2: En el Panel de Administración de Reservas

**Archivo:** `FrontBalu/src/Components/Admin/BookingManagement.jsx` (o similar)

```jsx
import React, { useState } from 'react';
import RefundManager from './RefundManager';

const BookingManagement = () => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const handleOpenRefund = (booking) => {
    setSelectedBooking(booking);
    setShowRefundModal(true);
  };

  const handleRefundComplete = (refundData) => {
    console.log('Reembolso completado:', refundData);
    setShowRefundModal(false);
    // Actualizar lista de reservas
    fetchBookings();
  };

  return (
    <div>
      <h2>Gestión de Reservas</h2>
      
      {/* Lista de reservas */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Huésped</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.bookingId}>
              <td>{booking.bookingId}</td>
              <td>{booking.guest?.scostumername}</td>
              <td>{booking.status}</td>
              <td>
                {/* ⭐ Botón de reembolso excepcional */}
                {user?.role === 'owner' && booking.status === 'paid' && (
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    onClick={() => handleOpenRefund(booking)}
                  >
                    💸 Reembolso
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ⭐ Modal con el componente de reembolso */}
      {showRefundModal && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Reembolso Excepcional</h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => setShowRefundModal(false)}
              >
                ×
              </button>
            </div>
            
            <RefundManager
              booking={selectedBooking}
              onRefundComplete={handleRefundComplete}
              userRole={user?.role}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
```

---

### Opción 3: Como Acción en BookingCardActions

**Archivo:** `FrontBalu/src/Components/CheckOut/BookingCardActions.jsx`

```jsx
import React, { useState } from 'react';
import RefundManager from '../Admin/RefundManager';

const BookingCardActions = ({ booking, userRole, permissions }) => {
  const [showRefundSection, setShowRefundSection] = useState(false);

  const handleRefundComplete = (refundData) => {
    alert('✅ Reembolso procesado exitosamente');
    setShowRefundSection(false);
    // Recargar datos o actualizar estado
  };

  return (
    <div className="booking-actions">
      {/* Botones normales de acciones */}
      <div className="flex gap-2 mb-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Ver Detalles
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Check-In
        </button>
        
        {/* ⭐ Botón de reembolso excepcional (solo owner) */}
        {userRole === 'owner' && booking.status === 'paid' && (
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"
            onClick={() => setShowRefundSection(!showRefundSection)}
          >
            💸 Reembolso Excepcional
          </button>
        )}
      </div>

      {/* ⭐ Sección expandible con el componente de reembolso */}
      {showRefundSection && userRole === 'owner' && (
        <div className="mt-4 animate-fadeIn">
          <RefundManager
            booking={booking}
            onRefundComplete={handleRefundComplete}
            userRole={userRole}
          />
        </div>
      )}
    </div>
  );
};

export default BookingCardActions;
```

---

## 🎯 Props del Componente

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `booking` | Object | ✅ | Objeto completo de la reserva con `payments`, `guest`, etc. |
| `onRefundComplete` | Function | ❌ | Callback ejecutado al completar reembolso exitosamente |
| `userRole` | String | ✅ | Rol del usuario actual (`'owner'`, `'admin'`, etc.) |

### Estructura del objeto `booking` requerido:

```javascript
{
  bookingId: 123,
  roomNumber: "205",
  status: "paid",
  totalAmount: 150000,
  checkIn: "2026-01-25",
  checkOut: "2026-01-27",
  guest: {
    scostumername: "Juan Pérez",
    sdocno: "1234567890"
  },
  payments: [
    {
      paymentId: 1,
      amount: 150000,
      paymentStatus: "completed",
      paymentMethod: "transfer"
    }
  ]
}
```

---

## 🔒 Validaciones del Componente

El componente se **oculta automáticamente** si:

1. ❌ El usuario NO es `owner`
2. ❌ La reserva ya está `cancelled`
3. ❌ La reserva está `checked-in` (muestra mensaje)
4. ❌ La reserva está `completed` (muestra mensaje)
5. ❌ No hay pagos completados (muestra mensaje)

El componente se **habilita** solo cuando:

1. ✅ Usuario es `owner`
2. ✅ Status es `paid` o `confirmed`
3. ✅ Existe al menos un pago `completed` o `authorized`

---

## 🎨 Personalización Visual

### Colores Principales

```css
/* Puedes personalizar en tu archivo CSS global */
.refund-manager {
  --refund-border: #ef4444; /* rojo */
  --refund-bg: #fef2f2; /* rojo claro */
  --refund-button: #dc2626; /* rojo oscuro */
}
```

### Añadir Animaciones (opcional)

```css
/* En tu archivo CSS global */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
```

---

## 🧪 Testing del Componente

### Test Manual

1. **Login como Owner**
   ```javascript
   // En consola del navegador
   localStorage.getItem('token'); // Verificar token
   ```

2. **Navegar a una reserva pagada**
   - Status debe ser `paid`
   - Debe tener pagos completados

3. **Verificar que el componente aparece**
   - Debe mostrar el formulario con bordes rojos
   - Debe mostrar el total pagado

4. **Llenar el formulario**
   - Razón: mínimo 10 caracteres
   - Método de devolución: seleccionar uno
   - Notas: opcional

5. **Intentar procesar**
   - Primera confirmación: "Procesar Reembolso"
   - Segunda confirmación: "SÍ, Confirmar"

6. **Verificar respuesta**
   - Mensaje de éxito
   - Callback ejecutado
   - Reserva actualizada

---

## 🚨 Mensajes de Error Comunes

### 1. "403 - Acceso Denegado"
**Causa:** El usuario no es `owner`  
**Solución:** Verificar rol en el backend

### 2. "400 - No se puede cancelar checked-in"
**Causa:** La reserva ya tiene huésped hospedado  
**Solución:** Hacer checkout primero

### 3. "Network Error"
**Causa:** Backend no disponible o ruta incorrecta  
**Solución:** Verificar que el backend esté corriendo y la ruta sea correcta

### 4. "Debe especificar razón del reembolso"
**Causa:** Campo `refundReason` vacío  
**Solución:** El componente ya valida esto, no debería ocurrir

---

## 📱 Responsividad

El componente está diseñado para:

- ✅ **Desktop:** Full width, máximo 800px recomendado
- ✅ **Tablet:** Se adapta automáticamente
- ✅ **Mobile:** Diseño vertical optimizado

### Sugerencias para Mobile

```jsx
<div className="refund-manager-container">
  <div className="md:max-w-2xl md:mx-auto">
    <RefundManager 
      booking={booking} 
      onRefundComplete={handleRefundComplete}
      userRole={user.role}
    />
  </div>
</div>
```

---

## 🔐 Seguridad en Frontend

### 1. Validación de Token

```javascript
// Verificar que el token existe antes de mostrar el componente
const token = localStorage.getItem('token');
if (!token) {
  return <Navigate to="/login" />;
}
```

### 2. Validación de Rol

```javascript
// El componente ya valida internamente, pero puedes añadir una capa extra
{user?.role === 'owner' && permissions.canRefund && (
  <RefundManager ... />
)}
```

### 3. Logs en Consola

El componente registra automáticamente:
- ✅ Intento de reembolso
- ✅ Errores
- ✅ Respuestas del servidor

---

## 📊 Estado del Componente

### Estados Internos

```javascript
{
  refundReason: '',        // Razón del reembolso
  refundMethod: 'transfer', // Método seleccionado
  notes: '',               // Notas adicionales
  showConfirm: false,      // Mostrar confirmación
  isProcessing: false,     // Procesando request
  error: null              // Error actual
}
```

### Flujo de Estados

```
Initial State
      ↓
User fills form
      ↓
Clicks "Procesar Reembolso"
      ↓
showConfirm = true
      ↓
Clicks "SÍ, Confirmar"
      ↓
isProcessing = true
      ↓
API Request
      ↓
Success → onRefundComplete() → Reset
      ↓
Error → error = message → showConfirm = false
```

---

## 🎯 Próximos Pasos

### Para Implementar:

1. ✅ **Copiar el archivo** `RefundManager.jsx` a tu proyecto
2. ✅ **Instalar axios** (si no está instalado)
   ```bash
   npm install axios
   ```
3. ✅ **Importar en tu componente** padre
4. ✅ **Pasar las props** requeridas
5. ✅ **Verificar autenticación** y permisos
6. ✅ **Testing** con una reserva real

### Para Mejorar (Opcional):

- [ ] Añadir confirmación por email al cliente
- [ ] Generar PDF del comprobante de reembolso
- [ ] Historial de reembolsos en el dashboard
- [ ] Notificaciones push al owner
- [ ] Auditoría de reembolsos en panel admin

---

## 📞 Soporte

Si tienes problemas con la integración:

1. **Verificar props:** Asegurar que `booking` tiene todos los campos
2. **Verificar token:** Debe existir en localStorage
3. **Verificar endpoint:** Backend debe estar corriendo
4. **Revisar consola:** Errores de red o validación
5. **Verificar rol:** Usuario debe ser `owner`

---

## ✅ Checklist de Integración

- [ ] Componente `RefundManager.jsx` copiado
- [ ] Axios instalado y configurado
- [ ] Importado en componente padre
- [ ] Props pasadas correctamente
- [ ] Validación de rol implementada
- [ ] Callback `onRefundComplete` definido
- [ ] Testing con reserva pagada
- [ ] Estilos personalizados (si aplica)
- [ ] Responsive verificado en mobile
- [ ] Manejo de errores testeado

---

**Nota:** El componente es **plug-and-play** y no requiere configuración adicional más allá de las props. 🎉

---

**Documentado por:** GitHub Copilot  
**Fecha:** Enero 20, 2026  
**Componente:** RefundManager  
**Status:** ✅ Listo para integración
