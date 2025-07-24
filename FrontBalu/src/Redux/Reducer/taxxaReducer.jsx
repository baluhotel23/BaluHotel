const initialState = {
  // 📋 Estados existentes
  buyer: null,
  seller: null,
  invoice: null,
  loading: false,
  error: null,
  message: null,

  // 🆕 Estados para catálogos DIAN
  countries: [],
  departmentsCache: {}, // Cache por país: { "departments_CO": [...], "departments_US": [...] }
  municipalitiesCache: {}, // Cache por filtros: { "municipalities_05__50": [...] }
  
  // 🔍 Estados de búsqueda y validación
  municipalitySearchResults: [],
  searchTerm: '',
  locationValidation: null,
  
  // ⚡ Loading states específicos para catálogos
  loadingCountries: false,
  loadingDepartments: false,
  loadingMunicipalities: false,
  loadingValidation: false,
  loadingSearch: false,
  
  // ❌ Error states específicos para catálogos
  countriesError: null,
  departmentsError: null,
  municipalitiesError: null,
  validationError: null,
  searchError: null,

  // 🆕 NUEVOS ESTADOS PARA FACTURAS EMITIDAS Y NOTAS DE CRÉDITO
  invoices: [],
  loadingInvoices: false,
  invoicesError: null,
  selectedInvoice: null,
  
  creditNotes: [],
  loadingCreditNotes: false,
  creditNotesError: null,
  
  numberingStats: null,
  loadingStats: false,
  statsError: null,
  
  // 🔧 Estado para modal de nota de crédito
  showCreditNoteModal: false,
  creditNoteFormData: {
    creditReason: '1',
    amount: '',
    description: ''
  },

  // ⭐ NUEVOS ESTADOS PARA FACTURACIÓN MANUAL
  manualInvoice: {
    // 📋 Datos iniciales (próximo número + seller)
    data: null,                    // { nextInvoiceNumber, fullInvoiceNumber, seller }
    loading: false,
    error: null,
    
    // 🔍 Búsqueda de comprador
    buyerSearch: {
      loading: false,
      found: false,
      buyer: null,                 // Datos del comprador encontrado
      error: null
    },
    
    // 📝 Creación de factura manual
    creating: false,               // Loading state para crear factura
    created: null,                 // Datos de la factura creada exitosamente
    createError: null,             // Error en la creación
    
    // 📄 Formulario de facturación manual
    formData: {
      // 👤 Datos del comprador
      buyer: {
        document: '',
        docType: 13,               // Cédula de ciudadanía por defecto
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        cityCode: '',
        department: '',
        departmentCode: '',
        country: 'Colombia',
        countryCode: 'CO',
        zipCode: ''
      },
      
      // 🛒 Items de la factura (dinámico)
      items: [{
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 19,               // 19% IVA por defecto
        totalPrice: 0              // Calculado automáticamente
      }],
      
      // 📝 Información adicional
      notes: '',                   // Notas opcionales
      paymentMethod: 'cash'        // Método de pago por defecto
    },
    
    // 💰 Totales calculados
    totals: {
      subtotal: 0,                 // Base sin impuestos
      taxAmount: 0,                // Total de impuestos
      totalAmount: 0               // Total final
    },
    
    // 🔧 Estados de UI
    ui: {
      showBuyerForm: false,        // Para mostrar/ocultar formulario de comprador nuevo
      activeTab: 'buyer',          // buyer | items | review
      isDirty: false,              // Para detectar cambios no guardados
      errors: {}                   // Errores de validación por campo
    }
  }
};

