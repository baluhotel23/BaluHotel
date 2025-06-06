import api from '../../utils/axios';
import { toast } from 'react-toastify';

export const registerLocalPaymentRequest = () => ({
  type: 'REGISTER_LOCAL_PAYMENT_REQUEST',
});

export const registerLocalPaymentSuccess = (payment) => ({
  type: 'REGISTER_LOCAL_PAYMENT_SUCCESS',
  payload: payment,
});

export const registerLocalPaymentFailure = (error) => ({
  type: 'REGISTER_LOCAL_PAYMENT_FAILURE',
  payload: error,
});

// Async action to register a local payment
export const registerLocalPayment = (paymentData) => {
  return async (dispatch) => {
    dispatch(registerLocalPaymentRequest());
    try {
      const response = await api.post('/admin/paymentLocal', paymentData);
      dispatch(registerLocalPaymentSuccess(response.data));
      toast.success('Pago local registrado exitosamente');
      
      // ⭐ RETORNAR EL RESULTADO PARA QUE EL COMPONENTE LO PUEDA USAR
      return {
        success: true,
        data: response.data,
        message: 'Pago registrado exitosamente'
      };
    } catch (error) {
      const errorMessage = error.response ? error.response.data.message : 'Error al registrar el pago local';
      dispatch(registerLocalPaymentFailure(error.response ? error.response.data : error));
      toast.error(errorMessage);
      
      // ⭐ RETORNAR ERROR TAMBIÉN
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };
};