require('dotenv').config();
const { SellerData } = require('../data');

async function verifySellerData() {
  try {
    console.log('🔍 === VERIFICANDO SELLERDATA ACTUALIZADO ===');
    
    const activeSeller = await SellerData.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    
    if (activeSeller) {
      console.log('✅ SellerData activo encontrado:');
      console.log(`- ID: ${activeSeller.id}`);
      console.log(`- sellerId: "${activeSeller.sellerId}"`);
      console.log(`- sdocno: "${activeSeller.sdocno}"`);
      console.log(`- scostumername: "${activeSeller.scostumername}"`);
      console.log(`- sellerId tiene espacios: ${activeSeller.sellerId.includes(' ')}`);
      console.log(`- sdocno tiene espacios: ${activeSeller.sdocno.includes(' ')}`);
      
      if (activeSeller.sellerId === activeSeller.sdocno) {
        console.log('✅ sellerId y sdocno son iguales - perfecto!');
      } else {
        console.log('⚠️  sellerId y sdocno son diferentes:');
        console.log(`   - sellerId: "${activeSeller.sellerId}"`);
        console.log(`   - sdocno: "${activeSeller.sdocno}"`);
      }
      
    } else {
      console.log('❌ No se encontró SellerData activo');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    const { sequelize } = require('../src/data');
    await sequelize.close();
    process.exit(0);
  }
}

verifySellerData();