import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const PrivateRoute = ({ children, allowedRoles, requiredRole }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  // ⭐ Debug mejorado (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && user) {
    console.log('🔐 [PRIVATE-ROUTE] Debug:', {
      userRole: user.role,
      isAuthenticated,
      allowedRoles,
      requiredRole,
      path: location.pathname
    });
  }

  // ✅ Verificar autenticación
  if (!isAuthenticated) {
    console.log('❌ [PRIVATE-ROUTE] No autenticado, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ Verificar usuario existe
  if (!user) {
    console.log('❌ [PRIVATE-ROUTE] Usuario no encontrado en estado');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ Verificar rol específico requerido
  if (requiredRole && user.role !== requiredRole) {
    console.log(`❌ [PRIVATE-ROUTE] Rol requerido: ${requiredRole}, usuario tiene: ${user.role}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Verificar roles permitidos (array)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log(`❌ [PRIVATE-ROUTE] Rol no permitido. Usuario: ${user.role}, Permitidos: ${allowedRoles.join(', ')}`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log(`✅ [PRIVATE-ROUTE] Acceso permitido para rol: ${user.role}`);
  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requiredRole: PropTypes.string
};

export default PrivateRoute;
