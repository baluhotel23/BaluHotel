import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  // Debug: mostrar role del usuario si existe
  if (user) {
    console.log('Rol del usuario logueado:', user.role);
  }

  if (!isAuthenticated) {
    // Redirigir a login si no está autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica que user exista y que su rol esté permitido
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    // Redirigir a unauthorized si no tiene el rol necesario
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

export default PrivateRoute;
