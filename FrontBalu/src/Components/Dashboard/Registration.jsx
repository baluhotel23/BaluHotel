import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createRegistrationPass, getRegistrationPassesByBooking } from "../../Redux/Actions/registerActions";
import { toast } from "react-toastify";
import { getBookingById, updateBookingStatus } from "../../Redux/Actions/bookingActions";

function RegistrationPass({ onCheckInComplete }) {
  const dispatch = useDispatch();

  // Booking y pasajeros ya registrados del store
  const booking = useSelector((state) => state.booking.bookingDetails);

  // Corregir el selector para acceder correctamente a los datos
  const registrationPasses = useSelector(
    (state) => state.registrationPass?.registrationPasses || []
  );

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

  const [bookingIdInput, setBookingIdInput] = useState("");
  const [passengers, setPassengers] = useState([]);
  const [formData, setFormData] = useState(initialPassengerState);

  // guestCount se obtiene directamente del booking
  const guestCount = booking?.guestCount || 0;

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

  // Verificar reserva y obtener pasajeros ya registrados
  const handleVerifyBooking = () => {
    if (!bookingIdInput) {
      toast.error("Por favor, ingresa un ID de reserva.");
      return;
    }
    dispatch(getBookingById(bookingIdInput));
    dispatch(getRegistrationPassesByBooking(bookingIdInput));
    console.log("Verificando reserva y obteniendo pasajeros para bookingId:", bookingIdInput);
  };

  // Cuando cambia booking, limpia pasajeros locales
  useEffect(() => {
    setPassengers([]);
  }, [booking]);

  // Limpiar estado al desmontar componente
  useEffect(() => {
    return () => {
      dispatch({ type: "CLEAR_BOOKING_DETAILS" });
      dispatch({ type: "CLEAR_REGISTRATION_PASSES" });
    };
  }, [dispatch]);

  // Limpiar datos cuando cambia la reserva
  useEffect(() => {
    if (booking?.bookingId !== bookingIdInput && bookingIdInput) {
      setPassengers([]);
    }
  }, [booking?.bookingId, bookingIdInput]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddPassenger = () => {
    if (!booking || !booking.bookingId) {
      toast.error("Primero verifica la reserva.");
      return;
    }

    // Validar campos requeridos
    if (!validatePassenger(formData)) {
      toast.error("Por favor completa todos los campos obligatorios (*)");
      return;
    }

    const totalRegistrados = registrationPasses.length + passengers.length;
    if (totalRegistrados >= guestCount) {
      toast.error("No puedes agregar más pasajeros que los permitidos por la reserva.");
      return;
    }
    const passengerWithBookingId = { ...formData, bookingId: booking.bookingId };
    setPassengers([...passengers, passengerWithBookingId]);
    setFormData(initialPassengerState);
    toast.success("Pasajero agregado.");
    console.log("Pasajero agregado localmente:", passengerWithBookingId);
  };

  // Función para eliminar un pasajero de la lista local
  const handleRemovePassenger = (index) => {
    const updatedPassengers = [...passengers];
    updatedPassengers.splice(index, 1);
    setPassengers(updatedPassengers);
    toast.info("Pasajero removido de la lista.");
  };

  const updateBookingToCheckedIn = async () => {
    try {
      await dispatch(updateBookingStatus(booking.bookingId, { status: "checked-in" }));
      toast.success("Check-in completado y estado de reserva actualizado.");
      if (onCheckInComplete) {
        onCheckInComplete(booking.bookingId);
      }
    } catch (error) {
      console.error("Error al actualizar estado de reserva:", error);
      toast.error("No se pudo actualizar el estado de la reserva.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking || !booking.bookingId) {
      toast.error("Primero verifica la reserva.");
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

    // Añadir fecha de check-in desde la reserva
    const passengersWithCheckInDate = validPassengers.map((p) => ({
      ...p,
      checkInDate: booking.checkIn,
      roomNumber: booking.roomNumber,
    }));

    console.log("Enviando al backend:", passengersWithCheckInDate);

    try {
      await dispatch(
        createRegistrationPass({
          bookingId: booking.bookingId,
          passengers: passengersWithCheckInDate,
        })
      );

      // Recargar los pasajeros ya registrados para esta reserva
      await dispatch(getRegistrationPassesByBooking(booking.bookingId));

      setPassengers([]); // Limpiar pasajeros locales
      toast.success("Pasajeros registrados exitosamente.");

      // Verificar si el check-in está completo después de registrar estos pasajeros
      const totalRegistrados = registrationPasses.length + passengers.length;
      if (totalRegistrados >= guestCount) {
        console.log("Check-in completo, actualizando estado de reserva a checked-in");
        updateBookingToCheckedIn();
      }
    } catch (error) {
      toast.error(`Error al registrar pasajeros: ${error.message}`);
    }
  };

  const checkInCompleto = registrationPasses.length + passengers.length >= guestCount;

           
  return (
    <div className="max-w-4xl mx-auto p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Crear Registro de Pasajeros</h2>

      {/* Verificar reserva */}
      <div className="mb-4">
        <label className="block text-sm font-medium">ID de Reserva (Booking ID) *</label>
        <input
          type="text"
          value={bookingIdInput}
          onChange={(e) => setBookingIdInput(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <button
          type="button"
          onClick={handleVerifyBooking}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Verificar Reserva
        </button>
        {booking && booking.bookingId && (
          <span className="block text-green-600 mt-2">Reserva verificada: {booking.bookingId}</span>
        )}
      </div>

      {/* Información de la reserva */}
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <h3 className="font-bold mb-2">Información de la reserva:</h3>
        <span className="block text-sm">
          <b>Huéspedes permitidos:</b> {guestCount}
        </span>
        <span className="block text-sm">
          <b>Ya registrados:</b> {registrationPasses.length}
        </span>
        <span className="block text-sm">
          <b>Por agregar:</b> {passengers.length}
        </span>
        <span className="block text-sm">
          <b>Disponibles:</b> {guestCount - registrationPasses.length - passengers.length}
        </span>
        <span className="block text-sm font-medium mt-1">
          <b>¿Check-in completo?</b>{" "}
          <span className={checkInCompleto ? "text-green-600" : "text-yellow-600"}>
            {checkInCompleto ? " Sí ✓" : " No ✗"}
          </span>
        </span>
      </div>

      {/* Formulario para nuevos pasajeros */}
      {booking && booking.bookingId && registrationPasses.length < guestCount && (
        <>
          <h3 className="text-xl font-semibold mb-3">Agregar Nuevo Pasajero:</h3>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Campos del formulario */}
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
              <label className="block text-sm font-medium">
                Duración de la Estancia (días) *
              </label>
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
              <label className="block text-sm font-medium">
                Cantidad de Personas *
              </label>
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
              <label className="block text-sm font-medium">
                Número de Identificación *
              </label>
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
              <label className="block text-sm font-medium">
                Lugar de Expedición
              </label>
              <input
                type="text"
                name="idIssuingPlace"
                value={formData.idIssuingPlace}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Cédula Extranjera o Pasaporte
              </label>
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
              disabled={(registrationPasses.length + passengers.length) >= guestCount}
            >
              Agregar Pasajero
            </button>
          </form>
        </>
      )}
      
      {/* Lista de pasajeros agregados localmente (aún no enviados) */}
      {passengers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Pasajeros Por Registrar:</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <ul className="divide-y divide-yellow-200">
              {passengers.map((passenger, index) => (
                <li key={index} className="py-2 flex justify-between items-center">
                  <span>
                    <strong>{passenger.name}</strong> - {passenger.nationality} ({passenger.idNumber})
                  </span>
                  <button
                    onClick={() => handleRemovePassenger(index)}
                    className="text-red-500 hover:text-red-700 px-2 py-1"
                  >
                    ✕ Eliminar
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Registrar {passengers.length} Pasajero{passengers.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Mensaje cuando la reserva está completa */}
      {booking && booking.bookingId && checkInCompleto && (
        <div className="mt-4 bg-green-100 text-green-800 p-3 rounded border border-green-300">
          <p className="font-medium">✓ Check-in completo</p>
          <p className="text-sm">Se ha registrado la cantidad total de huéspedes para esta reserva.</p>
        </div>
      )}
    </div>
  );
}

export default RegistrationPass;