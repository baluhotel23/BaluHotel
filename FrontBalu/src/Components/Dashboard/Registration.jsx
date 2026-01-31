import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
import { fetchBuyerByDocument } from "../../Redux/Actions/taxxaActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout"; // ⭐ NUEVO

function Registration({ 
  bookingId, 
  existingPassengers = [], 
  guestCount = 1, 
  booking,
  onSuccess,
  onClose 
}) {
  const dispatch = useDispatch();

  const initialPassengerState = {
    name: "",
    nationality: "",
    maritalStatus: "",
    profession: "",
    stayDuration: "",
    checkInTime: "",
    numberOfPeople: "1",
    destination: "",
    idNumber: "",
    idIssuingPlace: "",
    foreignIdOrPassport: "",
    address: "",
    phoneNumber: "",
  };

  const [passengers, setPassengers] = useState([]);
  const [formData, setFormData] = useState(initialPassengerState);
  
  // ⭐ NUEVOS ESTADOS PARA VALIDACIÓN DE DNI
  const [isCheckingBuyer, setIsCheckingBuyer] = useState(false);
  const [buyerFound, setBuyerFound] = useState(false);
  const [lastCheckedIdNumber, setLastCheckedIdNumber] = useState("");

  // ⭐ OBTENER PASAJEROS YA REGISTRADOS DESDE PROPS O REDUX
  const reduxRegisteredPassengers = useSelector((state) => state.registrationPass?.registrationsByBooking?.[bookingId] || []);
  const registeredPassengers = existingPassengers.length > 0 
    ? existingPassengers 
    : reduxRegisteredPassengers;

  // Validar campos obligatorios
  const validatePassenger = (passenger) => {
    const requiredFields = ["name", "nationality", "stayDuration", "numberOfPeople", "idNumber"];
    for (const field of requiredFields) {
      if (!passenger[field]) {
        return false;
      }
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // ⭐ Si cambió el número de identificación, limpiar estado de búsqueda
    if (name === 'idNumber') {
      setBuyerFound(false);
      setLastCheckedIdNumber("");
    }
  };
  
  // ⭐ NUEVA FUNCIÓN PARA VALIDAR DNI AUTOMÁTICAMENTE
  const handleCheckBuyer = async () => {
    const idNumber = formData.idNumber?.trim();
    
    if (!idNumber || idNumber === lastCheckedIdNumber) {
      return;
    }
    
    if (idNumber.length < 6) {
      toast.warning("El número de identificación debe tener al menos 6 caracteres");
      return;
    }
    
    setIsCheckingBuyer(true);
    setLastCheckedIdNumber(idNumber);
    
    try {
      console.log('🔍 Verificando si el cliente existe:', idNumber);
      
      const buyer = await dispatch(fetchBuyerByDocument(idNumber));
      
      if (buyer) {
        console.log('✅ Cliente encontrado:', buyer);
        
        // ⭐ AUTO-COMPLETAR DATOS DEL CLIENTE
        setFormData(prev => ({
          ...prev,
          name: buyer.scostumername || prev.name,
          phoneNumber: buyer.stelephone || prev.phoneNumber,
          address: buyer.saddressline1 || prev.address,
          idIssuingPlace: buyer.scityname || prev.idIssuingPlace,
        }));
        
        setBuyerFound(true);
        toast.success(`✅ Cliente encontrado: ${buyer.scostumername}`);
      } else {
        console.log('ℹ️ Cliente no encontrado, puede continuar con el registro');
        setBuyerFound(false);
        toast.info('Cliente no registrado, puedes completar los datos manualmente');
      }
    } catch (error) {
      console.error('❌ Error al verificar cliente:', error);
      setBuyerFound(false);
    } finally {
      setIsCheckingBuyer(false);
    }
  };
  
  // ⭐ MANEJAR ENTER EN CAMPO DE DNI
  const handleIdNumberKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckBuyer();
    }
  };

  const handleAddPassenger = () => {
    if (!bookingId) {
      toast.error("ID de reserva no disponible.");
      return;
    }

    // Validar campos requeridos
    if (!validatePassenger(formData)) {
      toast.error("Por favor completa todos los campos obligatorios (*)");
      return;
    }

    const totalRegistrados = registeredPassengers.length + passengers.length;
    if (totalRegistrados >= guestCount) {
      toast.error("No puedes agregar más pasajeros que los permitidos por la reserva.");
      return;
    }

    const passengerWithBookingId = { ...formData, bookingId };
    setPassengers([...passengers, passengerWithBookingId]);
    setFormData(initialPassengerState);
    
    // ⭐ LIMPIAR ESTADOS DE VERIFICACIÓN
    setBuyerFound(false);
    setLastCheckedIdNumber("");
    
    toast.success("Pasajero agregado.");
  };

  // Función para eliminar un pasajero de la lista local
  const handleRemovePassenger = (index) => {
    const updatedPassengers = [...passengers];
    updatedPassengers.splice(index, 1);
    setPassengers(updatedPassengers);
    toast.info("Pasajero removido de la lista.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookingId) {
      toast.error("ID de reserva no disponible.");
      return;
    }
    
    if (passengers.length === 0) {
      toast.error("Por favor, agrega al menos un pasajero.");
      return;
    }

    // Filtra pasajeros incompletos antes de enviar
    const validPassengers = passengers.filter(validatePassenger);

    if (validPassengers.length === 0) {
      toast.error("No hay pasajeros válidos para registrar.");
      return;
    }

    // Añadir información de la reserva a cada pasajero
    const passengersWithBookingData = validPassengers.map((p) => ({
      ...p,
      checkInDate: booking?.checkIn,
      roomNumber: booking?.Room?.roomNumber,
    }));

    console.log("🚀 Enviando pasajeros al backend:", passengersWithBookingData);

    try {
      const result = await dispatch(
        createRegistrationPass({
          bookingId,
          passengers: passengersWithBookingData,
        })
      );

      if (result.success) {
        const allPassengers = [...registeredPassengers, ...validPassengers];
        setPassengers([]); // Limpiar pasajeros locales
        toast.success("Pasajeros registrados exitosamente.");
        
        // ⭐ NOTIFICAR AL COMPONENTE PADRE
        if (onSuccess) {
          onSuccess(allPassengers);
        }
      }
    } catch (error) {
      console.error("❌ Error al registrar pasajeros:", error);
      toast.error(`Error al registrar pasajeros: ${error.message}`);
    }
  };

  const checkInCompleto = registeredPassengers.length + passengers.length >= guestCount;
  const pasajerosDisponibles = guestCount - registeredPassengers.length - passengers.length;

  return (
    <DashboardLayout>
      <div className="bg-white p-6 rounded-lg">
        {/* ⭐ INFORMACIÓN DE LA RESERVA - SIN PEDIR bookingId */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-bold mb-3 text-blue-800">📋 Información de la reserva #{bookingId}:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Huéspedes permitidos:</span>
              <span className="ml-2 font-bold">{guestCount}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Ya registrados:</span>
              <span className="ml-2 font-bold text-green-600">{registeredPassengers.length}</span>
            </div>
            <div>
            <span className="font-medium text-blue-700">Por agregar:</span>
            <span className="ml-2 font-bold text-yellow-600">{passengers.length}</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Disponibles:</span>
            <span className="ml-2 font-bold text-blue-600">{pasajerosDisponibles}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <span className="font-medium text-blue-700">¿Check-in completo?</span>
          <span className={`ml-2 font-bold ${checkInCompleto ? "text-green-600" : "text-red-600"}`}>
            {checkInCompleto ? "Sí ✓" : "No ✗"}
          </span>
        </div>
      </div>

      {/* ⭐ MOSTRAR PASAJEROS YA REGISTRADOS */}
      {registeredPassengers.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-bold mb-3 text-green-800">✅ Pasajeros ya registrados:</h4>
          <div className="space-y-2">
            {registeredPassengers.map((passenger, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-medium">{passenger.name}</span>
                <span className="text-gray-600">•</span>
                <span>{passenger.nationality}</span>
                <span className="text-gray-600">•</span>
                <span className="font-mono text-gray-500">{passenger.idNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ FORMULARIO SOLO SI HAY ESPACIO DISPONIBLE */}
      {pasajerosDisponibles > 0 && (
        <>
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            👤 Agregar Nuevo Pasajero ({pasajerosDisponibles} disponible{pasajerosDisponibles !== 1 ? 's' : ''}):
          </h3>
          
          {/* ⭐ MENSAJE CUANDO SE ENCUENTRA UN CLIENTE REGISTRADO */}
          {buyerFound && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800 mb-1">Cliente Registrado Encontrado</h4>
                  <p className="text-sm text-green-700">
                    Los datos del cliente se han completado automáticamente. Puedes modificar cualquier campo si es necesario.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Campos del formulario organizados en grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                  {buyerFound && formData.name && (
                    <span className="ml-2 text-xs text-green-600">✓ Auto-completado</span>
                  )}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    buyerFound && formData.name ? 'bg-green-50 border-green-300' : 'border-gray-300'
                  }`}
                  required
                  placeholder="Nombre completo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad *</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Identificación *
                  {buyerFound && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      ✓ Cliente registrado
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    onBlur={handleCheckBuyer}
                    onKeyPress={handleIdNumberKeyPress}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      buyerFound 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                    required
                    placeholder="Ingrese el documento y presione Enter"
                  />
                  <button
                    type="button"
                    onClick={handleCheckBuyer}
                    disabled={isCheckingBuyer || !formData.idNumber || formData.idNumber.length < 6}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Verificar si el cliente existe"
                  >
                    {isCheckingBuyer ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Verificar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  💡 Ingrese el documento y presione <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Enter</kbd> o haga clic en "Verificar"
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Expedición</label>
                <input
                  type="text"
                  name="idIssuingPlace"
                  value={formData.idIssuingPlace}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="Soltero">Soltero</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viudo">Viudo</option>
                  <option value="Unión Libre">Unión Libre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profesión</label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración de la Estancia (días) *</label>
                <input
                  type="number"
                  name="stayDuration"
                  value={formData.stayDuration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Check-In</label>
                <input
                  type="time"
                  name="checkInTime"
                  value={formData.checkInTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Personas *</label>
                <input
                  type="number"
                  name="numberOfPeople"
                  value={formData.numberOfPeople}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Extranjera o Pasaporte</label>
                <input
                  type="text"
                  name="foreignIdOrPassport"
                  value={formData.foreignIdOrPassport}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                  {buyerFound && formData.phoneNumber && (
                    <span className="ml-2 text-xs text-green-600">✓ Auto-completado</span>
                  )}
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    buyerFound && formData.phoneNumber ? 'bg-green-50 border-green-300' : 'border-gray-300'
                  }`}
                  placeholder="Número de teléfono"
                />
              </div>
            </div>
            
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
                {buyerFound && formData.address && (
                  <span className="ml-2 text-xs text-green-600">✓ Auto-completado</span>
                )}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  buyerFound && formData.address ? 'bg-green-50 border-green-300' : 'border-gray-300'
                }`}
                placeholder="Dirección completa"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddPassenger}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={pasajerosDisponibles <= 0}
              >
                ➕ Agregar Pasajero
              </button>
            </div>
          </form>
        </>
      )}
      
      {/* ⭐ LISTA DE PASAJEROS AGREGADOS LOCALMENTE */}
      {passengers.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-bold mb-3 text-yellow-800">⏳ Pasajeros Por Registrar:</h3>
          <div className="space-y-2">
            {passengers.map((passenger, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span className="font-medium">{passenger.name}</span>
                  <span className="text-gray-600">•</span>
                  <span>{passenger.nationality}</span>
                  <span className="text-gray-600">•</span>
                  <span className="font-mono text-gray-500">{passenger.idNumber}</span>
                </div>
                <button
                  onClick={() => handleRemovePassenger(index)}
                  className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                >
                  ✕ Eliminar
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              ✅ Registrar {passengers.length} Pasajero{passengers.length !== 1 ? "s" : ""}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ⭐ MENSAJE CUANDO ESTÁ COMPLETO */}
      {checkInCompleto && passengers.length === 0 && (
        <div className="mt-6 bg-green-100 text-green-800 p-4 rounded-lg border border-green-300">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium">Check-in completo</p>
              <p className="text-sm">Se ha registrado la cantidad total de huéspedes para esta reserva.</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Finalizar
            </button>
          )}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}

import PropTypes from "prop-types";

Registration.propTypes = {
  bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  existingPassengers: PropTypes.array,
  guestCount: PropTypes.number,
  booking: PropTypes.object,
  onSuccess: PropTypes.func,
  onClose: PropTypes.func,
};

export default Registration;