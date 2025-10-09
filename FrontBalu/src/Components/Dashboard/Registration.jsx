import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
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
          
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Campos del formulario organizados en grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Identificación *</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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