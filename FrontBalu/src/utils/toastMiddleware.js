import { toast } from 'react-toastify';

// Este middleware detecta acciones que terminen en "SUCCESS" o "FAILURE"
// y lanza un toast con el mensaje, si existe.
const toastMiddleware = () => (next) => (action) => {
  // Si la acción es de éxito y tiene 'message' en payload, mostrar toast de éxito.
  if (action.type.endsWith('SUCCESS') && action.payload?.message) {
    toast.success(action.payload.message);
  }
  // Si la acción es de fallo y tiene mensaje en payload, mostrar toast de error.
  if (action.type.endsWith('FAILURE') && action.payload) {
    toast.error(action.payload);
  }
  return next(action);
};

export default toastMiddleware;