# 🔧 DIAGNÓSTICO: Usuario `recept` No Puede Crear Reservas en CheckIn

## 🔍 Problema Identificado

El usuario con rol `recept` (recepcionista) **no puede crear reservas** desde el componente CheckIn.

---

## 📊 Análisis de la Situación Actual

### Backend - Rutas de Booking (`bookingRoutes.js`)

#### ✅ Ruta Pública (SIN autenticación):
```javascript
router.post('/create', createBooking);
```
- **Estado**: Pública, NO requiere autenticación
- **Problema**: Si el frontend envía el token, pero el backend no lo valida en esta ruta, podría haber conflictos

#### 🔐 Rutas con Middleware `isStaff`:
```javascript
router.use(isStaff); // Aplica a todas las rutas debajo

router.put('/:bookingId/check-in', checkInGuest);
router.put('/:bookingId/check-out', checkOut);
router.post('/:bookingId/extra-charges', addExtraCharge);
// etc...
```

### Middleware `isStaff` - Roles Permitidos:
```javascript
const staffRoles = ['owner', 'admin', 'recept', 'receptionist'];
```
- **✅ El rol `recept` SÍ está incluido**
- **✅ El middleware permite a `recept` acceder a rutas de staff**

---

## ⚠️ Posibles Causas del Problema

### 1. **Token No Se Está Enviando** 🔴
El componente LocalBookingForm podría no estar enviando el token de autenticación en la request.

**Verificar:**
```javascript
// En FrontBalu/src/utils/axios.js
// Debe tener interceptor que agregue el token:
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. **Ruta `/create` Es Pública Pero Necesita Ser Protegida** 🔴
Actualmente la ruta `/bookings/create` es pública, pero para reservas locales (desde recepción) debería:
- Requerir autenticación
- Permitir sólo a staff (`recept`, `admin`, `owner`)

**Solución Recomendada:**
```javascript
// Crear dos endpoints separados:

// 1. Para clientes (público, sin autenticación)
router.post('/create', createBooking);

// 2. Para staff (requiere autenticación, después del middleware)
router.use(verifyToken);
router.use(isStaff);
router.post('/create-local', createBooking); // <-- Nueva ruta para staff
```

### 3. **El Token Ha Expirado** 🟡
Si el recepcionista inició sesión hace mucho, el token JWT podría haber expirado.

**Verificar:**
```javascript
// En la consola del navegador:
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expira:', new Date(payload.exp * 1000));
console.log('Ahora:', new Date());
```

### 4. **Validaciones del Controlador Rechazan la Request** 🟡
El controlador `createBooking` podría tener validaciones que rechazan ciertos datos.

**Necesitas verificar los logs en Railway para ver el error exacto.**

---

## 🛠️ Soluciones Propuestas

### OPCIÓN 1: Crear Ruta Separada para Staff (RECOMENDADO) ✅

#### Backend - `bookingRoutes.js`:
```javascript
// ═══════════════════════════════════════════════════════════════
// 📋 RUTAS PÚBLICAS (clientes)
// ═══════════════════════════════════════════════════════════════
router.get('/availability', checkAvailability);
router.get('/room-types', getRoomTypes);
router.post('/create', createBooking); // <-- Clientes (público)
router.get('/status/:trackingToken', getBookingByToken);
router.get('/pdf/:trackingToken', downloadBookingPdf);
router.put('/online-payment', updateOnlinePayment);

// ═══════════════════════════════════════════════════════════════
// 🔐 AUTENTICACIÓN REQUERIDA
// ═══════════════════════════════════════════════════════════════
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// 🏨 RUTAS DE STAFF
// ═══════════════════════════════════════════════════════════════
router.use(isStaff);

// ⭐ NUEVA RUTA: Crear reserva local (desde recepción)
router.post('/create-local', createBooking); // <-- Staff (requiere auth)

router.get('/facturas', getAllBills);
router.get('/reservas/all', getAllBookings);
// ... resto de rutas de staff
```

#### Frontend - `bookingActions.jsx`:
```javascript
// Nueva acción para reservas locales (staff)
export const createLocalBooking = (bookingData) => {
  return async (dispatch) => {
    dispatch({ type: 'CREATE_BOOKING_REQUEST' });
    try {
      // ⭐ Usar endpoint para staff
      const { data } = await api.post('/bookings/create-local', bookingData);
      
      if (data.error) {
        dispatch({ type: 'CREATE_BOOKING_FAILURE', payload: data.message });
        toast.error(data.message);
        return { success: false, message: data.message };
      }
      
      dispatch({ type: 'CREATE_BOOKING_SUCCESS', payload: data.data });
      toast.success('Reserva local creada exitosamente');
      return { success: true, data: data.data };
    } catch (error) {
      console.error("Error en createLocalBooking:", error);
      dispatch({ type: 'CREATE_BOOKING_FAILURE', payload: error.message });
      toast.error(error.response?.data?.message || error.message);
      return { success: false, message: error.message };
    }
  };
};
```

#### Frontend - `LocalBookingForm.jsx`:
```javascript
import { createLocalBooking } from "../../Redux/Actions/bookingActions";

