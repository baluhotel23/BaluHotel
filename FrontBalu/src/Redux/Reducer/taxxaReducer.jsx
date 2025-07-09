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

    default:
      return state;
  }
};

export default taxxaReducer;