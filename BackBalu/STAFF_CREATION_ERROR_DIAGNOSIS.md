# 🐛 DIAGNÓSTICO: Error al Crear Usuario Staff (Recepcionista)

## Error Reportado
```
POST https://baluhotel-production.up.railway.app/admin/users 400 (Bad Request)

CREATE_STAFF_USER_FAILURE
```

---

## 🔍 Posibles Causas del Error 400

### 1. **Problema de Autenticación** ⚠️
El endpoint requiere:
- ✅ Token válido en header `Authorization: Bearer <token>`
- ✅ Usuario con rol `owner`

**Verificar:**
```javascript
// En el navegador (Console):
const token = localStorage.getItem('token'); // o sessionStorage
console.log('Token:', token);

// Decodificar token (si es JWT):
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const payload = JSON.parse(window.atob(base64));
console.log('Rol del usuario:', payload.role);
```

### 2. **Datos Faltantes o Inválidos** ⚠️
Campos requeridos según el backend:
- `email` (string, formato email válido)
- `password` (string, mínimo 6 caracteres)
- `role` (string: 'recept', 'admin', o 'owner')
- `n_document` (string, solo números)

Campos opcionales:
- `wdoctype` (default: 'CC')
- `phone` (string, 10 dígitos)

**Verificar datos enviados:**
```javascript
// Los logs agregados mostrarán en Console:
📤 [CREATE-STAFF-ACTION] Enviando datos: {...}
```

### 3. **Formato de Role Incorrecto** ⚠️
El backend valida:
```javascript
const validRoles = ['recept', 'admin', 'owner'];
```

**Verificar que el formulario envía exactamente 'recept'** (no 'receptionist', 'reception', etc.)

### 4. **Usuario Duplicado** ⚠️
El backend rechaza si ya existe un usuario con:
- Mismo `email`
- Mismo `n_document`

---

## 🔧 Cambios Realizados

### Frontend - Actions (`adminActions.jsx`)
```javascript
✅ Agregados logs detallados:
   - Datos enviados al servidor
   - Respuesta recibida (status y data)
   - Errores capturados con detalles

✅ Mejor manejo de errores:
   - Extrae mensaje específico de error.response.data.message
   - Muestra toast con mensaje específico
```

### Frontend - Reducer (`adminReducer.jsx`)
```javascript
✅ Agregados logs de debugging:
   - Tipo de action recibida
   - Tipo de payload
   - Timestamp para seguimiento
```

---

## 🧪 Cómo Diagnosticar

### Paso 1: Abrir DevTools del Navegador
1. F12 o Click derecho → Inspeccionar
2. Ir a la pestaña **Console**
3. Limpiar console (icono 🚫)

### Paso 2: Intentar Crear Usuario
1. Llenar el formulario con datos de prueba:
   ```
   Email: test@baluhotel.com
   Password: Test123456
   Role: recept
   Documento: 1234567890
   Tipo Doc: CC
   Teléfono: 3001234567
   ```

2. Click en "Crear Usuario"

### Paso 3: Revisar Logs en Console
Buscar estos logs:

```javascript
📤 [CREATE-STAFF-ACTION] Enviando datos: {
  email: "...",
  password: "...",
  role: "...",
  n_document: "...",
  wdoctype: "...",
  phone: "..."
}

📨 [CREATE-STAFF-ACTION] Respuesta recibida: {
  status: 400,
  data: { error: "..." }  // <-- Mensaje específico del error
}

❌ [CREATE-STAFF-ACTION] Error capturado: {
  message: "...",
  response: { ... },
  status: 400
}
```

### Paso 4: Verificar Network Tab
1. Ir a pestaña **Network**
2. Buscar request a `admin/users`
3. Click en el request
4. Ver:
   - **Headers**: ¿Está el token Authorization?
   - **Payload**: ¿Qué datos se enviaron?
   - **Response**: ¿Qué respondió el servidor?

---

## 🎯 Soluciones Probables

### Si el error es "Token inválido" o 401/403:
```javascript
// Verificar que el usuario esté autenticado y sea owner
const { user } = useSelector(state => state.auth);
console.log('Usuario actual:', user);
console.log('Rol:', user?.role); // Debe ser 'owner'
```

### Si el error es "Rol no válido":
```javascript
// Verificar en Register.jsx que roleOptions incluya 'recept':
const roleOptions = ["admin", "recept"]; // ✅ Correcto
// NO: ["admin", "reception"] // ❌ Incorrecto
```

### Si el error es "Email o documento duplicado":
```javascript
// Usar un email y documento únicos en cada prueba
// O eliminar/desactivar el usuario existente primero
```

### Si el error es "Campos faltantes":
```javascript
// Verificar que todos los campos requeridos tengan valor
console.log('FormData antes de enviar:', formData);
// email, password, role, n_document deben tener valores
```

---

## 📋 Checklist de Verificación

Antes de crear un usuario staff, verifica:

- [ ] Usuario autenticado con rol `owner`
- [ ] Token válido y no expirado
- [ ] Email con formato válido (contiene @)
- [ ] Password mínimo 6 caracteres
- [ ] Role exactamente: 'recept', 'admin', o 'owner'
- [ ] n_document solo números, mínimo 6 dígitos
- [ ] Email y documento NO usados previamente
- [ ] Console del navegador abierta para ver logs

---

## 🚀 Próximos Pasos

1. **Ejecutar diagnóstico con logs mejorados**
   - Abrir aplicación en Vercel
   - Intentar crear usuario staff
   - Copiar todos los logs de Console
   - Compartir logs para análisis

2. **Si el problema persiste:**
   - Ejecutar script de diagnóstico del backend
   - Verificar logs de Railway
   - Revisar base de datos directamente

---

**Creado:** 2025-10-06  
**Archivos Modificados:**
- `FrontBalu/src/Redux/Actions/adminActions.jsx`
- `FrontBalu/src/Redux/Reducer/adminReducer.jsx`
