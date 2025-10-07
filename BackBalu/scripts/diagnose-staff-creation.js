// Script para diagnosticar el problema de creación de usuario staff
require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'https://baluhotel-production.up.railway.app';

// Datos de prueba para crear un usuario recepcionista
const testData = {
  email: 'recept.test@baluhotel.com',
  password: 'Test123456!',
  role: 'recept',
  n_document: '9999999999',
  wdoctype: 'CC',
  phone: '3001234567'
};

async function testCreateStaff() {
  try {
    console.log('🧪 Iniciando diagnóstico de creación de usuario staff\n');

    // PASO 1: Verificar que necesitamos el token
    console.log('📋 PASO 1: Datos que se enviarán');
    console.log(JSON.stringify(testData, null, 2));

    console.log('\n⚠️  NOTA: Este endpoint requiere autenticación con rol "owner"');
    console.log('Para hacer la prueba completa necesitas:');
    console.log('1. Un token válido de un usuario con rol "owner"');
    console.log('2. Enviarlo en el header: Authorization: Bearer <token>\n');

    // PASO 2: Verificar estructura de datos
    console.log('📊 PASO 2: Validando estructura de datos');
    const requiredFields = ['email', 'password', 'role', 'n_document'];
    const missingFields = requiredFields.filter(field => !testData[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Campos requeridos faltantes:', missingFields);
    } else {
      console.log('✅ Todos los campos requeridos están presentes');
    }

    // PASO 3: Validar rol
    const validRoles = ['recept', 'admin', 'owner'];
    if (!validRoles.includes(testData.role)) {
      console.log('❌ Rol inválido:', testData.role);
      console.log('   Roles válidos:', validRoles);
    } else {
      console.log('✅ Rol válido:', testData.role);
    }

    // PASO 4: Validar formato de datos
    console.log('\n📝 PASO 3: Validando formatos');
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testData.email)) {
      console.log('❌ Email con formato inválido:', testData.email);
    } else {
      console.log('✅ Email válido:', testData.email);
    }

    // Password (mínimo 6 caracteres)
    if (testData.password.length < 6) {
      console.log('❌ Contraseña muy corta (mínimo 6 caracteres)');
    } else {
      console.log('✅ Contraseña válida (longitud:', testData.password.length, 'chars)');
    }

    // Documento
    if (!testData.n_document || testData.n_document.length < 6) {
      console.log('❌ Número de documento inválido');
    } else {
      console.log('✅ Número de documento válido:', testData.n_document);
    }

    console.log('\n🔍 PASO 4: Verificando endpoint en Railway');
    console.log('URL:', `${API_URL}/admin/users`);
    console.log('Método: POST');

    // Intentar hacer request SIN token para ver el error específico
    console.log('\n⚠️  Intentando request SIN autenticación (esperamos error 401/403)...');
    
    try {
      const response = await axios.post(`${API_URL}/admin/users`, testData, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Aceptar cualquier status
      });

      console.log('\n📨 Respuesta del servidor:');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));

      if (response.status === 401 || response.status === 403) {
        console.log('\n✅ Esperado: El endpoint requiere autenticación');
        console.log('💡 Para resolver el problema en el frontend:');
        console.log('   1. Verificar que el token se esté enviando correctamente');
        console.log('   2. Verificar que el usuario autenticado tenga rol "owner"');
        console.log('   3. Verificar que el token no haya expirado');
      } else if (response.status === 400) {
        console.log('\n❌ Error 400: Bad Request');
        console.log('💡 Revisa el mensaje de error específico arriba');
      }

    } catch (error) {
      if (error.response) {
        console.log('\n📨 Respuesta de error del servidor:');
        console.log('Status:', error.response.status);
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('\n❌ Error de conexión:', error.message);
      }
    }

    console.log('\n📋 RESUMEN DE DIAGNÓSTICO:');
    console.log('='.repeat(50));
    console.log('Para crear un usuario staff exitosamente, asegúrate de:');
    console.log('1. ✅ Enviar todos los campos requeridos:', requiredFields.join(', '));
    console.log('2. ✅ El rol debe ser uno de:', validRoles.join(', '));
    console.log('3. ✅ Email con formato válido');
    console.log('4. ✅ Contraseña de al menos 6 caracteres');
    console.log('5. ✅ Token de autenticación con rol "owner" en el header');
    console.log('6. ✅ Header: Authorization: Bearer <token>');

  } catch (error) {
    console.error('\n❌ Error en el diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
console.log('🏥 DIAGNÓSTICO DE CREACIÓN DE USUARIO STAFF');
console.log('='.repeat(50));
testCreateStaff()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