// En handleCreateBooking:
const result = await dispatch(createLocalBooking(bookingData)); // <-- Cambiar
```

---

### OPCIÓN 2: Verificar y Reutilizar Ruta Existente 🔄

Si prefieres mantener una sola ruta, verificar que:

1. **El token se envíe correctamente:**
```javascript
// En utils/axios.js - Verificar que exista este interceptor:
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

2. **El backend acepte requests con y sin token:**
```javascript
// En bookingController.js - createBooking
// Agregar validación opcional de usuario autenticado:
const isStaffBooking = req.user && ['owner', 'admin', 'recept'].includes(req.user.role);
const pointOfSale = isStaffBooking ? 'Local' : 'Online';
```

---

## 🧪 Pasos para Diagnosticar

### 1. Verificar en la Consola del Navegador
```javascript
// Abrir DevTools (F12) → Console
// Antes de crear la reserva, ejecutar:
const token = localStorage.getItem('token');
console.log('Token existe:', !!token);
console.log('Token:', token);

// Decodificar token:
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Usuario:', payload);
  console.log('Rol:', payload.role);
  console.log('Expira:', new Date(payload.exp * 1000));
}
```

### 2. Verificar Network Tab
1. Abrir DevTools (F12) → Network
2. Intentar crear una reserva
3. Buscar la request a `/bookings/create`
4. Verificar:
   - **Headers**: ¿Hay `Authorization: Bearer ...`?
   - **Payload**: ¿Qué datos se enviaron?
   - **Response**: ¿Qué error devolvió?

### 3. Revisar Logs de Railway
```bash
# En Railway, ver los logs en tiempo real
# Buscar:
- "🔍 [CREATE-BOOKING]" (inicio del controlador)
- "❌ [CREATE-BOOKING]" (errores)
- Status codes: 400, 401, 403, 500
```

---

## ✅ Implementación Recomendada

### Paso 1: Crear Endpoint Separado para Staff

<file>BackBalu/src/routes/bookingRoutes.js</file>

```javascript
// Después de router.use(isStaff);
router.post('/create-local', createBooking); // Nueva ruta protegida
```

### Paso 2: Crear Acción Redux para Booking Local

<file>FrontBalu/src/Redux/Actions/bookingActions.jsx</file>

```javascript
export const createLocalBooking = (bookingData) => {
  return async (dispatch) => {
    dispatch({ type: 'CREATE_BOOKING_REQUEST' });
    try {
      const { data } = await api.post('/bookings/create-local', bookingData);
      if (data.error) {
        dispatch({ type: 'CREATE_BOOKING_FAILURE', payload: data.message });
        toast.error(data.message);
        return { success: false, message: data.message };
      }
      dispatch({ type: 'CREATE_BOOKING_SUCCESS', payload: data.data });
      toast.success('Reserva creada exitosamente desde recepción');
      return { success: true, data: data.data };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      dispatch({ type: 'CREATE_BOOKING_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  };
};
```

### Paso 3: Actualizar LocalBookingForm

<file>FrontBalu/src/Components/Booking/LocalBookingForm.jsx</file>

```javascript
import { createLocalBooking } from "../../Redux/Actions/bookingActions";

// En handleCreateBooking (línea ~777):
const result = await dispatch(createLocalBooking(bookingData));
```

---

## 📋 Checklist de Verificación

Antes de implementar cambios:

- [ ] Verificar que el token existe en localStorage
- [ ] Verificar que el token no ha expirado
- [ ] Verificar que el usuario tiene rol `recept`
- [ ] Verificar logs de Network Tab para ver el error exacto
- [ ] Verificar logs de Railway para ver qué está rechazando el backend
- [ ] Confirmar que el interceptor de axios agrega el token a las requests

Después de implementar:

- [ ] Probar creación de reserva con usuario `recept`
- [ ] Verificar que el token se envía en el header
- [ ] Verificar que la reserva se crea con `pointOfSale: "Local"`
- [ ] Verificar que no afecta las reservas públicas de clientes

---

**Creado:** 2025-10-06  
**Prioridad:** 🔴 Alta  
**Requiere:** Testing con usuario `recept` en ambiente de desarrollo
