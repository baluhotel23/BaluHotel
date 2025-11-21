import { jwtDecode } from 'jwt-decode';

/**
 * Verifica si el token está próximo a expirar (menos de 1 hora)
 */
export const isTokenExpiringSoon = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Tiempo actual en segundos
    const expirationTime = decoded.exp;
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Si faltan menos de 1 hora (3600 segundos)
    return timeUntilExpiry < 3600;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return false;
  }
};

/**
 * Verifica si el token ya expiró
 */
export const isTokenExpired = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return true;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return true;
  }
};

/**
 * Obtiene el tiempo restante hasta que expire el token (en minutos)
 */
export const getTokenTimeRemaining = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return 0;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const timeRemaining = decoded.exp - currentTime;
    return Math.floor(timeRemaining / 60); // Retornar en minutos
  } catch (error) {
    console.error('Error al decodificar token:', error);
    return 0;
  }
};

/**
 * Limpia el token y redirige al login
 */
export const handleTokenExpiration = () => {
  console.warn('⚠️ [TOKEN-MANAGER] Token expirado - limpiando sesión');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
