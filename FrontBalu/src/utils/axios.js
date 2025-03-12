import axios from 'axios';
import { store } from '../Redux/Store/Store';
import { logout } from '../Redux/Reducer/authReducer';

// Crear instancia de axios con la URL base
const api = axios.create({
  baseURL: 'http://localhost:3001/', // Ajusta esto a tu URL de backend
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Token enviado en header:', token);
    if (token) {
      config.headers.authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;