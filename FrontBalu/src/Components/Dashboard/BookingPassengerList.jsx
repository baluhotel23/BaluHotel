import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBookingById } from '../../Redux/Actions/bookingActions';
// Esta importación es redundante ya que getBookingById ya incluye los pasajeros
// import { getRegistrationPassesByBooking } from '../../Redux/Actions/registerActions';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import DashboardLayout from './DashboardLayout';

const BookingPassengerList = () => {
  const dispatch = useDispatch();
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  // Accedemos a los pasajeros directamente desde bookingDetails
  const registrationPasses = useSelector(state => 
    state.booking.bookingDetails?.registrationPasses || []
  );

  useEffect(() => {
    console.log("registrationPasses cambiado:", registrationPasses);
  }, [registrationPasses]);

  // Función para buscar reserva y sus pasajeros
 // Función para buscar reserva y sus pasajeros
const handleSearchBooking = async () => {
  if (!bookingIdInput) {
    toast.error('Por favor, ingresa un ID de reserva');
    return;
  }

  console.log("⬆️ Buscando reserva con ID:", bookingIdInput);
  setLoading(true);
  try {
    // Buscar la reserva
    console.log("⬆️ Llamando a getBookingById con ID:", bookingIdInput);
    await dispatch(getBookingById(bookingIdInput));
    
    // Usamos useEffect para actualizar el estado cuando cambie bookingDetails
    // El siguiente useEffect debe estar fuera de esta función
    
  } catch (error) {
    console.error("❌ ERROR COMPLETO:", error);
    toast.error(`Error al buscar la reserva: ${error.message || 'Error desconocido'}`);
  } finally {
    setLoading(false);
  }
};

// Añadir este useEffect fuera de la función handleSearchBooking
const bookingDetails = useSelector(state => state.booking.bookingDetails);

useEffect(() => {
  if (bookingDetails) {
    console.log("📊 Booking actualizado desde el estado:", bookingDetails);
    setSelectedBooking(bookingDetails);
  }
}, [bookingDetails]);

  console.log("🖥️ RENDER - registrationPasses:", registrationPasses);
  console.log("🖥️ RENDER - selectedBooking:", selectedBooking);

  // Función para imprimir
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Pasajeros_Reserva_${selectedBooking?.bookingId || bookingIdInput}`,
    onAfterPrint: () => toast.success('Listado impreso correctamente')
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Listado de Pasajeros por Reserva</h2>
        
        {/* Búsqueda de reserva */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">ID de Reserva:</label>
              <input 
                type="text" 
                value={bookingIdInput} 
                onChange={(e) => setBookingIdInput(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Ingresa el ID de la reserva"
              />
            </div>
            <button 
              onClick={handleSearchBooking}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Información de la reserva y pasajeros */}
        {selectedBooking && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Reserva #{selectedBooking.bookingId}</h3>
              <button 
                onClick={handlePrint}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Imprimir Listado
              </button>
            </div>
            
            {/* Sección imprimible */}
            <div ref={printRef} className="bg-white p-6 rounded-lg shadow">
              <div className="print:mb-6">
                <h3 className="text-xl font-bold mb-2 text-center">
                  Listado de Pasajeros - Reserva #{selectedBooking.bookingId}
                </h3>
                
                {/* Detalles de la reserva */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">Habitación:</span> {selectedBooking.roomNumber}</p>
                    <p><span className="font-medium">Check-in:</span> {new Date(selectedBooking.checkIn).toLocaleDateString()}</p>
                    <p><span className="font-medium">Check-out:</span> {new Date(selectedBooking.checkOut).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Titular:</span> {selectedBooking.guest?.scostumername}</p>
                    <p><span className="font-medium">Documento:</span> {selectedBooking.guestId}</p>
                    <p><span className="font-medium">Estado:</span> {selectedBooking.status}</p>
                  </div>
                </div>

                {/* Listado de pasajeros */}
                <h4 className="text-lg font-semibold mb-3">Pasajeros Registrados:</h4>
                
                {registrationPasses && registrationPasses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border">Nombre</th>
                          <th className="p-2 border">Documento</th>
                          <th className="p-2 border">Nacionalidad</th>
                          <th className="p-2 border">Teléfono</th>
                          <th className="p-2 border">Duración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrationPasses.map((passenger) => (
                          <tr key={passenger.registrationNumber}>
                            <td className="p-2 border">{passenger.name}</td>
                            <td className="p-2 border">{passenger.idNumber}</td>
                            <td className="p-2 border">{passenger.nationality}</td>
                            <td className="p-2 border">{passenger.phoneNumber}</td>
                            <td className="p-2 border">{passenger.stayDuration} días</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 italic">No hay pasajeros registrados para esta reserva.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay reserva seleccionada */}
        {!selectedBooking && !loading && bookingIdInput && (
          <p className="text-center py-4 italic">
            Ingresa un ID de reserva y haz clic en Buscar para ver sus pasajeros.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookingPassengerList;