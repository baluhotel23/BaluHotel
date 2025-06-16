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
    case 'SEND_INVOICE_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
        message: null,
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
    case 'SEND_INVOICE_SUCCESS':
      return {
        ...state,
        loading: false,
        invoice: action.payload,
        error: null,
        message: 'Factura enviada exitosamente.',
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
      };

    // 🆕 NUEVOS CASOS PARA CATÁLOGOS DIAN

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
        error: null
      };
      
    case 'FETCH_MUNICIPALITIES_SUCCESS': {
      console.log('📮 [REDUCER] FETCH_MUNICIPALITIES_SUCCESS payload:', action.payload);
      
      const { municipalities, cacheKey, search, limit } = action.payload;
      
      // 🔧 VERIFICAR QUE MUNICIPALITIES SEA UN ARRAY
      if (!Array.isArray(municipalities)) {
        console.error('❌ [REDUCER] municipalities no es un array:', municipalities);
        return {
          ...state,
          loadingMunicipalities: false,
          error: 'Formato de datos inválido'
        };
      }
      
      return {
        ...state,
        loadingMunicipalities: false,
        error: null,
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
        error: action.payload
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