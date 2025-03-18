import api from '../../utils/axios';
import { toast } from 'react-toastify';

export const fetchBuyerByDocument = (sdocno) => async (dispatch) => {
    dispatch({ type: 'FETCH_BUYER_REQUEST' });
  
    try {
      const response = await api.get(`/taxxa/buyer/${sdocno}`);
      const data = await response.json();
      console.log(data);
  
      if (data && data.message) {
        dispatch({ type: 'FETCH_BUYER_SUCCESS', payload: data.message });
      } else {
        dispatch({ type: 'FETCH_BUYER_FAILURE', payload: "Usuario no encontrado" });
      }
    } catch (error) {
      dispatch({ type: 'FETCH_BUYER_FAILURE', payload: error.message });
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
      const response = await api.post(`/seller/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellerData),
      });
      const data = await response.json();
    
      if (response.ok) {
        dispatch({ type: 'CREATE_SELLER_SUCCESS', payload: data.data });
        toast.success('Datos del comercio creados correctamente.');
      } else {
        dispatch({
          type: 'CREATE_SELLER_FAILURE',
          payload: data.error || "Error al crear los datos del comercio",
        });
        toast.error(data.error || "Error al crear los datos del comercio.");
      }
    } catch (error) {
      dispatch({ type: 'CREATE_SELLER_FAILURE', payload: error.message });
      toast.error(error.message || "Ha ocurrido un error inesperado.");
    }
  };
  
  export const updateSellerData = (n_document, sellerData) => async (dispatch) => {
    dispatch({ type: 'UPDATE_SELLER_REQUEST' });
  
    try {
      const response = await api.put(`/seller/${n_document}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellerData),
      });
      const data = await response.json();
  
      if (response.ok) {
        dispatch({ type: 'UPDATE_SELLER_SUCCESS', payload: data.data });
        return true; // Retorna éxito
      } else {
        dispatch({
          type: 'UPDATE_SELLER_FAILURE',
          payload: data.error || "Error al actualizar los datos del comercio",
        });
        return false; // Retorna fallo
      }
    } catch (error) {
      dispatch({ type: 'UPDATE_SELLER_FAILURE', payload: error.message });
      return false; // Retorna fallo
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