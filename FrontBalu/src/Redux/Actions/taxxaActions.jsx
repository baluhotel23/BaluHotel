import api from '../../utils/axios';
import { toast } from 'react-toastify';

// 🔍 OBTENER BUYER POR DOCUMENTO
export const fetchBuyerByDocument = (sdocno) => async (dispatch) => {
  dispatch({ type: 'FETCH_BUYER_REQUEST' });

  try {
    const response = await api.get(`/taxxa/buyer/${sdocno}`);
    const data = response.data;
    console.log('📥 [BUYER] Respuesta recibida:', data);

    if (data && !data.error && data.data) {
      dispatch({ type: 'FETCH_BUYER_SUCCESS', payload: data.data });
      return data.data;
    } else {
      const errorMsg = data.message || "Usuario no encontrado";
      dispatch({ type: 'FETCH_BUYER_FAILURE', payload: errorMsg });
      toast.error("Complete los datos del usuario");
      return null;
    }
  } catch (error) {
    let errorMsg = error.message;
    if (error.response && error.response.status === 404) {
      errorMsg = "Complete los datos del usuario";
    }
    dispatch({ type: 'FETCH_BUYER_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return null;
  }
};

// 🔍 OBTENER SELLER DATA POR NIT
export const fetchSellerData = (sdocno) => async (dispatch) => {
  dispatch({ type: 'FETCH_SELLER_REQUEST' });

  try {
    console.log('🔍 [SELLER] Obteniendo datos del seller:', sdocno);
    
    const response = await api.get(`/taxxa/sellerData/${sdocno}`);
    const data = response.data;

    if (response.status === 200 && !data.error && data.data) {
      dispatch({ 
        type: 'FETCH_SELLER_SUCCESS', 
        payload: data.data 
      });
      
      console.log('✅ [SELLER] Datos obtenidos:', data.data.scostumername);
      return data.data;
    } else {
      const errorMsg = data.message || "Datos del hotel no encontrados";
      
      dispatch({ 
        type: 'FETCH_SELLER_FAILURE', 
        payload: errorMsg 
      });
      
      console.warn('⚠️ [SELLER] No encontrado:', errorMsg);
      return null;
    }
  } catch (error) {
    console.error('❌ [SELLER] Error en fetchSellerData:', error);
    
    const errorMsg = error.response?.status === 404 
      ? "Datos del hotel no encontrados"
      : error.response?.data?.message || error.message || "Error al obtener datos del hotel";
    
    dispatch({ 
      type: 'FETCH_SELLER_FAILURE', 
      payload: errorMsg 
    });
    
    // No mostrar toast para 404, es normal si no existe
    if (error.response?.status !== 404) {
      toast.error(errorMsg);
    }
    
    return null;
  }
};

// 🆕 CREAR SELLER DATA
export const createSellerData = (sellerData) => async (dispatch) => {
  dispatch({ type: 'CREATE_SELLER_REQUEST' });

  try {
    console.log('📤 [SELLER] Enviando datos:', sellerData);
    
    const response = await api.post('/taxxa/sellerData', sellerData);
    const data = response.data;

    console.log('📥 [SELLER] Respuesta recibida:', data);

    if (response.status === 201 || response.status === 200) {
      dispatch({ 
        type: 'CREATE_SELLER_SUCCESS', 
        payload: data.data 
      });
      
      const successMessage = response.status === 201 
        ? 'Datos del hotel creados correctamente para Taxxa'
        : 'Datos del hotel actualizados correctamente para Taxxa';
        
      toast.success(successMessage);
      console.log('✅ [SELLER] Procesado exitosamente');
      
      return data.data;
    } else {
      const errorMessage = data.message || "Error al configurar datos del hotel";
      
      dispatch({
        type: 'CREATE_SELLER_FAILURE',
        payload: errorMessage,
      });
      
      toast.error(errorMessage);
      console.error('❌ [SELLER] Error en respuesta:', errorMessage);
      
      return false;
    }
  } catch (error) {
    console.error('❌ [SELLER] Error en createSellerData:', error);
    
    const errorMsg = error.response?.data?.message || 
                     (Array.isArray(error.response?.data?.details) 
                       ? error.response.data.details.join(', ') 
                       : error.response?.data?.details) ||
                     error.message || 
                     "Error inesperado al configurar Taxxa";
    
    dispatch({ 
      type: 'CREATE_SELLER_FAILURE', 
      payload: errorMsg 
    });
    
    toast.error(errorMsg);
    return false;
  }
};

// 📝 ACTUALIZAR SELLER DATA
export const updateSellerData = (sdocno, sellerData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_SELLER_REQUEST' });

  try {
    console.log('📝 [SELLER] Actualizando:', sdocno, sellerData);
    
    const response = await api.put(`/taxxa/sellerData/${sdocno}`, sellerData);
    const data = response.data;

    if (response.status === 200 && !data.error) {
      dispatch({ 
        type: 'UPDATE_SELLER_SUCCESS', 
        payload: data.data 
      });
      
      toast.success('Datos del hotel actualizados correctamente');
      console.log('✅ [SELLER] Actualizado exitosamente');
      
      return data.data;
    } else {
      const errorMessage = data.message || "Error al actualizar los datos del hotel";
      
      dispatch({
        type: 'UPDATE_SELLER_FAILURE',
        payload: errorMessage,
      });
      
      toast.error(errorMessage);
      console.error('❌ [SELLER] Error en actualización:', errorMessage);
      
      return false;
    }
  } catch (error) {
    console.error('❌ [SELLER] Error en updateSellerData:', error);
    
    const errorMsg = error.response?.data?.message || 
                     (Array.isArray(error.response?.data?.details) 
                       ? error.response.data.details.join(', ') 
                       : error.response?.data?.details) ||
                     error.message || 
                     "Error inesperado al actualizar datos del hotel";
    
    dispatch({ 
      type: 'UPDATE_SELLER_FAILURE', 
      payload: errorMsg 
    });
    
    toast.error(errorMsg);
    return false;
  }
};

// 📧 ENVIAR FACTURA
// 📧 ENVIAR FACTURA - CORREGIDA
export const sendInvoice = (invoiceData) => async (dispatch) => {
  dispatch({ type: 'SEND_INVOICE_REQUEST' });
  
  try {
    console.log('📧 [INVOICE] Enviando factura:', JSON.stringify(invoiceData, null, 2));
  
    // 🔧 USAR EL ENDPOINT CORRECTO PARA FACTURAS DE BILLS
    const response = await api.post(`/taxxa/invoice`, invoiceData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    console.log('✅ [INVOICE] Respuesta exitosa:', response.data);
    
    dispatch({ type: 'SEND_INVOICE_SUCCESS', payload: response.data });
    toast.success('Factura enviada a Taxxa exitosamente');
    
    return {
      success: true,
      data: response.data,
      invoice: response.data.data // Invoice creada
    };
    
  } catch (error) {
    console.error('❌ [INVOICE] Error al enviar factura:', error);
  
    const errorData = error.response?.data;
    let errorMessage = "Error al enviar la factura";
    
    if (errorData && errorData.rerror) {
      if (errorData.rerror === 1262 || errorData.rerror === 1236) {
        errorMessage = `Contingencia activada (rerror: ${errorData.rerror}). Factura procesada pero con advertencia.`;
        toast.warning(errorMessage);
        
        // 🔧 CONTINGENCIA NO ES ERROR TOTAL
        dispatch({ type: 'SEND_INVOICE_SUCCESS', payload: { 
          ...errorData, 
          isContingency: true 
        }});
        
        return {
          success: true,
          data: errorData,
          isContingency: true
        };
      } else if (errorData.smessage?.string) {
        const errorMessages = Object.values(errorData.smessage.string);
        errorMessage = errorMessages.join('\n');
      }
    }
  
    dispatch({ type: 'SEND_INVOICE_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
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

// 🆕 ACTUALIZAR BUYER
export const updateBuyer = (sdocno, buyerData) => {
  return async (dispatch) => {
    dispatch({ type: 'UPDATE_BUYER_REQUEST' });
    
    try {
      console.log('📝 Actualizando comprador:', sdocno, buyerData);
      
      const response = await api.put(`/taxxa/buyer/${sdocno}`, buyerData);
      console.log('📥 Respuesta del servidor:', response.data);
      
      if (response.data.error) {
        dispatch({
          type: 'UPDATE_BUYER_FAILURE',
          payload: response.data.message
        });
        toast.error(response.data.message);
        return { success: false, error: true, message: response.data.message };
      }

      dispatch({
        type: 'UPDATE_BUYER_SUCCESS',
        payload: response.data.data
      });
      toast.success('Huésped actualizado exitosamente');

      return { success: true, data: response.data.data };
      
    } catch (error) {
      console.error('❌ Error actualizando buyer:', error);
      const errorMsg = error.response?.data?.message || error.message;
      dispatch({
        type: 'UPDATE_BUYER_FAILURE',
        payload: errorMsg
      });
      toast.error(errorMsg);
      return { success: false, error: true, message: errorMsg };
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

// 🔍 VALIDAR UBICACIÓN
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

// 🔍 BUSCAR MUNICIPIOS
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

// ✅ VALIDAR CONFIGURACIÓN TAXXA
export const validateTaxxaConfig = (sdocno) => async (dispatch) => {
  dispatch({ type: 'VALIDATE_TAXXA_REQUEST' });

  try {
    console.log('🔍 [TAXXA] Validando configuración:', sdocno);
    
    const response = await api.get(`/taxxa/sellerData/${sdocno}/validate`);
    const data = response.data;

    if (response.status === 200 && !data.error) {
      dispatch({ 
        type: 'VALIDATE_TAXXA_SUCCESS', 
        payload: data.data 
      });
      
      console.log('✅ [TAXXA] Validación completada:', data.data.isValid);
      return data.data;
    } else {
      const errorMessage = data.message || "Error al validar configuración";
      
      dispatch({
        type: 'VALIDATE_TAXXA_FAILURE',
        payload: errorMessage,
      });
      
      toast.error(errorMessage);
      return null;
    }
  } catch (error) {
    console.error('❌ [TAXXA] Error en validateTaxxaConfig:', error);
    
    const errorMsg = error.response?.data?.message || error.message || "Error al validar configuración";
    
    dispatch({ 
      type: 'VALIDATE_TAXXA_FAILURE', 
      payload: errorMsg 
    });
    
    toast.error(errorMsg);
    return null;
  }
};

// 🗑️ LIMPIAR CACHE DIAN
export const clearDianCache = () => (dispatch) => {
  dispatch({ type: 'CLEAR_DIAN_CACHE' });
  toast.info('Cache de catálogos DIAN limpiado');
};

// 🧹 LIMPIAR ERRORES
export const clearSellerErrors = () => ({
  type: 'CLEAR_SELLER_ERRORS'
});

export const clearSellerData = () => ({
  type: 'CLEAR_SELLER_DATA'
});

export const clearBuyerErrors = () => ({
  type: 'CLEAR_BUYER_ERRORS'
});

export const clearInvoiceErrors = () => ({
  type: 'CLEAR_INVOICE_ERRORS'
});

// 📋 OBTENER TODAS LAS FACTURAS FISCALES (INVOICES)
export const getAllInvoices = (queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_ALL_INVOICES_REQUEST' });
  
  try {
    const { data } = await api.get('/taxxa/invoices', { params: queryParams });
    
    dispatch({ type: 'GET_ALL_INVOICES_SUCCESS', payload: data.data });
    return data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener facturas fiscales';
    dispatch({ type: 'GET_ALL_INVOICES_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    throw error;
  }
};

// 📄 OBTENER INVOICE POR ID
export const getInvoiceById = (invoiceId) => async (dispatch) => {
  dispatch({ type: 'GET_INVOICE_BY_ID_REQUEST' });
  
  try {
    const { data } = await api.get(`/taxxa/invoices/${invoiceId}`);
    
    dispatch({ type: 'GET_INVOICE_BY_ID_SUCCESS', payload: data.data });
    return data.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener factura fiscal';
    dispatch({ type: 'GET_INVOICE_BY_ID_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    throw error;
  }
};

// 📝 CREAR NOTA DE CRÉDITO
export const createCreditNote = (creditNoteData) => async (dispatch) => {
  dispatch({ type: 'CREATE_CREDIT_NOTE_REQUEST' });
  
  try {
    console.log('📝 [CREDIT-NOTE] Creando nota de crédito:', creditNoteData);
    
    const { data } = await api.post('/taxxa/credit-note', creditNoteData);
    
    dispatch({ type: 'CREATE_CREDIT_NOTE_SUCCESS', payload: data.data });
    toast.success('Nota de crédito enviada a Taxxa exitosamente');
    
    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al crear nota de crédito';
    dispatch({ type: 'CREATE_CREDIT_NOTE_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// 📊 OBTENER ESTADÍSTICAS DE NUMERACIÓN
export const getNumberingStats = () => async (dispatch) => {
  dispatch({ type: 'GET_NUMBERING_STATS_REQUEST' });
  
  try {
    const { data } = await api.get('/taxxa/numbering-stats');
    
    dispatch({ type: 'GET_NUMBERING_STATS_SUCCESS', payload: data.data });
    return data.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener estadísticas';
    dispatch({ type: 'GET_NUMBERING_STATS_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    throw error;
  }
};

export const getManualInvoiceData = () => async (dispatch) => {
  dispatch({ type: 'GET_MANUAL_INVOICE_DATA_REQUEST' });
  
  try {
    console.log('📋 [MANUAL-INVOICE] Obteniendo datos para facturación manual...');
    
    const response = await api.get('/taxxa/manual-invoice-data');
    const data = response.data;

    if (data && data.success && data.data) {
      dispatch({ 
        type: 'GET_MANUAL_INVOICE_DATA_SUCCESS', 
        payload: data.data 
      });
      
      console.log('✅ [MANUAL-INVOICE] Datos obtenidos:', data.data);
      return data.data;
    } else {
      const errorMsg = data.message || "Error al obtener datos para facturación manual";
      dispatch({ type: 'GET_MANUAL_INVOICE_DATA_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return null;
    }
  } catch (error) {
    console.error('❌ [MANUAL-INVOICE] Error:', error);
    
    const errorMsg = error.response?.data?.message || error.message || "Error al obtener datos para facturación manual";
    dispatch({ type: 'GET_MANUAL_INVOICE_DATA_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return null;
  }
};

// 🔍 BUSCAR COMPRADOR PARA FACTURACIÓN MANUAL
export const searchBuyerForManual = (document) => async (dispatch) => {
  if (!document || document.trim().length === 0) {
    dispatch({ type: 'CLEAR_MANUAL_BUYER_SEARCH' });
    return null;
  }

  dispatch({ type: 'SEARCH_MANUAL_BUYER_REQUEST' });
  
  try {
    console.log('🔍 [MANUAL-BUYER] Buscando comprador:', document);
    
    const response = await api.get(`/taxxa/manual-buyer/${document.trim()}`);
    const data = response.data;

    if (data && data.success) {
      if (data.found && data.data) {
        dispatch({ 
          type: 'SEARCH_MANUAL_BUYER_SUCCESS', 
          payload: { 
            found: true, 
            buyer: data.data 
          } 
        });
        
        console.log('✅ [MANUAL-BUYER] Comprador encontrado:', data.data.name);
        toast.success(`Comprador encontrado: ${data.data.name}`);
        return data.data;
      } else {
        dispatch({ 
          type: 'SEARCH_MANUAL_BUYER_SUCCESS', 
          payload: { 
            found: false, 
            buyer: null 
          } 
        });
        
        console.log('ℹ️ [MANUAL-BUYER] Comprador no encontrado');
        toast.info('Comprador no encontrado, puede crear uno nuevo');
        return null;
      }
    } else {
      const errorMsg = data.message || "Error al buscar comprador";
      dispatch({ type: 'SEARCH_MANUAL_BUYER_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      return null;
    }
  } catch (error) {
    console.error('❌ [MANUAL-BUYER] Error:', error);
    
    const errorMsg = error.response?.data?.message || error.message || "Error al buscar comprador";
    dispatch({ type: 'SEARCH_MANUAL_BUYER_FAILURE', payload: errorMsg });
    toast.error(errorMsg);
    return null;
  }
};

// 📝 CREAR FACTURA MANUAL
export const createManualInvoice = (invoiceData) => async (dispatch) => {
  dispatch({ type: 'CREATE_MANUAL_INVOICE_REQUEST' });
  
  try {
    console.log('📝 [MANUAL-INVOICE] Creando factura manual:', invoiceData);
    
    const response = await api.post('/taxxa/manual-invoice', invoiceData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    if (data && data.success && data.data) {
      dispatch({ 
        type: 'CREATE_MANUAL_INVOICE_SUCCESS', 
        payload: data.data 
      });
      
      const successMsg = `Factura manual ${data.data.fullInvoiceNumber} creada y enviada a Taxxa exitosamente`;
      toast.success(successMsg);
      
      console.log('✅ [MANUAL-INVOICE] Factura creada exitosamente:', data.data.fullInvoiceNumber);
      
      return {
        success: true,
        data: data.data
      };
    } else {
      const errorMsg = data.message || "Error al crear factura manual";
      dispatch({ type: 'CREATE_MANUAL_INVOICE_FAILURE', payload: errorMsg });
      toast.error(errorMsg);
      
      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error) {
    console.error('❌ [MANUAL-INVOICE] Error:', error);
    
    const errorData = error.response?.data;
    let errorMessage = "Error al crear factura manual";
    
    if (errorData) {
      if (errorData.rerror) {
        if (errorData.rerror === 1262 || errorData.rerror === 1236) {
          errorMessage = `Contingencia activada (rerror: ${errorData.rerror}). Factura procesada pero con advertencia.`;
          toast.warning(errorMessage);
          
          dispatch({ 
            type: 'CREATE_MANUAL_INVOICE_SUCCESS', 
            payload: { 
              ...errorData, 
              isContingency: true 
            }
          });
          
          return {
            success: true,
            data: errorData,
            isContingency: true
          };
        }
      }
      
      errorMessage = errorData.message || errorData.error || errorMessage;
    }
    
    dispatch({ type: 'CREATE_MANUAL_INVOICE_FAILURE', payload: errorMessage });
    toast.error(errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// 🧹 LIMPIAR DATOS DE FACTURACIÓN MANUAL
export const clearManualInvoiceData = () => ({
  type: 'CLEAR_MANUAL_INVOICE_DATA'
});

export const clearManualBuyerSearch = () => ({
  type: 'CLEAR_MANUAL_BUYER_SEARCH'
});

// 🧹 LIMPIAR BUYER DEL ESTADO
export const clearBuyer = () => ({
  type: 'CLEAR_BUYER'
});