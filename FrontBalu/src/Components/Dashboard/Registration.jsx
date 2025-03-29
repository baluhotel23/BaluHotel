import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
import { toast } from "react-toastify";
import { getBookingById } from "../../Redux/Actions/bookingActions";

function RegistrationPass() {
    const dispatch = useDispatch();
    const bookingDetails = useSelector((state) => state.bookingDetails || {}); // Valor predeterminado
    const { booking, loading, error } = bookingDetails;


 // Estado inicial del formulario para un pasajero
 const initialPassengerState = {
    name: "",
    nationality: "",
    maritalStatus: "",
    profession: "",
    stayDuration: "",
    checkInTime: "",
    numberOfPeople: "",
    destination: "",
    idNumber: "",
    idIssuingPlace: "",
    foreignIdOrPassport: "",
    address: "",
    phoneNumber: "",
  };

  // Estados
  const [bookingId, setBookingId] = useState("");
  const [guestCount, setGuestCount] = useState(0); // Cantidad máxima de huéspedes permitidos
  const [passengers, setPassengers] = useState([]); // Array de pasajeros
  const [formData, setFormData] = useState(initialPassengerState);

    // Verificar la reserva y obtener el guestCount
    const handleVerifyBooking = async () => {
        if (!bookingId) {
          toast.error("Por favor, ingresa un ID de reserva.");
          return;
        }
    
        dispatch(getBookingById(bookingId)); // Llamar a la acción para obtener los detalles de la reserva
      };
    
      // Actualizar el guestCount cuando se obtienen los detalles de la reserva
      React.useEffect(() => {
        if (booking) {
          setGuestCount(booking.guestCount || 0);
          toast.success("Reserva verificada. Puedes agregar pasajeros.");
        }
        if (error) {
          toast.error(error);
        }
      }, [booking, error]);


  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Agregar un pasajero al array
  const handleAddPassenger = () => {
    if (passengers.length >= guestCount) {
      toast.error("No puedes agregar más pasajeros que los permitidos por la reserva.");
      return;
    }

    setPassengers([...passengers, formData]);
    setFormData(initialPassengerState); // Reiniciar el formulario
    toast.success("Pasajero agregado.");
  };

  // Enviar todos los pasajeros al backend
  const handleSubmit = (e) => {
    e.preventDefault();

    if (passengers.length === 0) {
      toast.error("Por favor, agrega al menos un pasajero.");
      return;
    }

    const registrationData = {
      bookingId,
      passengers,
    };

    dispatch(createRegistrationPass(registrationData));
    setPassengers([]); // Reiniciar el array de pasajeros
    setBookingId(""); // Reiniciar el ID de reserva
    toast.success("Pasajeros registrados exitosamente.");
  };

  
    return (
        <div className="max-w-4xl mx-auto p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Crear Registro de Pasajeros</h2>
  
        {/* Verificar reserva */}
        <div className="mb-4">
          <label className="block text-sm font-medium">ID de Reserva (Booking ID) *</label>
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <button
            type="button"
            onClick={handleVerifyBooking}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Verificar Reserva
          </button>
        </div>
        <form onSubmit={handleAddPassenger} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">ID de Reserva (Booking ID) *</label>
            <input
              type="text"
              name="bookingId"
              value={formData.bookingId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Nombre *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Nacionalidad *</label>
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Estado Civil</label>
            <input
              type="text"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Profesión</label>
            <input
              type="text"
              name="profession"
              value={formData.profession}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Duración de la Estancia (días) *</label>
            <input
              type="number"
              name="stayDuration"
              value={formData.stayDuration}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Hora de Check-In</label>
            <input
              type="time"
              name="checkInTime"
              value={formData.checkInTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Cantidad de Personas *</label>
            <input
              type="number"
              name="numberOfPeople"
              value={formData.numberOfPeople}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Destino</label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Número de Identificación *</label>
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Lugar de Expedición</label>
            <input
              type="text"
              name="idIssuingPlace"
              value={formData.idIssuingPlace}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Cédula Extranjera o Pasaporte</label>
            <input
              type="text"
              name="foreignIdOrPassport"
              value={formData.foreignIdOrPassport}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Teléfono</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
          type="button"
          onClick={handleAddPassenger}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Agregar Pasajero
        </button>
      </form>

      {/* Lista de pasajeros agregados */}
      <div className="mt-4">
        <h3 className="text-lg font-bold">Pasajeros Agregados:</h3>
        <ul className="list-disc pl-5">
          {passengers.map((passenger, index) => (
            <li key={index}>
              {passenger.name} - {passenger.nationality}
            </li>
          ))}
        </ul>
      </div>

      {/* Enviar todos los pasajeros */}
      <button
        type="button"
        onClick={handleSubmit}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Enviar Pasajeros
      </button>
    </div>
  );
}

export default RegistrationPass