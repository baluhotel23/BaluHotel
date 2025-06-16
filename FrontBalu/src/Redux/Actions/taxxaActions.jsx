import api from '../../utils/axios';
import { toast } from 'react-toastify';

export const fetchBuyerByDocument = (sdocno) => async (dispatch) => {
  dispatch({ type: 'FETCH_BUYER_REQUEST' });

  try {
    const response = await api.get(`/taxxa/buyer/${sdocno}`);
    const data = response.data;
    console.log(data);

    if (data && !data.error && data.data) {
      dispatch({ type: 'FETCH_BUYER_SUCCESS', payload: data.data });
    } else {
      const errorMsg = "Usuario no encontrado";
      dispatch({ type: 'FETCH_BUYER_FAILURE', payload: errorMsg });
      toast.error("Complete los datos del usuario");
    }
  } catch (error) {
    let errorMsg = error.message;
    if (error.response && error.response.status === 404) {
      errorMsg = "Complete los datos del usuario";
    }
    dispatch({ type: 'FETCH_BUYER_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
  }
};

  export const fetchSellerData = (n_document) => async (dispatch) => {
    dispatch({ type: 'FETCH_SELLER_REQUEST' });
  
    try {
      const response = await api.get(`/seller?n_document=${n_document}`); // Pasar el DNI como parámetro
      const result = await response.json();
  
      if (response.ok) {
        dispatch({ type: 'FETCH_SELLER_SUCCESS', payload: result.data });
      } else {
        dispatch({
          type: 'FETCH_SELLER_FAILURE',
          payload: result.message || "Error al obtener los datos del comercio",
        });
      }
    } catch (error) {
      dispatch({ type: 'FETCH_SELLER_FAILURE', payload: error.message });
    }
  };
  
  export const createSellerData = (sellerData) => async (dispatch) => {
    dispatch({ type: 'CREATE_SELLER_REQUEST' });
  
    try {
      const response = await api.put(`/admin/settings/hotel-settings`, sellerData);
      const data = response.data;
  
      if (response.status === 200) {
        dispatch({ type: 'CREATE_SELLER_SUCCESS', payload: data.data });
        toast.success('Datos del comercio creados correctamente.');
        return true; // <--- AÑADIDO: Retornar true en caso de éxito
      } else {
        dispatch({
          type: 'CREATE_SELLER_FAILURE',
          payload: data.error || "Error al crear los datos del comercio",
        });
        toast.error(data.error || "Error al crear los datos del comercio.");
        return false; // <--- AÑADIDO: Retornar false en caso de fallo
      }
    } catch (error) {
      dispatch({ type: 'CREATE_SELLER_FAILURE', payload: error.message });
      toast.error(error.message || "Ha ocurrido un error inesperado.");
      return false; // <--- AÑADIDO: Retornar false en caso de excepción
    }
  };
  
  export const updateSellerData = (n_document, sellerData) => async (dispatch) => {
    dispatch({ type: 'UPDATE_SELLER_REQUEST' });
  
    try {
      const response = await api.put(`/seller/${n_document}`, sellerData);
      const data = response.data;
  
      if (response.status === 200) {
        dispatch({ type: 'UPDATE_SELLER_SUCCESS', payload: data.data });
        // Considera añadir un toast.success aquí también para consistencia si lo deseas
        // toast.success('Datos del comercio actualizados correctamente.');
        return true;
      } else {
        dispatch({
          type: 'UPDATE_SELLER_FAILURE',
          payload: data.error || "Error al actualizar los datos del comercio",
        });
        toast.error(data.error || "Error al actualizar los datos del comercio."); // Ya tienes toast de error
        return false;
      }
    } catch (error) {
      dispatch({ type: 'UPDATE_SELLER_FAILURE', payload: error.message });
      toast.error(error.message || "Ha ocurrido un error inesperado."); // Ya tienes toast de error
      return false;
    }
  };
  
  export const sendInvoice = (invoiceData) => async (dispatch) => {
    dispatch({ type: 'SEND_INVOICE_REQUEST' });
    try {
      console.log("invoiceData:", JSON.stringify(invoiceData, null, 2));
    
      const response = await api.post(`/taxxa/sendInvoice`, invoiceData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    
      dispatch({ type: 'SEND_INVOICE_SUCCESS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error("Error al enviar la factura:", error);
    
      const errorData = error.response?.data;
      let errorMessage = "Error al enviar la factura";
      let shouldResend = true;
    
      if (errorData && errorData.rerror) {
        if (errorData.rerror === 1262 || errorData.rerror === 1236) {
          shouldResend = false;
          errorMessage = `Error al enviar la factura: Contingencia activada (rerror: ${errorData.rerror}). No es necesario reenviar la factura.`;
        } else if (errorData.smessage?.string) {
          const errorMessages = Object.values(errorData.smessage.string);
          errorMessage = errorMessages.join('\n');
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
    
      dispatch({ type: 'SEND_INVOICE_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
    
      if (shouldResend) {
        throw new Error(errorMessage);
      }
    }
  };

  export const createBuyer = (buyerData) => {
    return async (dispatch) => {
        dispatch({ type: 'CREATE_BUYER_REQUEST' });
        
        try {
            console.log('Enviando datos del comprador:', buyerData);
            
            const response = await api.post('/taxxa/buyer', buyerData);
            console.log('Respuesta del servidor:', response.data);
            
            if (response.data.error) {
                dispatch({
                    type: 'CREATE_BUYER_FAILURE',
                    payload: response.data.message
                });
                toast.error(response.data.message);
                // Retornamos el error en lugar de lanzar una excepción.
                return { error: true, message: response.data.message };
            }
  
            dispatch({
                type: 'CREATE_BUYER_SUCCESS',
                payload: response.data.data
            });
            toast.success('Buyer creado exitosamente');
  
            return response.data;
            
        } catch (error) {
            console.error('Error creando buyer:', error);
            dispatch({
                type: 'CREATE_BUYER_FAILURE',
                payload: error.message
            });
            toast.error(error.message);
            // Retornamos un objeto de error en lugar de lanzar el error
            return { success: false, message: error.message };
        }
    };
};

export const fetchCountries = () => async (dispatch, getState) => {
  // Verificar si ya están en cache
  const { countries } = getState().taxxa;
  if (countries && countries.length > 0) {
    return countries; // Retornar desde cache
  }

  dispatch({ type: 'FETCH_COUNTRIES_REQUEST' });

  try {
    const response = await api.get('/taxxa/dian/countries');
    const data = response.data;

    if (data && !data.error && data.data) {
      dispatch({ type: 'FETCH_COUNTRIES_SUCCESS', payload: data.data });
      return data.data;
    } else {
      const errorMsg = "Error al obtener países";
      dispatch({ type: 'FETCH_COUNTRIES_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = error.message || "Error al obtener países";
    dispatch({ type: 'FETCH_COUNTRIES_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return [];
  }
};

// 🏛️ Obtener departamentos
export const fetchDepartments = (countryCode = 'CO') => async (dispatch, getState) => {
  // Cache key específico por país
  const cacheKey = `departments_${countryCode}`;
  const { departmentsCache } = getState().taxxa;
  
  if (departmentsCache && departmentsCache[cacheKey]) {
    return departmentsCache[cacheKey];
  }

  dispatch({ type: 'FETCH_DEPARTMENTS_REQUEST' });

  try {
    const response = await api.get(`/taxxa/dian/departments?countryCode=${countryCode}`);
    const data = response.data;

    if (data && !data.error && data.data) {
      dispatch({ 
        type: 'FETCH_DEPARTMENTS_SUCCESS', 
        payload: { 
          departments: data.data, 
          countryCode,
          cacheKey 
        } 
      });
      return data.data;
    } else {
      const errorMsg = "Error al obtener departamentos";
      dispatch({ type: 'FETCH_DEPARTMENTS_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = error.message || "Error al obtener departamentos";
    dispatch({ type: 'FETCH_DEPARTMENTS_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return [];
  }
};

// 🏙️ Obtener municipios
export const fetchMunicipalities = (departmentCode, options = {}) => async (dispatch, getState) => {
  const { search = '', limit = 50 } = options;
  
  // Cache key más específico
  const cacheKey = `municipalities_${departmentCode}_${search}_${limit}`;
  const { municipalitiesCache } = getState().taxxa;
  
  if (municipalitiesCache && municipalitiesCache[cacheKey]) {
    return municipalitiesCache[cacheKey];
  }

  dispatch({ type: 'FETCH_MUNICIPALITIES_REQUEST' });

  try {
    let url = `/taxxa/dian/municipalities?departmentCode=${departmentCode}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    if (data && !data.error && data.data) {
      dispatch({ 
        type: 'FETCH_MUNICIPALITIES_SUCCESS', 
        payload: { 
          municipalities: data.data, 
          departmentCode,
          search,
          limit,
          cacheKey,
          total: data.total,
          showing: data.showing
        } 
      });
      return data.data;
    } else {
      const errorMsg = "Error al obtener municipios";
      dispatch({ type: 'FETCH_MUNICIPALITIES_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return [];
    }
  } catch (error) {
    const errorMsg = error.message || "Error al obtener municipios";
    dispatch({ type: 'FETCH_MUNICIPALITIES_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return [];
  }
};

// 🔍 Validar ubicación
export const validateLocation = (locationData) => async (dispatch) => {
  dispatch({ type: 'VALIDATE_LOCATION_REQUEST' });

  try {
    const response = await api.post('/taxxa/dian/validate-location', locationData);
    const data = response.data;

    if (data && !data.error) {
      dispatch({ type: 'VALIDATE_LOCATION_SUCCESS', payload: data.data });
      
      if (!data.data.isValid) {
        toast.warning(`Ubicación inválida: ${data.data.errors.join(', ')}`);
      }
      
      return data.data;
    } else {
      const errorMsg = "Error al validar ubicación";
      dispatch({ type: 'VALIDATE_LOCATION_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return { isValid: false, errors: [errorMsg] };
    }
  } catch (error) {
    const errorMsg = error.message || "Error al validar ubicación";
    dispatch({ type: 'VALIDATE_LOCATION_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return { isValid: false, errors: [errorMsg] };
  }
};

// 🔍 Buscar municipios (con debounce en el componente)
export const searchMunicipalities = (searchTerm, departmentCode = null) => async (dispatch) => {
  if (!searchTerm || searchTerm.length < 2) {
    dispatch({ type: 'CLEAR_MUNICIPALITY_SEARCH' });
    return [];
  }

  dispatch({ type: 'SEARCH_MUNICIPALITIES_REQUEST' });

  try {
    let url = `/taxxa/dian/municipalities?search=${encodeURIComponent(searchTerm)}&limit=20`;
    if (departmentCode) {
      url += `&departmentCode=${departmentCode}`;
    }

    const response = await api.get(url);
    const data = response.data;

    if (data && !data.error && data.data) {
      dispatch({ 
        type: 'SEARCH_MUNICIPALITIES_SUCCESS', 
        payload: {
          searchResults: data.data,
          searchTerm,
          departmentCode
        }
      });
      return data.data;
    } else {
      dispatch({ type: 'SEARCH_MUNICIPALITIES_FAILURE', payload: "Error en búsqueda" });
      return [];
    }
  } catch (error) {
    const errorMsg = error.message || "Error buscando municipios";
    dispatch({ type: 'SEARCH_MUNICIPALITIES_FAILURE', payload: errorMsg });
    return [];
  }
};

// 🗑️ Limpiar cache de catálogos (útil para actualizar datos)
export const clearDianCache = () => (dispatch) => {
  dispatch({ type: 'CLEAR_DIAN_CACHE' });
  toast.info('Cache de catálogos DIAN limpiado');
};