const initialState = {
  // ⭐ INVENTARIO GENERAL
  inventory: [],
  inventoryByType: {}, // Para separar por tipo: reusable, consumable, sellable
  sellableItems: [],
  lowStockItems: [],
  currentItem: null,
  
  // ⭐ COMPRAS Y PROVEEDORES
  purchases: [],
  currentPurchase: null,
  suppliers: [],
  categories: [],
  
  // ⭐ INVENTARIO DE RESERVAS (NUEVO)
  booking: {
    assignments: [], // Asignaciones activas
    usage: [], // Uso por reserva
    availability: null, // Disponibilidad para check-in
    history: [], // Historial de movimientos
    checkoutResults: [] // Resultados de check-out
  },
  
  // ⭐ LAVANDERÍA Y STOCK
  laundry: {
    dirtyItems: [],
    cleanItems: [],
    transfers: []
  },
  
  // ⭐ REPORTES
  reports: {
    summary: null,
    consumption: null,
    valuation: null
  },
  
  // ⭐ LOADING GRANULAR - COMPLETADO
  loading: {
    general: false,
    items: false,
    creating: false,    // ⭐ AGREGADO
    updating: false,    // ⭐ AGREGADO
    deleting: false,    // ⭐ AGREGADO
    booking: false,
    laundry: false,
    reports: false,
    stock: false,
    purchases: false,   // ⭐ AGREGADO
    categories: false   // ⭐ AGREGADO
  },
  
  // ⭐ ERRORES ESPECÍFICOS - COMPLETADO
  errors: {
    general: null,
    items: null,
    creating: null,     // ⭐ AGREGADO
    updating: null,     // ⭐ AGREGADO
    deleting: null,     // ⭐ AGREGADO
    booking: null,
    laundry: null,
    reports: null,
    stock: null,
    purchases: null,    // ⭐ AGREGADO
    categories: null    // ⭐ AGREGADO
  },
  
  // ⭐ SUCCESS STATE - AGREGADO COMPLETO
  success: {
    message: null,
    type: null,        // 'create', 'update', 'delete', 'purchase', etc.
    timestamp: null
  },
  
  // ⭐ CACHE
  cache: {
    lastUpdated: null,
    categoriesLastFetch: null,
    suppliersLastFetch: null
  }
};

