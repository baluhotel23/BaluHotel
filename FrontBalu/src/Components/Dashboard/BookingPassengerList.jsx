import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getBookingById } from "../../Redux/Actions/bookingActions";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import DashboardLayout from "./DashboardLayout";

const BookingPassengerList = () => {
  const dispatch = useDispatch();
  const [bookingIdInput, setBookingIdInput] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  const registrationPasses = useSelector(
    (state) => state.booking.bookingDetails?.registrationPasses || []
  );

  const bookingDetails = useSelector((state) => state.booking.bookingDetails);

  useEffect(() => {
    if (bookingDetails) {
      setSelectedBooking(bookingDetails);
    }
  }, [bookingDetails]);

  const handleSearchBooking = async () => {
    if (!bookingIdInput) {
      toast.error("Por favor, ingresa un ID de reserva");
      return;
    }

    setLoading(true);
    try {
      await dispatch(getBookingById(bookingIdInput));
    } catch (error) {
      toast.error(
        `Error al buscar la reserva: ${error.message || "Error desconocido"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = () => {
  if (!selectedBooking || registrationPasses.length === 0) {
    toast.error("No hay datos para generar el PDF.");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape", // A4 horizontal
    unit: "pt",
    format: "a4",
  });

  // Título del documento
  doc.setFontSize(18);
  doc.text(
    `Listado de Pasajeros - Reserva #${selectedBooking.bookingId}`,
    doc.internal.pageSize.getWidth() / 2,
    30,
    { align: "center" }
  );

  // Información de la reserva
  doc.setFontSize(12);
  doc.text(`Habitación: ${selectedBooking.roomNumber}`, 40, 60);
  doc.text(
    `Check-in: ${new Date(selectedBooking.checkIn).toLocaleDateString()}`,
    40,
    80
  );
  doc.text(
    `Check-out: ${new Date(selectedBooking.checkOut).toLocaleDateString()}`,
    40,
    100
  );
  doc.text(`Titular: ${selectedBooking.guest?.scostumername}`, 40, 120);
  doc.text(`Documento: ${selectedBooking.guestId}`, 40, 140);
  doc.text(`Estado: ${selectedBooking.status}`, 40, 160);

  // Tabla de pasajeros
  const tableColumnHeaders = [
    "Nombre",
    "Documento",
    "País de Origen",
    "Nacionalidad",
    "Domicilio",
    "Estado Civil",
    "Profesión",
    "Fecha CheckIn",
    "Destino",
    "Teléfono",
    "Duración",
  ];

  const tableRows = registrationPasses.map((passenger) => [
    passenger.name,
    passenger.idNumber,
    passenger.idIssuingPlace,
    passenger.nationality,
    passenger.address,
    passenger.maritalStatus,
    passenger.profession,
    passenger.checkInTime,
    passenger.destination,
    passenger.phoneNumber,
    `${passenger.stayDuration} días`,
  ]);

  doc.autoTable({
    head: [tableColumnHeaders],
    body: tableRows,
    startY: 180,
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [22, 160, 133] }, // Color de encabezado
  });

  // ⭐ AGREGAR PIE DE PÁGINA CON LÍNEAS DE FIRMA Y CÉDULA
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Posición desde el bottom de la página
  const footerY = pageHeight - 80; // 80 puntos desde abajo
  
  // Línea para firma
  const firmaX = 50;
  const firmaWidth = 200;
  doc.line(firmaX, footerY, firmaX + firmaWidth, footerY); // Línea horizontal
  doc.setFontSize(10);
  doc.text("Firma del Responsable", firmaX, footerY + 15);
  
  // Línea para cédula
  const cedulaX = pageWidth - 250; // Posición desde la derecha
  const cedulaWidth = 200;
  doc.line(cedulaX, footerY, cedulaX + cedulaWidth, footerY); // Línea horizontal
  doc.text("Número de Cédula", cedulaX, footerY + 15);
  
  // Fecha y hora de generación (opcional)
  const fechaGeneracion = new Date().toLocaleString('es-ES');
  doc.setFontSize(8);
  doc.text(
    `Documento generado el: ${fechaGeneracion}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: "center" }
  );

  // Guardar o abrir el PDF
  doc.save(`Listado_Pasajeros_Reserva_${selectedBooking.bookingId}.pdf`);
};
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">
          Listado de Pasajeros por Reserva
        </h2>

        {/* Búsqueda de reserva */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                ID de Reserva:
              </label>
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
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {selectedBooking && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Reserva #{selectedBooking.bookingId}
              </h3>
              <button
                onClick={handleGeneratePDF}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Generar PDF
              </button>
            </div>

            {/* Detalles de la reserva */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-2 text-center">
                Listado de Pasajeros - Reserva #{selectedBooking.bookingId}
              </h3>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p>
                    <span className="font-medium">Habitación:</span>{" "}
                    {selectedBooking.roomNumber}
                  </p>
                  <p>
                    <span className="font-medium">Check-in:</span>{" "}
                    {new Date(selectedBooking.checkIn).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Check-out:</span>{" "}
                    {new Date(selectedBooking.checkOut).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium">Titular:</span>{" "}
                    {selectedBooking.guest?.scostumername}
                  </p>
                  <p>
                    <span className="font-medium">Documento:</span>{" "}
                    {selectedBooking.guestId}
                  </p>
                  <p>
                    <span className="font-medium">Estado:</span>{" "}
                    {selectedBooking.status}
                  </p>
                </div>
              </div>

              {/* Listado de pasajeros */}
              <h4 className="text-lg font-semibold mb-3">
                Pasajeros Registrados:
              </h4>

              {registrationPasses && registrationPasses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 border">Nombre</th>
                        <th className="p-2 border">Documento</th>
                        <th className="p-2 border">País de Origen</th>
                        <th className="p-2 border">Nacionalidad</th>
                        <th className="p-2 border">Domicilio</th>
                        <th className="p-2 border">Estado Civil</th>
                        <th className="p-2 border">Profesión</th>
                        <th className="p-2 border">Fecha CheckIn</th>
                        <th className="p-2 border">Destino</th>
                        <th className="p-2 border">Teléfono</th>
                        <th className="p-2 border">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationPasses.map((passenger) => (
                        <tr key={passenger.registrationNumber}>
                          <td className="p-2 border">{passenger.name}</td>
                          <td className="p-2 border">{passenger.idNumber}</td>
                          <td className="p-2 border">
                            {passenger.idIssuingPlace}
                          </td>
                          <td className="p-2 border">
                            {passenger.nationality}
                          </td>
                          <td className="p-2 border">{passenger.address}</td>
                          <td className="p-2 border">
                            {passenger.maritalStatus}
                          </td>
                          <td className="p-2 border">{passenger.profession}</td>
                          <td className="p-2 border">{passenger.checkInTime}</td>
                          <td className="p-2 border">{passenger.destination}</td>
                          <td className="p-2 border">{passenger.phoneNumber}</td>
                          <td className="p-2 border">
                            {passenger.stayDuration} días
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 italic">
                  No hay pasajeros registrados para esta reserva.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookingPassengerList;