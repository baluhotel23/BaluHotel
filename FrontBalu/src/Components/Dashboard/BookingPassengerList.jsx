import  { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { getBookingById } from "../../Redux/Actions/bookingActions";
import {
  deleteRegistrationPass,
  updateRegistrationPass,
} from "../../Redux/Actions/registerActions";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import DashboardLayout from "./DashboardLayout";

const BookingPassengerList = () => {
  const { bookingId } = useParams();
  const dispatch = useDispatch();
  const [bookingIdInput, setBookingIdInput] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  // Edición de pasajero
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const registrationPasses = useSelector(
    (state) => state.booking.bookingDetails?.registrationPasses || []
  );

  const bookingDetails = useSelector((state) => state.booking.bookingDetails);

  useEffect(() => {
    if (bookingId) {
      setBookingIdInput(bookingId);
      setLoading(true);
      dispatch(getBookingById(bookingId))
        .finally(() => setLoading(false));
    }
  }, [bookingId, dispatch]); 


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

    const img = new Image();
    img.src = "/logo2.png";
    img.onload = () => {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 15;

      const logoWidth = 70;
      const logoHeight = (img.height * logoWidth) / img.width;
      doc.addImage(
        img,
        "PNG",
        (pageWidth / 2) - (logoWidth / 2),
        currentY,
        logoWidth,
        logoHeight
      );
      currentY += logoHeight + 5;

      doc.setFontSize(12);
      doc.text(
        `Listado de Pasajeros - Reserva #${selectedBooking.bookingId}`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 20;

      doc.setDrawColor(200, 200, 200);
      doc.line(40, currentY, pageWidth - 40, currentY);
      currentY += 15;

      doc.setFontSize(8);
      doc.text(`Habitación: ${selectedBooking.roomNumber}`, 40, currentY);
      doc.text(
        `Check-in: ${new Date(selectedBooking.checkIn).toLocaleDateString()}`,
        40,
        currentY + 12
      );
      doc.text(
        `Check-out: ${new Date(selectedBooking.checkOut).toLocaleDateString()}`,
        40,
        currentY + 24
      );
      doc.text(
        `Titular: ${selectedBooking.guest?.scostumername}`,
        pageWidth - 40,
        currentY,
        { align: "right" }
      );
      doc.text(`Documento: ${selectedBooking.guestId}`, pageWidth - 40, currentY + 12, { align: "right" });
      

      currentY += 24 + 10;
      doc.line(40, currentY, pageWidth - 40, currentY);

      const tableStartY = currentY + 15;

      const tableColumnHeaders = [
        "Nombre", "Documento", "País de Origen", "Nacionalidad", "Domicilio",
        "Estado Civil", "Profesión", "Fecha CheckIn", "Destino", "Teléfono", "Duración",
      ];

      const tableRows = registrationPasses.map((passenger) => [
        passenger.name, passenger.idNumber, passenger.idIssuingPlace, passenger.nationality,
        passenger.address, passenger.maritalStatus, passenger.profession, passenger.checkInTime,
        passenger.destination, passenger.phoneNumber, `${passenger.stayDuration} días`,
      ]);

      let finalY = tableStartY;

      doc.autoTable({
        head: [tableColumnHeaders],
        body: tableRows,
        startY: tableStartY,
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [22, 160, 133] },
        didDrawPage: (data) => {
          finalY = data.cursor.y;
        },
      });

      currentY = finalY + 50;

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      const authTitle =
        "AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES Y DECLARACIÓN DE COMPROMISO PARA LA PROTECCIÓN DE MENORES DE EDAD";
      const splitAuthTitle = doc.splitTextToSize(authTitle, pageWidth - 80);
      doc.text(splitAuthTitle, pageWidth / 2, currentY, { align: "center" });
      currentY += splitAuthTitle.length * 9 + 10;

      doc.setFontSize(6);
      doc.setFont(undefined, "normal");
      const legalText = `En cumplimiento de lo dispuesto por la Ley 1581 de 2012 y sus decretos reglamentarios, así como las normas vigentes relacionadas con la protección de menores en Colombia (Ley 1098 de 2006, Ley 679 de 2001 y Ley 704 de 2001), el Hotel BALÚ informa que los datos personales suministrados por usted serán recolectados, almacenados, usados, circulados y, en general, tratados conforme a las políticas de privacidad del hotel y para las siguientes finalidades: 1. Verificar la identidad del huésped y registrar su ingreso. 2. Garantizar la seguridad de los huéspedes, empleados y visitantes. 3. Dar cumplimiento a las obligaciones legales en materia de registro hotelero. 4. Enviar comunicaciones relacionadas con el servicio, promociones o eventos del hotel (siempre que exista consentimiento). 5. Realizar análisis estadísticos para el mejoramiento del servicio. 6. Cumplir con las exigencias de las autoridades competentes. Al firmar este documento, el huésped autoriza de manera libre, expresa e informada el tratamiento de sus datos personales conforme a las finalidades aquí descritas. El titular de los datos podrá ejercer sus derechos de consulta, actualización, corrección o supresión, contactando a servicioalcliente@hotelbalu.com.co o visitando nuestras oficinas en la Cl. 8 #8-57, Centro, Restrepo, Meta. COMPROMISO Y DECLARACIÓN SOBRE LA PROTECCIÓN DE MENORES DE EDAD: Declaro que: - No haré uso de los servicios del hotel con fines que atenten contra los derechos de niños, niñas y adolescentes. - Conozco que el Hotel BALÚ aplica protocolos de protección a menores y colabora activamente con las autoridades para prevenir cualquier tipo de explotación infantil, de acuerdo con la Ley 679 de 2001, la Ley 1098 de 2006 y la Ley 704 de 2001. - En caso de alojarme con menores de edad, presento los documentos legales que acreditan el vínculo o la autorización expresa de sus representantes legales, de acuerdo con lo establecido en la normativa colombiana. - Entiendo que cualquier sospecha o evidencia de abuso, explotación o trata de personas será reportada a las autoridades competentes. Al firmar este documento, autorizo el tratamiento de mis datos personales y declaro haber leído y comprendido el contenido de esta autorización y compromiso.`;
      const lines = doc.splitTextToSize(legalText, pageWidth - 80);
      doc.text(lines, 40, currentY);
      currentY += (lines.length * 6) + 30;

           

      // 👉 Agregar términos y condiciones aquí
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text(" Términos y condiciones", 40, currentY);
      currentY += 8;
      doc.setFont(undefined, "normal");
      const termsText = `Hotel Balú informa a sus clientes que para modificación de fechas debe realizarse con un mínimo de 5 días a la fecha programada de la reserva.
Hotel Balú se abstiene de realizar devoluciones de dinero por tal motivo de no poder asistir a tomar la reserva realizada el Hotel da un plazo 30 días calendario para hacer uso de la reserva solicitada.
De no asistir y no realizar la respectiva cancelación o modificación de fecha el HOTEL BALÚ, tendrá derecho a quedarse con el anticipo realizado por el huésped.
Habitaciones asignadas previa disponibilidad del Hotel.
Reserva sin abono no se hará efectiva.
Todo niño mayor de 5 años cancela tarifa.
En caso de presentarse con acompañante, para reservas realizadas para persona sola o en acomodación múltiple, se realiza el cobro adicional.
Se acepta el ingreso de mascotas siempre y cuando el dueño traiga equipaje para la comodidad del animal, y se haga responsable de daños o perjuicios ocasionados por el mismo.
CHECK IN 3 PM, de lo contrario puede generar costo adicional.
CHECK OUT 11 AM, de lo contrario puede generar costo adicional.
Presentar siempre documento de identidad original de los visitantes.
En caso de presentarse con menores de edad es necesario presentar el Registro civil del menor.
El servicio de parqueadero aplica para los huéspedes hasta la 11 AM, si el huésped entrega la habitación y deja el carro en el parqueadero debe cancelar la tarifa con el encargado del Parqueadero.
En Hotel Balú somos amigables con las mascotas, prepárate te esperamos con su camita y elementos de aseo. Gracias.
Todo daño ocasionado en la habitación será cargado a su cuenta.`;
      const termsLines = doc.splitTextToSize(termsText, doc.internal.pageSize.getWidth() - 80);
      doc.text(termsLines, 40, currentY);
      currentY += (termsLines.length * 9) + 40;

      doc.setFontSize(8);
      doc.text("Firma: ____________________________________", 40, currentY);
      doc.text("Cedula: ____________________________________", pageWidth / 2, currentY);

      
      doc.save(`Listado_Pasajeros_Reserva_${selectedBooking.bookingId}.pdf`);
    };
    img.onerror = () => {
      toast.error(
        "No se pudo cargar el logo para el PDF. Por favor, asegúrese que /logo2.png exista en la carpeta public."
      );
    };
  };

  // Editar pasajero
  const handleEditPassenger = (passenger) => {
    setEditingId(passenger.registrationNumber);
    setEditForm({ ...passenger });
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    try {
      await dispatch(updateRegistrationPass(editForm.registrationNumber, editForm));
      toast.success("Pasajero actualizado");
      setEditingId(null);
      dispatch(getBookingById(selectedBooking.bookingId));
    } catch (e) {
      toast.error("Error al actualizar pasajero");
    }
  };

  // Eliminar pasajero
  const handleDeletePassenger = async (registrationNumber) => {
    if (window.confirm("¿Seguro que deseas eliminar este pasajero de la reserva?")) {
      try {
        await dispatch(deleteRegistrationPass(registrationNumber));
        toast.success("Pasajero eliminado");
        dispatch(getBookingById(selectedBooking.bookingId));
      } catch (e) {
        toast.error("Error al eliminar pasajero");
      }
    }
  };

  // Cambios en el formulario de edición
  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">
          Listado de Pasajeros por Reserva
        </h2>

        {/* Búsqueda de reserva */}
        {!bookingId && (
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
)}
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
                        <th className="p-2 border">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationPasses.map((passenger) =>
                        editingId === passenger.registrationNumber ? (
                          <tr key={passenger.registrationNumber} className="bg-yellow-50">
                            <td className="p-2 border">
                              <input
                                name="name"
                                value={editForm.name || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="idNumber"
                                value={editForm.idNumber || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="idIssuingPlace"
                                value={editForm.idIssuingPlace || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="nationality"
                                value={editForm.nationality || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="address"
                                value={editForm.address || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="maritalStatus"
                                value={editForm.maritalStatus || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="profession"
                                value={editForm.profession || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="checkInTime"
                                value={editForm.checkInTime || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="destination"
                                value={editForm.destination || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="phoneNumber"
                                value={editForm.phoneNumber || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <input
                                name="stayDuration"
                                value={editForm.stayDuration || ""}
                                onChange={handleEditFormChange}
                                className="border rounded p-1 w-full"
                              />
                            </td>
                            <td className="p-2 border">
                              <button
                                className="bg-blue-600 text-white px-2 py-1 rounded mr-2"
                                onClick={handleSaveEdit}
                              >
                                Guardar
                              </button>
                              <button
                                className="bg-gray-400 text-white px-2 py-1 rounded"
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={passenger.registrationNumber}>
                            <td className="p-2 border">{passenger.name}</td>
                            <td className="p-2 border">{passenger.idNumber}</td>
                            <td className="p-2 border">{passenger.idIssuingPlace}</td>
                            <td className="p-2 border">{passenger.nationality}</td>
                            <td className="p-2 border">{passenger.address}</td>
                            <td className="p-2 border">{passenger.maritalStatus}</td>
                            <td className="p-2 border">{passenger.profession}</td>
                            <td className="p-2 border">{passenger.checkInTime}</td>
                            <td className="p-2 border">{passenger.destination}</td>
                            <td className="p-2 border">{passenger.phoneNumber}</td>
                            <td className="p-2 border">{passenger.stayDuration} días</td>
                            <td className="p-2 border">
                              <button
                                className="text-blue-600 hover:underline mr-2"
                                onClick={() => handleEditPassenger(passenger)}
                              >
                                Editar
                              </button>
                              <button
                                className="text-red-600 hover:underline"
                                onClick={() =>
                                  handleDeletePassenger(passenger.registrationNumber)
                                }
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        )
                      )}
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