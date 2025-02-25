import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from './Redux/Actions/authActions';
import PrivateRoute from './Components/PrivateRoute';

// Importa tus componentes
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import Dashboard from './Components/Dashboard/Dashboard';
import Tienda from './Components/Tienda/Tienda';
import NotFound from './Components/NotFound';
import Unauthorized from './Components/Auth/Unauthorized';
import Landing from './Components/Landing';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Verificar si hay un token guardado al iniciar la app
    const token = localStorage.getItem('token');
    if (token) {
      // Si hay token, intentar restaurar la sesión
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        dispatch(loginSuccess({ token, user }));
      }
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/tienda" element={<Tienda />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['Owner']}>
              <Dashboard />
            </PrivateRoute>
          }
        />



        {/* Ruta por defecto para 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