const inventoryReducer = (state = initialState, action) => {
  switch (action.type) {
    
    // ⭐ INVENTARIO GENERAL - OPTIMIZADO
    case 'GET_INVENTORY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, general: true },
        errors: { ...state.errors, general: null }
      };
    case 'GET_INVENTORY':
    case 'GET_INVENTORY_SUCCESS':
      return {
        ...state,
        inventory: action.payload,
        loading: { ...state.loading, general: false },
        errors: { ...state.errors, general: null },
        cache: { ...state.cache, lastUpdated: Date.now() }
      };
    case 'GET_INVENTORY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ INVENTARIO POR TIPO - NUEVO
    case 'GET_INVENTORY_BY_TYPE_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, general: true },
        errors: { ...state.errors, general: null }
      };
    case 'GET_INVENTORY_BY_TYPE_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        inventoryByType: {
          ...state.inventoryByType,
          [action.payload.type]: action.payload.items
        }
      };
    case 'GET_INVENTORY_BY_TYPE_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, general: false },
        errors: { ...state.errors, general: action.payload }
      };

    // ⭐ ITEMS INDIVIDUALES
    case 'GET_ALL_ITEMS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, items: true },
        errors: { ...state.errors, items: null }
      };
    case 'GET_ALL_ITEMS':
    case 'GET_ALL_ITEMS_SUCCESS':
      return {
        ...state,
        inventory: action.payload,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: null }
      };
    case 'GET_ALL_ITEMS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: action.payload }
      };
    
    case 'GET_SELLABLE_ITEMS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, items: true },
        errors: { ...state.errors, items: null }
      };
    case 'GET_SELLABLE_ITEMS':
    case 'GET_SELLABLE_ITEMS_SUCCESS':
      return {
        ...state,
        sellableItems: action.payload,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: null }
      };
    case 'GET_SELLABLE_ITEMS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: action.payload }
      };
      
    case 'GET_LOW_STOCK_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, items: true },
        errors: { ...state.errors, items: null }
      };
    case 'GET_LOW_STOCK':
    case 'GET_LOW_STOCK_SUCCESS':
      return {
        ...state,
        lowStockItems: action.payload,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: null }
      };
    case 'GET_LOW_STOCK_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: action.payload }
      };
      
    case 'GET_ITEM_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, items: true },
        errors: { ...state.errors, items: null }
      };
    case 'GET_ITEM':
    case 'GET_ITEM_SUCCESS':
      return {
        ...state,
        currentItem: action.payload,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: null }
      };
    case 'GET_ITEM_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, items: false },
        errors: { ...state.errors, items: action.payload }
      };
      
    // ⭐ CREAR ITEM - ESTADOS GRANULARES
    case 'CREATE_ITEM_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, creating: true },
        errors: { ...state.errors, creating: null },
        success: { ...state.success, message: null, type: null }
      };
    case 'CREATE_ITEM_SUCCESS':
      return {
        ...state,
        inventory: [...state.inventory, action.payload.item],
        loading: { ...state.loading, creating: false },
        errors: { ...state.errors, creating: null },
        success: { 
          message: action.payload.message, 
          type: 'create',
          timestamp: Date.now()
        }
      };
    case 'CREATE_ITEM_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, creating: false },
        errors: { ...state.errors, creating: action.payload },
        success: { ...state.success, message: null, type: null }
      };
      
    // ⭐ ACTUALIZAR ITEM - ESTADOS GRANULARES
    case 'UPDATE_ITEM_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, updating: true },
        errors: { ...state.errors, updating: null },
        success: { ...state.success, message: null, type: null }
      };
    case 'UPDATE_ITEM_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.map(item => 
          item.id === action.payload.item.id ? action.payload.item : item
        ),
        currentItem: state.currentItem?.id === action.payload.item.id ? action.payload.item : state.currentItem,
        loading: { ...state.loading, updating: false },
        errors: { ...state.errors, updating: null },
        success: { 
          message: action.payload.message, 
          type: 'update',
          timestamp: Date.now()
        }
      };
    case 'UPDATE_ITEM_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, updating: false },
        errors: { ...state.errors, updating: action.payload },
        success: { ...state.success, message: null, type: null }
      };
      
    // ⭐ ELIMINAR ITEM - ESTADOS GRANULARES
    case 'DELETE_ITEM_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, deleting: true },
        errors: { ...state.errors, deleting: null },
        success: { ...state.success, message: null, type: null }
      };
    case 'DELETE_ITEM_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.filter(item => item.id !== action.payload.itemId),
        currentItem: state.currentItem?.id === action.payload.itemId ? null : state.currentItem,
        loading: { ...state.loading, deleting: false },
        errors: { ...state.errors, deleting: null },
        success: { 
          message: action.payload.message, 
          type: 'delete',
          timestamp: Date.now()
        }
      };
    case 'DELETE_ITEM_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, deleting: false },
        errors: { ...state.errors, deleting: action.payload },
        success: { ...state.success, message: null, type: null }
      };

    // ⭐ GESTIÓN DE STOCK
    case 'ADD_STOCK_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, stock: true },
        errors: { ...state.errors, stock: null }
      };
    case 'ADD_STOCK':
    case 'ADD_STOCK_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.map(item => 
          item.id === action.payload.id ? action.payload : item
        ),
        loading: { ...state.loading, stock: false },
        errors: { ...state.errors, stock: null },
        success: { 
          message: 'Stock agregado exitosamente', 
          type: 'stock',
          timestamp: Date.now()
        }
      };
    case 'ADD_STOCK_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, stock: false },
        errors: { ...state.errors, stock: action.payload }
      };

    case 'REMOVE_STOCK_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, stock: true },
        errors: { ...state.errors, stock: null }
      };
    case 'REMOVE_STOCK':
    case 'REMOVE_STOCK_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.map(item => 
          item.id === action.payload.id ? action.payload : item
        ),
        loading: { ...state.loading, stock: false },
        errors: { ...state.errors, stock: null },
        success: { 
          message: 'Stock reducido exitosamente', 
          type: 'stock',
          timestamp: Date.now()
        }
      };
    case 'REMOVE_STOCK_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, stock: false },
        errors: { ...state.errors, stock: action.payload }
      };

    // ⭐ TRANSFERENCIAS DE LAVANDERÍA
    case 'TRANSFER_DIRTY_TO_CLEAN_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, laundry: true },
        errors: { ...state.errors, laundry: null }
      };
    case 'TRANSFER_DIRTY_TO_CLEAN_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, laundry: false },
        errors: { ...state.errors, laundry: null },
        laundry: {
          ...state.laundry,
          transfers: [...state.laundry.transfers, action.payload]
        },
        inventory: state.inventory.map(item => 
          item.id === action.payload.itemId ? {
            ...item,
            cleanStock: action.payload.newCleanStock,
            dirtyStock: action.payload.newDirtyStock
          } : item
        ),
        success: { 
          message: 'Transferencia de lavandería completada', 
          type: 'laundry',
          timestamp: Date.now()
        }
      };
    case 'TRANSFER_DIRTY_TO_CLEAN_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, laundry: false },
        errors: { ...state.errors, laundry: action.payload }
      };

    // ⭐ MARCAR COMO SUCIO
    case 'MARK_INVENTORY_AS_DIRTY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, laundry: true },
        errors: { ...state.errors, laundry: null }
      };
    case 'MARK_INVENTORY_AS_DIRTY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, laundry: false },
        errors: { ...state.errors, laundry: null },
        laundry: {
          ...state.laundry,
          dirtyItems: [...state.laundry.dirtyItems, ...action.payload.items]
        },
        success: { 
          message: 'Items marcados como sucios', 
          type: 'laundry',
          timestamp: Date.now()
        }
      };
    case 'MARK_INVENTORY_AS_DIRTY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, laundry: false },
        errors: { ...state.errors, laundry: action.payload }
      };

    // ⭐ ASIGNACIÓN DE INVENTARIO A RESERVAS
    case 'ASSIGN_INVENTORY_TO_BOOKING_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, booking: true },
        errors: { ...state.errors, booking: null }
      };
    case 'ASSIGN_INVENTORY_TO_BOOKING_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: null },
        booking: {
          ...state.booking,
          assignments: [
            ...state.booking.assignments.filter(a => a.bookingId !== action.payload.bookingId),
            {
              bookingId: action.payload.bookingId,
              assignments: action.payload.assignments,
              errors: action.payload.errors,
              timestamp: Date.now()
            }
          ]
        },
        success: { 
          message: 'Inventario asignado a la reserva', 
          type: 'booking',
          timestamp: Date.now()
        }
      };
    case 'ASSIGN_INVENTORY_TO_BOOKING_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ PROCESO DE CHECK-OUT DE INVENTARIO
    case 'PROCESS_CHECKOUT_INVENTORY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, booking: true },
        errors: { ...state.errors, booking: null }
      };
    case 'PROCESS_CHECKOUT_INVENTORY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: null },
        booking: {
          ...state.booking,
          checkoutResults: [
            ...state.booking.checkoutResults,
            {
              bookingId: action.payload.bookingId,
              processedReturns: action.payload.processedReturns,
              timestamp: Date.now()
            }
          ]
        },
        success: { 
          message: 'Check-out de inventario procesado', 
          type: 'booking',
          timestamp: Date.now()
        }
      };
    case 'PROCESS_CHECKOUT_INVENTORY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ USO DE INVENTARIO POR RESERVA
    case 'GET_BOOKING_INVENTORY_USAGE_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, booking: true },
        errors: { ...state.errors, booking: null }
      };
    case 'GET_BOOKING_INVENTORY_USAGE_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: null },
        booking: {
          ...state.booking,
          usage: [
            ...state.booking.usage.filter(u => u.bookingId !== action.payload.bookingId),
            {
              bookingId: action.payload.bookingId,
              usage: action.payload.usage,
              timestamp: Date.now()
            }
          ]
        }
      };
    case 'GET_BOOKING_INVENTORY_USAGE_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, booking: false },
        errors: { ...state.errors, booking: action.payload }
      };

    // ⭐ RESUMEN DE INVENTARIO
    case 'GET_INVENTORY_SUMMARY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, reports: true },
        errors: { ...state.errors, reports: null }
      };
    case 'GET_INVENTORY_SUMMARY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, reports: false },
        errors: { ...state.errors, reports: null },
        reports: { ...state.reports, summary: action.payload }
      };
    case 'GET_INVENTORY_SUMMARY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, reports: false },
        errors: { ...state.errors, reports: action.payload }
      };

    // ⭐ CATEGORÍAS
    case 'GET_CATEGORIES_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, categories: true },
        errors: { ...state.errors, categories: null }
      };
    case 'GET_CATEGORIES':
    case 'GET_CATEGORIES_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: null },
        categories: action.payload,
        cache: { ...state.cache, categoriesLastFetch: Date.now() }
      };
    case 'GET_CATEGORIES_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: action.payload }
      };

    case 'CREATE_CATEGORY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, categories: true },
        errors: { ...state.errors, categories: null }
      };
    case 'CREATE_CATEGORY':
    case 'CREATE_CATEGORY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: null },
        categories: [...state.categories, action.payload],
        success: { 
          message: 'Categoría creada exitosamente', 
          type: 'category',
          timestamp: Date.now()
        }
      };
    case 'CREATE_CATEGORY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: action.payload }
      };

    case 'UPDATE_CATEGORY_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, categories: true },
        errors: { ...state.errors, categories: null }
      };
    case 'UPDATE_CATEGORY':
    case 'UPDATE_CATEGORY_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: null },
        categories: state.categories.map(cat => 
          cat.id === action.payload.id ? action.payload : cat
        ),
        success: { 
          message: 'Categoría actualizada exitosamente', 
          type: 'category',
          timestamp: Date.now()
        }
      };
    case 'UPDATE_CATEGORY_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, categories: false },
        errors: { ...state.errors, categories: action.payload }
      };

    // ⭐ COMPRAS
    case 'CREATE_PURCHASE_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, purchases: true },
        errors: { ...state.errors, purchases: null }
      };
    case 'CREATE_PURCHASE':
    case 'CREATE_PURCHASE_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: null },
        purchases: [...state.purchases, action.payload],
        success: { 
          message: 'Compra creada exitosamente', 
          type: 'purchase',
          timestamp: Date.now()
        }
      };
    case 'CREATE_PURCHASE_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: action.payload }
      };

    case 'GET_ALL_PURCHASES_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, purchases: true },
        errors: { ...state.errors, purchases: null }
      };
    case 'GET_ALL_PURCHASES':
    case 'GET_ALL_PURCHASES_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: null },
        purchases: action.payload
      };
    case 'GET_ALL_PURCHASES_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: action.payload }
      };

    case 'GET_PURCHASE_DETAILS_REQUEST':
      return {
        ...state,
        loading: { ...state.loading, purchases: true },
        errors: { ...state.errors, purchases: null }
      };
    case 'GET_PURCHASE_DETAILS':
    case 'GET_PURCHASE_DETAILS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: null },
        currentPurchase: action.payload
      };
    case 'GET_PURCHASE_DETAILS_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, purchases: false },
        errors: { ...state.errors, purchases: action.payload }
      };

    // ⭐ LIMPIAR ESTADOS - AGREGADO COMPLETO
    case 'CLEAR_INVENTORY_SUCCESS':
      return {
        ...state,
        success: { message: null, type: null, timestamp: null }
      };
      
    case 'CLEAR_INVENTORY_ERRORS':
      return {
        ...state,
        errors: { 
          general: null,
          items: null,
          creating: null,
          updating: null,
          deleting: null,
          booking: null,
          laundry: null,
          reports: null,
          stock: null,
          purchases: null,
          categories: null
        }
      };

    case 'CLEAR_CURRENT_ITEM':
      return {
        ...state,
        currentItem: null
      };

    case 'CLEAR_CURRENT_PURCHASE':
      return {
        ...state,
        currentPurchase: null
      };

    case 'CLEAR_BOOKING_INVENTORY_STATE':
      return {
        ...state,
        booking: {
          assignments: [],
          usage: [],
          availability: null,
          history: [],
          checkoutResults: []
        },
        errors: { ...state.errors, booking: null }
      };

    case 'CLEAR_LAUNDRY_STATE':
      return {
        ...state,
        laundry: {
          dirtyItems: [],
          cleanItems: [],
          transfers: []
        },
        errors: { ...state.errors, laundry: null }
      };

    case 'RESET_INVENTORY_STATE':
      return initialState;

    default:
      return state;
  }
};

export default inventoryReducer;