# Actualización de Gastos - Comprobantes y Exportación Excel

## 📋 Cambios Realizados

### Backend

1. **Modelo de Expense actualizado** (`BackBalu/src/data/models/Expense.js`)
   - ✅ Agregado campo `receiptUrl` (STRING 500) para almacenar URL del comprobante
   - ✅ Agregado campo `notes` (TEXT) para notas adicionales
   - ✅ Agregado campo `createdBy` (STRING) para identificar quién creó el gasto

2. **Migración creada** (`BackBalu/migrations/20251228-add-receipt-notes-to-expenses.js`)
   - ✅ Migración para agregar las nuevas columnas a la tabla Expenses

3. **Script de migración** (`BackBalu/scripts/run-expenses-migration.js`)
   - ✅ Script para ejecutar la migración específica

### Frontend

1. **ExpensesList.jsx** - Componente de listado
   - ✅ Agregada columna "Comprobante" en la tabla
   - ✅ Botón para exportar a Excel con todos los gastos filtrados
   - ✅ Vista previa del comprobante con enlace directo si existe
   - ✅ Icono de "ojo" ahora abre el comprobante directamente (soluciona el error 404)
   - ✅ Mensaje visual cuando no hay comprobante cargado

2. **ExpensesForm.jsx** - Formulario de creación
   - ✅ Botón para cargar comprobante usando Cloudinary
   - ✅ Vista previa del comprobante cargado
   - ✅ Opción para remover o cambiar el comprobante
   - ✅ Campo receiptUrl incluido en el payload al crear gasto

## 🚀 Instrucciones de Instalación

### 1. Ejecutar la migración en la base de datos

Desde el directorio `BackBalu`, ejecuta:

```bash
node scripts/run-expenses-migration.js
```

O si prefieres ejecutar todas las migraciones pendientes:

```bash
npx sequelize-cli db:migrate
```

### 2. Verificar que la librería xlsx esté instalada

Desde el directorio `FrontBalu`, verifica:

```bash
npm list xlsx
```

Si no está instalada, ejecuta:

```bash
npm install xlsx
```

### 3. Reiniciar el servidor backend

```bash
cd BackBalu
npm start
```

### 4. Reiniciar el servidor frontend

```bash
cd FrontBalu
npm run dev
```

## ✨ Nuevas Funcionalidades

### 1. Cargar Comprobante en Gastos

Cuando creas un nuevo gasto:
1. Llena los campos requeridos (destinatario, monto, fecha, categoría, método de pago)
2. Haz clic en **"Cargar Comprobante"**
3. Selecciona el archivo PDF desde tu computadora
4. El comprobante se subirá a Cloudinary automáticamente
5. Verás una vista previa del PDF cargado
6. Guarda el gasto normalmente

### 2. Ver Comprobantes en el Listado

En la lista de gastos:
- ✅ Columna **"Comprobante"** muestra el estado:
  - "Sin comprobante" (gris) - no hay archivo cargado
  - "Disponible" (verde) - hay comprobante, con botón para abrirlo
- ✅ Clic en el ícono de **ojo** abre el comprobante en nueva pestaña
- ✅ Ya no aparece error 404

### 3. Exportar a Excel

En el listado de gastos:
1. Aplica los filtros que necesites (fecha, categoría, método de pago)
2. Haz clic en **"Exportar Excel"**
3. Se descargará un archivo `.xlsx` con:
   - Fecha
   - Destinatario
   - Categoría
   - Método de Pago
   - Monto
   - URL del Comprobante

El archivo se nombrará automáticamente: `gastos-YYYY-MM-DD.xlsx`

## 🔍 Notas Técnicas

- El campo `receiptUrl` es opcional, los gastos pueden crearse sin comprobante
- Los comprobantes se almacenan en Cloudinary en la carpeta "packs"
- La exportación a Excel respeta los filtros aplicados en el listado
- El formato de fecha en Excel es DD/MM/YYYY
- Los comprobantes existentes (antes de la migración) aparecerán como "Sin comprobante"

## 🐛 Solución de Problemas

### Error al ejecutar la migración

Si obtienes un error al ejecutar la migración, verifica:
1. Que las variables de entorno estén correctamente configuradas en `.env`
2. Que la base de datos esté accesible
3. Que tengas permisos para modificar la estructura de la tabla

### No aparece el botón de Cloudinary

Verifica que el script de Cloudinary esté cargado en el HTML:
```html
<script src="https://widget.cloudinary.com/v2.0/global/all.js"></script>
```

### Los comprobantes no se guardan

Verifica en la consola del navegador si hay errores de CORS o problemas con Cloudinary.

## 📊 Estructura de Datos

### Expense Model (Actualizado)

```javascript
{
  id: UUID,
  destinatario: STRING (requerido),
  amount: DECIMAL(10,2) (requerido),
  expenseDate: DATE,
  category: ENUM,
  paymentMethod: ENUM,
  receiptUrl: STRING(500) (nuevo - opcional),
  notes: TEXT (nuevo - opcional),
  createdBy: STRING (nuevo - opcional),
  createdAt: DATE,
  updatedAt: DATE
}
```

## 🎯 Próximos Pasos Sugeridos

1. Considerar agregar validación de tipo de archivo (solo PDF)
2. Agregar límite de tamaño de archivo
3. Implementar compresión de PDFs grandes
4. Agregar opción para eliminar comprobantes antiguos de Cloudinary
5. Crear vista de detalle de gasto con información completa
