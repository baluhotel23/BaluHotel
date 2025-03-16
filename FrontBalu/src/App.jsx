import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import * as jwtDecode from 'jwt-decode';
import { login } from './Redux/Actions/authActions';
import PrivateRoute from './Components/PrivateRoute';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

// Importa tus componentes
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import Dashboard from './Components/Dashboard/Dashboard';
import RoomsSection from './Components/Rooms/RoomsSection';
import NotFound from './Components/NotFound';
import Unauthorized from './Components/Auth/Unauthorized';
import Landing from './Components/Landing';
import ServiceManagement from './Components/Dashboard/ServiceManagement';
import CreateRoom from './Components/Dashboard/CreateRoom';
import RoomList from './Components/Dashboard/RoomList';
import Navbar from './Components/Navbar';
import RoomDetail from './Components/Rooms/RoomDetail';
import Booking from './Components/Booking/Booking';
import BookingsPendientes from './Components/Taxxa/BookingsPendientes';
import BuyerRegistrationForm from './Components/Taxxa/BuyerRegistrationForm';
import ParentBuyerRegistration from './Components/Taxxa/ParentBuyerRegistration';


function App() {
  const dispatch = useDispatch();
 



  useEffect(() => {
    // Verificar si hay un token guardado al iniciar la app
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Verificar que el token no haya expirado (exp en segundos)
        if (decoded.exp * 1000 < Date.now()) {
          // Token expirado, puedes limpiar la sesión o redirigir
          console.log('El token ha expirado');
        } else {
          const user = JSON.parse(localStorage.getItem('user'));
          if (user) {
            dispatch(login({ token, user }));
          }
        }
      } catch (error) {
        console.error('Error decodificando el token:', error);
      }
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <ToastContainer />
       <Navbar />
       <div className="pt-16"> {/* Agregar margen superior para evitar superposición */}
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/RoomsSection" element={<RoomsSection />} />
        <Route path="/room/:roomNumber" element={<RoomDetail />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/buyerForm" element={<BuyerRegistrationForm />} />
        <Route path="/registro-comprador" element={<ParentBuyerRegistration />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['owner', 'admin']}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <PrivateRoute allowedRoles={['owner', 'admin']}>
              <ServiceManagement />
            </PrivateRoute>
          }
        />
           <Route
          path="/admin/create-room"
          element={
            <PrivateRoute allowedRoles={['owner', 'admin']}>
              <CreateRoom />
            </PrivateRoute>
          }
        />
              <Route
          path="/admin/rooms"
          element={
            <PrivateRoute allowedRoles={['owner', 'admin']}>
              <RoomList />
            </PrivateRoute>
          }
        />

<Route
          path="/admin/pendientesFactura"
          element={
            <PrivateRoute allowedRoles={['owner', 'admin']}>
              <BookingsPendientes />
            </PrivateRoute>
          }
        />


        

        {/* Ruta por defecto para 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;