const taxxaReducer = (state = initialState, action) => {
  switch (action.type) {
    // 📋 CASOS EXISTENTES - Sin cambios
    case 'FETCH_BUYER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
        message: null,
        buyer: null,
      };
    case 'CREATE_BUYER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
        message: null,
      };
    case 'FETCH_SELLER_REQUEST':
    case 'CREATE_SELLER_REQUEST':
    case 'UPDATE_SELLER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
        message: null,
      };

    // 🔧 SEND_INVOICE_REQUEST - CORREGIDO
    case 'SEND_INVOICE_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
        message: null,
        invoice: null // Reset previous invoice
      };

    // Success States - Existentes
    case 'FETCH_BUYER_SUCCESS':
      return {
        ...state,
        loading: false,
        buyer: action.payload,
        error: null,
      };
    case 'CREATE_BUYER_SUCCESS':
      return {
        ...state,
        loading: false,
        buyer: action.payload,
        error: null,
        message: 'Comprador creado exitosamente',
      };
    case 'FETCH_SELLER_SUCCESS':
      return {
        ...state,
        loading: false,
        seller: action.payload,
        error: null,
      };
    case 'CREATE_SELLER_SUCCESS':
      return {
        ...state,
        loading: false,
        seller: action.payload,
        error: null,
        message: 'Datos del comercio creados correctamente.',
      };
    case 'UPDATE_SELLER_SUCCESS':
      return {
        ...state,
        loading: false,
        seller: action.payload,
        error: null,
        message: 'Datos del comercio actualizados correctamente.',
      };
    
    // 🔧 SEND_INVOICE_SUCCESS - CORREGIDO
    case 'SEND_INVOICE_SUCCESS':
      return {
        ...state,
        loading: false,
        invoice: action.payload,
        error: null,
        message: action.payload.isContingency 
          ? 'Factura enviada con contingencia activada'
          : 'Factura enviada exitosamente a Taxxa',
        // 🆕 AGREGAR A LA LISTA DE FACTURAS SI VIENE CON DATOS
        invoices: action.payload.data?.invoice 
          ? [action.payload.data.invoice, ...state.invoices]
          : state.invoices
      };

    // Failure States - Existentes
    case 'FETCH_BUYER_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        buyer: null,
      };
    case 'CREATE_BUYER_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        message: null,
      };
    case 'FETCH_SELLER_FAILURE':
    case 'CREATE_SELLER_FAILURE':
    case 'UPDATE_SELLER_FAILURE':
    case 'SEND_INVOICE_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        message: null,
      };

    // 🆕 NUEVOS CASOS PARA CATÁLOGOS DIAN (sin cambios - están bien)

    // 🌍 PAÍSES
    case 'FETCH_COUNTRIES_REQUEST':
      return { 
        ...state, 
        loadingCountries: true, 
        countriesError: null 
      };
    case 'FETCH_COUNTRIES_SUCCESS':
      return { 
        ...state, 
        loadingCountries: false, 
        countries: action.payload,
        countriesError: null 
      };
    case 'FETCH_COUNTRIES_FAILURE':
      return { 
        ...state, 
        loadingCountries: false, 
        countriesError: action.payload,
        countries: [] // Reset en caso de error
      };

    // 🏛️ DEPARTAMENTOS
    case 'FETCH_DEPARTMENTS_REQUEST':
      return { 
        ...state, 
        loadingDepartments: true, 
        departmentsError: null 
      };
    case 'FETCH_DEPARTMENTS_SUCCESS':
      return { 
        ...state, 
        loadingDepartments: false,
        departmentsCache: {
          ...state.departmentsCache,
          [action.payload.cacheKey]: action.payload.departments
        },
        departmentsError: null 
      };
    case 'FETCH_DEPARTMENTS_FAILURE':
      return { 
        ...state, 
        loadingDepartments: false, 
        departmentsError: action.payload 
      };

    // 🏙️ MUNICIPIOS
    case 'FETCH_MUNICIPALITIES_REQUEST':
      return {
        ...state,
        loadingMunicipalities: true,
        municipalitiesError: null // 🔧 CORREGIDO: usar municipalitiesError
      };
      
    case 'FETCH_MUNICIPALITIES_SUCCESS': {
      console.log('📮 [REDUCER] FETCH_MUNICIPALITIES_SUCCESS payload:', action.payload);
      
      const { municipalities, cacheKey } = action.payload;
      
      // 🔧 VERIFICAR QUE MUNICIPALITIES SEA UN ARRAY
      if (!Array.isArray(municipalities)) {
        console.error('❌ [REDUCER] municipalities no es un array:', municipalities);
        return {
          ...state,
          loadingMunicipalities: false,
          municipalitiesError: 'Formato de datos inválido'
        };
      }
      
      return {
        ...state,
        loadingMunicipalities: false,
        municipalitiesError: null,
        municipalitiesCache: {
          ...state.municipalitiesCache,
          [cacheKey]: municipalities  // 🎯 GUARDAR EL ARRAY DE MUNICIPIOS
        }
      };
    }
      
    case 'FETCH_MUNICIPALITIES_FAILURE':
      return {
        ...state,
        loadingMunicipalities: false,
        municipalitiesError: action.payload
      };

    // ✅ VALIDACIÓN DE UBICACIÓN
    case 'VALIDATE_LOCATION_REQUEST':
      return { 
        ...state, 
        loadingValidation: true, 
        validationError: null 
      };
    case 'VALIDATE_LOCATION_SUCCESS':
      return { 
        ...state, 
        loadingValidation: false,
        locationValidation: action.payload,
        validationError: null 
      };
    case 'VALIDATE_LOCATION_FAILURE':
      return { 
        ...state, 
        loadingValidation: false, 
        validationError: action.payload,
        locationValidation: null // Reset validación en error
      };

    // 🆕 CASOS PARA FACTURAS EMITIDAS

    // 📋 OBTENER TODAS LAS FACTURAS
    case 'GET_ALL_INVOICES_REQUEST':
      return {
        ...state,
        loadingInvoices: true,
        invoicesError: null
      };
    case 'GET_ALL_INVOICES_SUCCESS':
      return {
        ...state,
        loadingInvoices: false,
        invoices: action.payload,
        invoicesError: null
      };
    case 'GET_ALL_INVOICES_FAILURE':
      return {
        ...state,
        loadingInvoices: false,
        invoicesError: action.payload,
        invoices: []
      };

    // 📄 OBTENER FACTURA POR ID
    case 'GET_INVOICE_BY_ID_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'GET_INVOICE_BY_ID_SUCCESS':
      return {
        ...state,
        loading: false,
        selectedInvoice: action.payload,
        error: null
      };
    case 'GET_INVOICE_BY_ID_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        selectedInvoice: null
      };

    // 📝 CREAR NOTA DE CRÉDITO
    case 'CREATE_CREDIT_NOTE_REQUEST':
      return {
        ...state,
        loadingCreditNotes: true,
        creditNotesError: null
      };
    case 'CREATE_CREDIT_NOTE_SUCCESS':
      return {
        ...state,
        loadingCreditNotes: false,
        creditNotes: [...state.creditNotes, action.payload],
        creditNotesError: null,
        showCreditNoteModal: false, // Cerrar modal al éxito
        creditNoteFormData: { // Reset form
          creditReason: '1',
          amount: '',
          description: ''
        }
      };
    case 'CREATE_CREDIT_NOTE_FAILURE':
      return {
        ...state,
        loadingCreditNotes: false,
        creditNotesError: action.payload
      };

    // 📊 OBTENER ESTADÍSTICAS DE NUMERACIÓN
    case 'GET_NUMBERING_STATS_REQUEST':
      return {
        ...state,
        loadingStats: true,
        statsError: null
      };
    case 'GET_NUMBERING_STATS_SUCCESS':
      return {
        ...state,
        loadingStats: false,
        numberingStats: action.payload,
        statsError: null
      };
    case 'GET_NUMBERING_STATS_FAILURE':
      return {
        ...state,
        loadingStats: false,
        statsError: action.payload,
        numberingStats: null
      };

    // 🔧 CASOS PARA MANEJO DEL MODAL DE NOTA DE CRÉDITO
    case 'SET_SELECTED_INVOICE':
      return {
        ...state,
        selectedInvoice: action.payload
      };
    case 'TOGGLE_CREDIT_NOTE_MODAL':
      return {
        ...state,
        showCreditNoteModal: action.payload
      };
    case 'UPDATE_CREDIT_NOTE_FORM':
      return {
        ...state,
        creditNoteFormData: {
          ...state.creditNoteFormData,
          ...action.payload
        }
      };
    case 'RESET_CREDIT_NOTE_FORM':
      return {
        ...state,
        creditNoteFormData: {
          creditReason: '1',
          amount: '',
          description: ''
        }
      };

    // 🗑️ LIMPIAR CACHE
    case 'CLEAR_DIAN_CACHE':
      return {
        ...state,
        countries: [],
        departmentsCache: {},
        municipalitiesCache: {},
        municipalitySearchResults: [],
        searchTerm: '',
        locationValidation: null,
        // Reset errores de catálogos
        countriesError: null,
        departmentsError: null,
        municipalitiesError: null,
        validationError: null,
        searchError: null
      };

    // 🧹 LIMPIAR FACTURAS Y NOTAS DE CRÉDITO
    case 'CLEAR_INVOICES_CACHE':
      return {
        ...state,
        invoices: [],
        creditNotes: [],
        selectedInvoice: null,
        numberingStats: null,
        showCreditNoteModal: false,
        creditNoteFormData: {
          creditReason: '1',
          amount: '',
          description: ''
        }
      };

    // 🧹 RESET GENERAL (opcional - para limpiar todo el estado TAXXA)
    case 'RESET_TAXXA_STATE':
      return {
        ...initialState
      };
      case 'GET_MANUAL_INVOICE_DATA_REQUEST':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          loading: true,
          error: null
        }
      };
    case 'GET_MANUAL_INVOICE_DATA_SUCCESS':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          loading: false,
          data: action.payload,
          error: null
        }
      };
    case 'GET_MANUAL_INVOICE_DATA_FAILURE':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          loading: false,
          data: null,
          error: action.payload
        }
      };

    // 🔍 BUSCAR COMPRADOR PARA FACTURACIÓN MANUAL
    case 'SEARCH_MANUAL_BUYER_REQUEST':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          buyerSearch: {
            loading: true,
            found: false,
            buyer: null,
            error: null
          }
        }
      };
    case 'SEARCH_MANUAL_BUYER_SUCCESS':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          buyerSearch: {
            loading: false,
            found: action.payload.found,
            buyer: action.payload.buyer,
            error: null
          },
          // 🔧 AUTO-LLENAR FORMULARIO SI SE ENCUENTRA EL COMPRADOR
          formData: action.payload.found ? {
            ...state.manualInvoice.formData,
            buyer: {
              ...state.manualInvoice.formData.buyer,
              document: action.payload.buyer.document,
              name: action.payload.buyer.name,
              email: action.payload.buyer.email || '',
              phone: action.payload.buyer.phone || '',
              address: action.payload.buyer.address?.saddressline1 || '',
              city: action.payload.buyer.address?.scityname || '',
              department: action.payload.buyer.address?.sdepartmentname || '',
              country: action.payload.buyer.address?.scountrycode === 'CO' ? 'Colombia' : 'Colombia'
            }
          } : state.manualInvoice.formData
        }
      };
    case 'SEARCH_MANUAL_BUYER_FAILURE':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          buyerSearch: {
            loading: false,
            found: false,
            buyer: null,
            error: action.payload
          }
        }
      };

    // 📝 CREAR FACTURA MANUAL
    case 'CREATE_MANUAL_INVOICE_REQUEST':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          creating: true,
          created: null,
          createError: null
        }
      };
    case 'CREATE_MANUAL_INVOICE_SUCCESS':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          creating: false,
          created: action.payload,
          createError: null,
          // 🔧 RESET FORMULARIO DESPUÉS DEL ÉXITO
          formData: {
            buyer: {
              document: '',
              name: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              department: '',
              country: 'Colombia'
            },
            items: [{
              description: '',
              quantity: 1,
              unitPrice: 0,
              taxRate: 19
            }],
            notes: ''
          },
          buyerSearch: {
            loading: false,
            found: false,
            buyer: null,
            error: null
          }
        },
        // 🔧 AGREGAR A LA LISTA DE FACTURAS
        invoices: action.payload.invoice 
          ? [action.payload.invoice, ...state.invoices]
          : state.invoices
      };
    case 'CREATE_MANUAL_INVOICE_FAILURE':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          creating: false,
          created: null,
          createError: action.payload
        }
      };

    // 🔧 ACTUALIZAR FORMULARIO DE FACTURACIÓN MANUAL
    case 'UPDATE_MANUAL_INVOICE_FORM':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          formData: {
            ...state.manualInvoice.formData,
            ...action.payload
          }
        }
      };

    // 🔧 AGREGAR ITEM AL FORMULARIO
    case 'ADD_MANUAL_INVOICE_ITEM':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          formData: {
            ...state.manualInvoice.formData,
            items: [
              ...state.manualInvoice.formData.items,
              {
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: 19
              }
            ]
          }
        }
      };

    // 🔧 REMOVER ITEM DEL FORMULARIO
    case 'REMOVE_MANUAL_INVOICE_ITEM':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          formData: {
            ...state.manualInvoice.formData,
            items: state.manualInvoice.formData.items.filter(
              (_, index) => index !== action.payload
            )
          }
        }
      };

    // 🔧 ACTUALIZAR ITEM ESPECÍFICO
    case 'UPDATE_MANUAL_INVOICE_ITEM':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          formData: {
            ...state.manualInvoice.formData,
            items: state.manualInvoice.formData.items.map(
              (item, index) => 
                index === action.payload.index 
                  ? { ...item, ...action.payload.data }
                  : item
            )
          }
        }
      };

    // 🧹 LIMPIAR DATOS DE FACTURACIÓN MANUAL
    case 'CLEAR_MANUAL_INVOICE_DATA':
      return {
        ...state,
        manualInvoice: {
          ...initialState.manualInvoice
        }
      };

    case 'CLEAR_MANUAL_BUYER_SEARCH':
      return {
        ...state,
        manualInvoice: {
          ...state.manualInvoice,
          buyerSearch: {
            loading: false,
            found: false,
            buyer: null,
            error: null
          }
        }
      };


    default:
      return state;
  }
};

export default taxxaReducer;