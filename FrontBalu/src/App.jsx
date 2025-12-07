import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { login } from "./Redux/Actions/authActions";
import PrivateRoute from "./Components/PrivateRoute";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

// Importa tus componentes
import Login from "./Components/Auth/Login";
import Register from "./Components/Auth/Register";
import TokenValidator from "./Components/Auth/TokenValidator";
import Dashboard from "./Components/Dashboard/Dashboard";
import RoomsSection from "./Components/Rooms/RoomsSection";
import NotFound from "./Components/NotFound";
import Unauthorized from "./Components/Auth/Unauthorized";
import Landing from "./Components/Landing";
import ServiceManagement from "./Components/Dashboard/ServiceManagement";
import CreateRoom from "./Components/Dashboard/CreateRoom";
import RoomList from "./Components/Dashboard/RoomList";
import Navbar from "./Components/Navbar";
import RoomDetail from "./Components/Rooms/RoomDetail";
import Booking from "./Components/Booking/Booking";
import CheckIn from "./Components/CheckIn-CheckOut/CheckIn";
import PurchaseList from "./Components/Purchases/PurchaseList";
import PurchaseForm from "./Components/Purchases/PurchaseForm";
import PurchaseDetail from "./Components/Purchases/PurchaseDetail";
import BookingStatusPage from "./Components/Booking/BookingStatusPage";
import RoomAvailability from "./Components/Rooms/RoomAvailability";
import HotelSetting from "./Components/Dashboard/HotelSetting";
import CreateItems from "./Components/Dashboard/CreateItems";
import ManageItems from "./Components/Dashboard/ManageItems";
import RegistrationPass from "./Components/Dashboard/Registration";
import RoomDetailCheck from "./Components/Dashboard/RoomDetailCheck";
import LocalBookingForm from "./Components/Booking/LocalBookingForm";
import CheckOut from "./Components/CheckOut/CheckOut";
import ThankYouPage from "./Components/ThankYouPage";
import BookingPassengerList from "./Components/Dashboard/BookingPassengerList";
import PurchasePanel from "./Components/Purchases/PurchasePanel";
import ExpenseForm from "./Components/Purchases/ExpensesForm";
import ExpensesList from "./Components/Purchases/ExpensesList";
import FinancialBalance from "./Components/Dashboard/FinancialBalance";
import FacturasPendientes from "./Components/Taxxa/FacturasPendientes";
import PanelTaxxa from "./Components/Taxxa/PanelTaxxa";
import InvoiceList from "./Components/Taxxa/InvoiceList";
import ConfiguracionHotel from "./Components/Dashboard/ConfiguracionHotel";
import CompletedBookings from "./Components/CheckOut/CompletedBookings";
import FacturaManual from "./Components/Taxxa/FacturaManual";
import VoucherManager from "./Components/Booking/VoucherManager";
import RoomStatusDashboard from "./Components/Dashboard/RoomStatusDashboard"; // ⭐ NUEVO: Dashboard de habitaciones con gestión de turnos
import ShiftReminder from "./Components/Dashboard/ShiftReminder"; // ⭐ NUEVO: Recordatorio de turno para recepcionistas

const AppContent = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    // Define las rutas públicas que no requieren autenticación
    const publicPaths = [
      "/",
      "/booking",
      "/booking-status",
      "/RoomsSection",
      "/room",
      "/login",
      "/buyerForm",
      "/registro-comprador",
      "/unauthorized",
    ];

    // Si la ruta actual es pública, omite la verificación de token
    if (publicPaths.some((path) => location.pathname.startsWith(path))) {
      return;
    }

    // Verificar si hay un token guardado al iniciar la app
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Verificar que el token no haya expirado (exp en segundos)
        if (decoded.exp * 1000 < Date.now()) {
          console.log("El token ha expirado");
        } else {
          const user = JSON.parse(localStorage.getItem("user"));
          if (user) {
            dispatch(login({ token, user }));
          }
        }
      } catch (error) {
        console.error("Error decodificando el token:", error);
      }
    }
  }, [dispatch, location]);

  return (
    <>
      <ToastContainer />
      <TokenValidator /> {/* ⭐ NUEVO: Validador de token automático */}
      <ShiftReminder /> {/* ⭐ NUEVO: Recordatorio de turno para recepcionistas */}
      <Navbar />
      <div className="pt-16">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Landing />} />
          <Route
            path="/booking-status/:trackingToken"
            element={<BookingStatusPage />}
          />
          <Route path="/RoomsSection" element={<RoomsSection />} />
          <Route path="/room/:roomNumber" element={<RoomDetail />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/thankyou" element={<ThankYouPage />} />
          {/* <Route path="/buyerForm" element={<BuyerRegistrationForm />} />
          <Route path="/registro-comprador" element={<ParentBuyerRegistration />} /> */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <ServiceManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/create-room"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <CreateRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/CheckIn"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <CheckIn />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/PassengerList/:bookingId?"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <BookingPassengerList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/CheckOut"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <CheckOut />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/completas"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <CompletedBookings />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <RoomList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/rooms-dashboard"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <RoomStatusDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/localBooking"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <LocalBookingForm />
              </PrivateRoute>
            }
          />
          {/* <Route
            path="/admin/pendientesFactura"
            element={
              <PrivateRoute allowedRoles={['owner', 'admin']}>
                <BookingsPendientes />
              </PrivateRoute>
            }
          /> */}
          <Route
            path="/bookings/availability"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <RoomAvailability />
              </PrivateRoute>
            }
          />

          <Route
            path="/panelConfiguracion"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <ConfiguracionHotel />
              </PrivateRoute>
            }
          />
          <Route
            path="/hotelSetting"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <HotelSetting />
              </PrivateRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <Register />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <CreateItems />
              </PrivateRoute>
            }
          />
          <Route
            path="/allItems"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <ManageItems />
              </PrivateRoute>
            }
          />
          <Route
            path="/registerPass"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <RegistrationPass />
              </PrivateRoute>
            }
          />
          <Route
            path="/roomCheck"
            element={
              <PrivateRoute allowedRoles={["owner", "admin", "recept"]}>
                <RoomDetailCheck />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchasePanel"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <PurchasePanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/purchaseForm"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <PurchaseForm />
              </PrivateRoute>
            }
          />

          <Route
            path="/purchaseList"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <PurchaseList />
              </PrivateRoute>
            }
          />

          <Route
            path="/pendientInvoices"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <FacturasPendientes />
              </PrivateRoute>
            }
          />

           <Route
            path="/vouchers"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <VoucherManager />
              </PrivateRoute>
            }
          />

          <Route
            path="/invoiceList"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <InvoiceList />
              </PrivateRoute>
            }
          />

          <Route
            path="/facturaManual"
            element={
              <PrivateRoute allowedRoles={["owner", "admin"]}>
                <FacturaManual />
              </PrivateRoute>
            }
          />

          <Route
            path="/purchases/:id"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <PurchaseDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="panelTaxxa"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <PanelTaxxa />
              </PrivateRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <ExpenseForm />
              </PrivateRoute>
            }
          />

          <Route
            path="/expensesList"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <ExpensesList />
              </PrivateRoute>
            }
          />
          <Route
            path="/expensesList"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <ExpensesList />
              </PrivateRoute>
            }
          />
          <Route
            path="/balance"
            element={
              <PrivateRoute allowedRoles={["owner"]}>
                <FinancialBalance />
              </PrivateRoute>
            }
          />

          {/* Ruta por defecto para 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
