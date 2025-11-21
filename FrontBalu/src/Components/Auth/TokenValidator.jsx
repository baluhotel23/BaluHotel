import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTokenExpired } from '../utils/tokenManager';

const TokenValidator = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ⭐ VERIFICACIÓN SIMPLIFICADA - El refresh automático se maneja en axios
    // Solo verificamos si no hay tokens al iniciar
    const checkInitialAuth = () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Si no hay ningún token, verificar si estamos en ruta pública
      if (!token && !refreshToken) {
        const publicRoutes = ['/login', '/register', '/', '/booking', '/RoomsSection'];
        const isPublicRoute = publicRoutes.some(route => 
          window.location.pathname.startsWith(route)
        );
        
        if (!isPublicRoute) {
          console.warn('⚠️ [TOKEN-VALIDATOR] No hay tokens - redirigiendo al login');
          navigate('/login', { replace: true });
        }
        return;
      }

      // Si hay token pero está expirado, verificar que haya refresh token
      if (token && isTokenExpired() && !refreshToken) {
        console.warn('⚠️ [TOKEN-VALIDATOR] Token expirado sin refresh token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
      }
    };

    checkInitialAuth();
  }, [navigate]);

  // Este componente no renderiza nada
  return null;
};

export default TokenValidator;
