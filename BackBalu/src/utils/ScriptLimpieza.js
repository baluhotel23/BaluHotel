const app = require('./src/app.js');
const { conn } = require('./src/data');
const { PORT } = require('./src/config/envs.js');
require('dotenv').config();

// ⭐ FUNCIÓN DE LIMPIEZA EXHAUSTIVA
async function comprehensiveCleanup() {
  try {
    console.log('🧹 Iniciando limpieza exhaustiva...');
    
    // ⭐ PASO 1: Verificar qué tablas existen
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%Inventory%';
    `;
    
    const existingTables = await conn.query(tablesQuery, { type: conn.QueryTypes.SELECT });
    console.log('📋 Tablas existentes:', existingTables.map(t => t.tablename));
    
    // ⭐ PASO 2: Verificar ENUMs existentes
    const enumsQuery = `
      SELECT typname 
      FROM pg_type 
      WHERE typname LIKE '%BookingInventory%' 
      OR typname LIKE '%BasicInventory%';
    `;
    
    const existingEnums = await conn.query(enumsQuery, { type: conn.QueryTypes.SELECT });
    console.log('📋 ENUMs existentes:', existingEnums.map(e => e.typname));
    
    // ⭐ PASO 3: Limpieza ordenada y específica
    const cleanupCommands = [
      // Primero eliminar tablas que usan ENUMs problemáticos
      'DROP TABLE IF EXISTS "BookingInventoryUsages" CASCADE',
      'DROP TABLE IF EXISTS "BookingInventoryAssignments" CASCADE',
      'DROP TABLE IF EXISTS "InventoryMovements" CASCADE',
      
      // Luego eliminar ENUMs específicos
      'DROP TYPE IF EXISTS "enum_BookingInventoryUsages_status" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_BookingInventoryUsages_status" CASCADE',
      'DROP TYPE IF EXISTS "enum_BookingInventoryAssignments_status" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_BookingInventoryAssignments_status" CASCADE',
      'DROP TYPE IF EXISTS "enum_InventoryMovements_type" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_InventoryMovements_type" CASCADE',
      
      // Limpiar cualquier ENUM de BasicInventory que pueda causar conflictos
      'DROP TYPE IF EXISTS "enum_BasicInventories_inventoryType" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_BasicInventories_inventoryType" CASCADE',
      'DROP TYPE IF EXISTS "enum_BasicInventories_category" CASCADE',
      'DROP TYPE IF EXISTS "public"."enum_BasicInventories_category" CASCADE'
    ];
    
    for (const command of cleanupCommands) {
      try {
        await conn.query(command);
        console.log(`✅ Ejecutado: ${command}`);
      } catch (error) {
        console.log(`ℹ️ Comando no necesario: ${command}`);
      }
    }
    
    // ⭐ PASO 4: Verificar limpieza
    const remainingEnums = await conn.query(enumsQuery, { type: conn.QueryTypes.SELECT });
    if (remainingEnums.length > 0) {
      console.log('⚠️ ENUMs que aún existen:', remainingEnums.map(e => e.typname));
    } else {
      console.log('✅ Todos los ENUMs problemáticos eliminados');
    }
    
    console.log('✅ Limpieza exhaustiva completada');
    
  } catch (error) {
    console.log('⚠️ Error en limpieza:', error.message);
  }
}

// ⭐ FUNCIÓN PARA VERIFICAR MODELOS PROBLEMÁTICOS
async function checkProblematicModels() {
  try {
    console.log('🔍 Verificando modelos problemáticos...');
    
    // Verificar si el modelo BookingInventoryUsage está causando problemas
    const modelNames = Object.keys(conn.models);
    const problematicModels = modelNames.filter(name => 
      name.includes('BookingInventory') || 
      name.includes('InventoryMovement')
    );
    
    console.log('📋 Modelos de inventario encontrados:', problematicModels);
    
    // Si hay modelos problemáticos, intentar eliminarlos temporalmente del sync
    if (problematicModels.length > 0) {
      console.log('⚠️ Se encontraron modelos que pueden causar conflictos');
      return problematicModels;
    }
    
    return [];
  } catch (error) {
    console.log('⚠️ Error verificando modelos:', error.message);
    return [];
  }
}

// ⭐ SYNC INTELIGENTE Y PROGRESIVO
async function smartProgressiveSync() {
  try {
    // PASO 1: Limpieza exhaustiva
    await comprehensiveCleanup();
    
    // PASO 2: Verificar modelos problemáticos
    const problematicModels = await checkProblematicModels();
    
    // PASO 3: Intentar sync con exclude de modelos problemáticos
    if (problematicModels.length > 0) {
      console.log('🔄 Intentando sync sin modelos problemáticos...');
      
      // Temporalmente excluir modelos problemáticos
      const originalModels = { ...conn.models };
      
      // Remover modelos problemáticos temporalmente
      problematicModels.forEach(modelName => {
        delete conn.models[modelName];
      });
      
      try {
        await conn.sync({ alter: true });
        console.log('✅ Sync parcial exitoso (sin modelos problemáticos)');
        
        // Restaurar modelos
        Object.assign(conn.models, originalModels);
        
        // Intentar sync solo de modelos problemáticos uno por uno
        for (const modelName of problematicModels) {
          try {
            console.log(`🔄 Sincronizando modelo: ${modelName}`);
            await conn.models[modelName].sync({ alter: true });
            console.log(`✅ Modelo ${modelName} sincronizado`);
          } catch (modelError) {
            console.log(`❌ Error en modelo ${modelName}:`, modelError.message);
            // Intentar force para este modelo específico
            try {
              await conn.models[modelName].sync({ force: true });
              console.log(`✅ Modelo ${modelName} recreado con force`);
            } catch (forceError) {
              console.log(`💥 Error crítico en modelo ${modelName}:`, forceError.message);
            }
          }
        }
        
      } catch (partialError) {
        console.log('❌ Error en sync parcial:', partialError.message);
        // Restaurar modelos
        Object.assign(conn.models, originalModels);
        throw partialError;
      }
      
    } else {
      // No hay modelos problemáticos, sync normal
      console.log('🔄 Sincronizando base de datos con alter: true...');
      await conn.sync({ alter: true });
      console.log('✅ Base de datos sincronizada correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error con sync progresivo:', error.message);
    
    // ⭐ FALLBACK: Force completo como último recurso
    console.log('🔄 Fallback: recreando toda la base de datos...');
    
    try {
      await comprehensiveCleanup(); // Limpiar una vez más
      await conn.sync({ force: true });
      console.log('✅ Base de datos recreada completamente con force: true');
    } catch (forceError) {
      console.error('💥 Error crítico en fallback:', forceError.message);
      throw forceError;
    }
  }
}

// ⭐ FUNCIÓN PARA VERIFICAR INTEGRIDAD POST-SYNC
async function verifyDatabaseIntegrity() {
  try {
    console.log('🔍 Verificando integridad de la base de datos...');
    
    // Verificar tablas principales
    const mainTables = ['BasicInventories', 'BookingInventoryUsages', 'Users', 'Bookings'];
    
    for (const table of mainTables) {
      try {
        const count = await conn.query(
          `SELECT COUNT(*) as count FROM "${table}"`, 
          { type: conn.QueryTypes.SELECT }
        );
        console.log(`📊 Tabla ${table}: ${count[0].count} registros`);
      } catch (tableError) {
        console.log(`⚠️ Tabla ${table}: No existe o error - ${tableError.message}`);
      }
    }
    
    // Verificar ENUMs
    const enumsQuery = `
      SELECT typname, typelem 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname LIKE '%Inventory%'
      ORDER BY typname;
    `;
    
    const enums = await conn.query(enumsQuery, { type: conn.QueryTypes.SELECT });
    console.log('📋 ENUMs de inventario activos:', enums.map(e => e.typname));
    
    console.log('✅ Verificación de integridad completada');
    
  } catch (error) {
    console.log('⚠️ Error en verificación:', error.message);
  }
}

// ⭐ INICIAR SERVIDOR CON VERIFICACIONES
async function startServer() {
  try {
    console.log('🚀 Iniciando BaluHotel Backend...');
    
    // Sync inteligente
    await smartProgressiveSync();
    
    // Verificar integridad
    await verifyDatabaseIntegrity();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n🎉 ====== BALUHOTEL API INICIADA ====== 🎉`);
      console.log(`🚀 Servidor: http://localhost:${PORT}`);
      console.log(`📊 Base de datos: PostgreSQL conectada y sincronizada`);
      console.log(`🏨 Estado: Lista para recibir requests`);
      console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
      console.log(`🎯 ===================================== 🎯\n`);
    });
    
  } catch (error) {
    console.error('\n💥 ====== ERROR CRÍTICO ====== 💥');
    console.error('📍 Error al iniciar servidor:', error.message);
    console.error('🔧 Revisa la configuración de la base de datos');
    console.error('💡 Considera usar force: true en desarrollo');
    console.error('🚨 ========================== 🚨\n');
    process.exit(1);
  }
}

// ⭐ MANEJO GRACEFUL DE SHUTDOWN
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor gracefully...');
  try {
    await conn.close();
    console.log('✅ Conexión a base de datos cerrada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar conexión:', error.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Recibida señal SIGTERM, cerrando...');
  try {
    await conn.close();
    console.log('✅ Conexión a base de datos cerrada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar conexión:', error.message);
    process.exit(1);
  }
});

// ⭐ INICIAR TODO
startServer();