import axios from 'axios';

// Crear instancia de axios con la URL base
const api = axios.create({
  baseURL: 'https://baluhotel-production.up.railway.app/',
  timeout: 18000,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

// ⭐ INTERCEPTOR DE RESPONSES
api.interceptors.response.use(
  (response) => {
    console.log('📨 [AXIOS] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ [AXIOS] Response error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default api;