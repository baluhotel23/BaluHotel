/**
 * Script para crear 10 habitaciones de prueba
 * Ejecutar con: node scripts/create-test-rooms.js
 */

const { Room, Service, BasicInventory, RoomBasics } = require('../src/data');

const testRooms = [
  {
    roomNumber: '301',
    type: 'Doble',
    priceSingle: 60000,
    priceDouble: 80000,
    priceMultiple: 100000,
    pricePerExtraGuest: 15000,
    description: 'Habitación doble con vista al jardín',
    maxGuests: 2,
    status: 'Limpia',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '302',
    type: 'Triple',
    priceSingle: 70000,
    priceDouble: 90000,
    priceMultiple: 120000,
    pricePerExtraGuest: 20000,
    description: 'Habitación triple espaciosa',
    maxGuests: 3,
    status: 'Limpia',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '303',
    type: 'Pareja',
    priceSingle: 80000,
    priceDouble: 100000,
    priceMultiple: 130000,
    pricePerExtraGuest: 25000,
    description: 'Suite romántica para parejas',
    maxGuests: 2,
    status: 'Disponible',
    isActive: true,
    isPromo: true,
    promotionPrice: 85000
  },
  {
    roomNumber: '304',
    type: 'Doble',
    priceSingle: 60000,
    priceDouble: 80000,
    priceMultiple: 100000,
    pricePerExtraGuest: 15000,
    description: 'Habitación doble económica',
    maxGuests: 2,
    status: 'Limpia',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '305',
    type: 'Múltiple',
    priceSingle: 75000,
    priceDouble: 95000,
    priceMultiple: 140000,
    pricePerExtraGuest: 30000,
    description: 'Habitación familiar hasta 5 personas',
    maxGuests: 5,
    status: 'Disponible',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '306',
    type: 'Doble',
    priceSingle: 65000,
    priceDouble: 85000,
    priceMultiple: 105000,
    pricePerExtraGuest: 15000,
    description: 'Habitación doble con balcón',
    maxGuests: 2,
    status: 'Limpia',
    isActive: true,
    isPromo: true,
    promotionPrice: 70000
  },
  {
    roomNumber: '307',
    type: 'Triple',
    priceSingle: 70000,
    priceDouble: 90000,
    priceMultiple: 120000,
    pricePerExtraGuest: 20000,
    description: 'Habitación triple moderna',
    maxGuests: 3,
    status: 'Disponible',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '308',
    type: 'Pareja',
    priceSingle: 85000,
    priceDouble: 105000,
    priceMultiple: 135000,
    pricePerExtraGuest: 25000,
    description: 'Suite Premium para parejas con jacuzzi',
    maxGuests: 2,
    status: 'Limpia',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '309',
    type: 'Doble',
    priceSingle: 60000,
    priceDouble: 80000,
    priceMultiple: 100000,
    pricePerExtraGuest: 15000,
    description: 'Habitación doble estándar',
    maxGuests: 2,
    status: 'Disponible',
    isActive: true,
    isPromo: false
  },
  {
    roomNumber: '310',
    type: 'Múltiple',
    priceSingle: 80000,
    priceDouble: 100000,
    priceMultiple: 150000,
    pricePerExtraGuest: 35000,
    description: 'Habitación familiar deluxe hasta 6 personas',
    maxGuests: 6,
    status: 'Limpia',
    isActive: true,
    isPromo: true,
    promotionPrice: 130000
  }
];

async function createTestRooms() {
  try {
    console.log('🚀 Iniciando creación de habitaciones de prueba...\n');

    // Verificar conexión a la base de datos
    await Room.sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa\n');

    // Obtener inventarios básicos disponibles
    const basicInventories = await BasicInventory.findAll({
      attributes: ['id', 'name'],
      limit: 6
    });

    if (basicInventories.length === 0) {
      console.warn('⚠️  No hay inventarios básicos en la BD. Las habitaciones se crearán sin inventario.');
    } else {
      console.log(`📦 ${basicInventories.length} items de inventario básico disponibles\n`);
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const roomData of testRooms) {
      try {
        // Verificar si ya existe
        const existing = await Room.findByPk(roomData.roomNumber);
        
        if (existing) {
          console.log(`⏭️  Habitación ${roomData.roomNumber} ya existe - omitida`);
          skipped++;
          continue;
        }

        // Crear habitación
        const room = await Room.create(roomData);
        console.log(`✅ Habitación ${room.roomNumber} creada (${room.type})`);

        // Asociar inventario básico si existe
        if (basicInventories.length > 0) {
          for (const inventory of basicInventories) {
            await RoomBasics.create({
              roomNumber: room.roomNumber,
              basicId: inventory.id,
              quantity: 1,
              isRequired: true,
              priority: 3
            });
          }
          console.log(`   📦 ${basicInventories.length} items de inventario asociados`);
        }

        created++;

      } catch (error) {
        console.error(`❌ Error creando habitación ${roomData.roomNumber}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Creadas: ${created}`);
    console.log(`   ⏭️  Omitidas (ya existían): ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log('='.repeat(50) + '\n');

    if (created > 0) {
      console.log('🎉 ¡Habitaciones de prueba creadas exitosamente!');
      
      // Mostrar resumen de habitaciones creadas
      const allRooms = await Room.findAll({
        where: {
          roomNumber: testRooms.map(r => r.roomNumber)
        },
        attributes: ['roomNumber', 'type', 'status', 'priceDouble', 'isPromo']
      });

      console.log('\n📋 Habitaciones disponibles:');
      allRooms.forEach(room => {
        const promoTag = room.isPromo ? '🏷️ PROMO' : '';
        console.log(`   ${room.roomNumber} - ${room.type.padEnd(10)} - ${room.status.padEnd(12)} - $${room.priceDouble.toLocaleString()} ${promoTag}`);
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar script
createTestRooms();
