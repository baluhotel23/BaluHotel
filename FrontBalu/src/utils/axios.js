import axios from 'axios';
import { toast } from 'react-toastify';

// Crear instancia de axios con la URL base
const api = axios.create({
  baseURL: 'https://baluhotel-production.up.railway.app/',
  timeout: 18000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ⭐ VARIABLE PARA EVITAR MÚLTIPLES REFRESH SIMULTÁNEOS
let isRefreshing = false;
let refreshSubscribers = [];

// ⭐ FUNCIÓN PARA NOTIFICAR A LOS SUSCRIPTORES CUANDO EL TOKEN SE RENUEVE
const onRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

// ⭐ FUNCIÓN PARA AGREGAR SUSCRIPTORES
const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// ⭐ INTERCEPTOR DE REQUESTS - ÚNICO Y CORREGIDO
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔑 [AXIOS] Token enviado:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    
    if (token) {
      // ⭐ USAR "Authorization" con mayúscula
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('📤 [AXIOS] Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ [AXIOS] Request error:', error);
    return Promise.reject(error);
  }
);

// ⭐ INTERCEPTOR DE RESPONSES CON MANEJO DE TOKEN EXPIRADO Y REFRESH AUTOMÁTICO
api.interceptors.response.use(
  (response) => {
    console.log('📨 [AXIOS] Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('❌ [AXIOS] Response error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    });

    // ⭐ MANEJAR TOKEN EXPIRADO CON REFRESH AUTOMÁTICO
    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      const errorCode = error.response?.data?.code;
      
      // Si el error es por token expirado
      if (errorCode === 'TOKEN_EXPIRED' || 
          (errorMessage.includes('token') && 
           (errorMessage.includes('expirado') || errorMessage.includes('expired')))) {
        
        console.warn('⚠️ [AXIOS] Token expirado - intentando renovar...');

        // Si no está el refresh token, redirigir al login
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.error('❌ [AXIOS] No hay refresh token - redirigiendo al login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Marcar que estamos reintentando
        originalRequest._retry = true;

        // Si ya estamos renovando el token, agregar a la cola
        if (isRefreshing) {
          return new Promise((resolve) => {
            addRefreshSubscriber((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }

        isRefreshing = true;

        try {
          // Intentar renovar el token
          const response = await axios.post(
            'https://baluhotel-production.up.railway.app/auth/refresh-token',
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const { token: newToken } = response.data.data;

          console.log('✅ [AXIOS] Token renovado exitosamente');

          // Guardar nuevo token
          localStorage.setItem('token', newToken);

          // Notificar a los suscriptores
          onRefreshed(newToken);

          // Reintentar la petición original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          isRefreshing = false;

          return api(originalRequest);

        } catch (refreshError) {
          console.error('❌ [AXIOS] Error al renovar token:', refreshError);
          
          isRefreshing = false;
          
          // Limpiar tokens
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Mostrar mensaje y redirigir
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        }
      }
    }

    // ⭐ MANEJO GLOBAL DE 403 (NO AUTORIZADO) - Mejor práctica: mostrar mensaje y no redirigir de forma agresiva
    if (error.response?.status === 403) {
      const msg = error.response?.data?.message || 'No estás autorizado para realizar esta acción';
      try {
        toast.error(msg);
      } catch (e) {
        // Si el toast falla por alguna razón, no queremos romper la app
        console.error('Error mostrando toast para 403:', e);
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;