require('dotenv').config();
const { SellerData } = require('../data');

async function checkTaxxaConfig() {
  try {
    console.log('🔍 === VERIFICANDO CONFIGURACIÓN DE TAXXA ===');
    
    // 1. Verificar variables de entorno
    console.log('\n📋 Variables de entorno:');
    console.log(`- TAXXA_API_URL: ${process.env.TAXXA_API_URL || 'NO DEFINIDA'}`);
    console.log(`- TAXXA_EMAIL: ${process.env.TAXXA_EMAIL || 'NO DEFINIDA'}`);
    console.log(`- TAXXA_PASSWORD: ${process.env.TAXXA_PASSWORD ? '***DEFINIDA***' : 'NO DEFINIDA'}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'NO DEFINIDA'}`);
    
    // 2. Verificar configuración del seller
    const sellerData = await SellerData.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    
    if (sellerData) {
      console.log('\n📊 Configuración SellerData:');
      console.log(`- Email Taxxa: ${sellerData.selectronicmail}`);
      console.log(`- Configuración Taxxa:`, sellerData.taxxaConfig);
      
      if (sellerData.taxxaConfig) {
        console.log(`- Ambiente configurado: ${sellerData.taxxaConfig.environment || 'NO DEFINIDO'}`);
        console.log(`- API Key definida: ${sellerData.taxxaConfig.apiKey ? 'SÍ' : 'NO'}`);
      }
    }
    
    // 3. Verificar configuración de resolución
    console.log('\n🏛️ Configuración de Resolución DIAN:');
    console.log(`- Número: ${sellerData?.resolutionNumber || 'NO DEFINIDO'}`);
    console.log(`- Rango: ${sellerData?.resolutionFrom || 'NO DEFINIDO'} - ${sellerData?.resolutionTo || 'NO DEFINIDO'}`);
    console.log(`- Fechas: ${sellerData?.resolutionStartDate || 'NO DEFINIDO'} a ${sellerData?.resolutionEndDate || 'NO DEFINIDO'}`);
    
    // 4. Sugerencias
    console.log('\n💡 VERIFICACIONES NECESARIAS:');
    console.log('1. ✅ Confirmar que tu cuenta Taxxa está habilitada para PRODUCCIÓN');
    console.log('2. ✅ Verificar que la resolución DIAN sea real (no de pruebas)');
    console.log('3. ✅ Contactar a Taxxa para confirmar configuración de ambiente');
    console.log('4. ✅ Revisar si necesitas credenciales diferentes para producción');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    const { sequelize } = require('../src/data');
    await sequelize.close();
    process.exit(0);
  }
}

checkTaxxaConfig();