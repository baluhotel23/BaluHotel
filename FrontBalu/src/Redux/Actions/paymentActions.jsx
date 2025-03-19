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
      const response = await api.post('/admin/paymentLocal', paymentData); // Ajusta la ruta si es necesario
      dispatch(registerLocalPaymentSuccess(response.data));
      toast.success('Pago local registrado exitosamente'); // Muestra un toast de éxito
    } catch (error) {
      dispatch(registerLocalPaymentFailure(error.response ? error.response.data : error));
      toast.error(error.response ? error.response.data.message : 'Error al registrar el pago local'); // Muestra un toast de error
    }
  };
};