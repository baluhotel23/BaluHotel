import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";

const ThankYouPage = () => {
  const navigate = useNavigate();
  const [reservationData, setReservationData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    const storedData = localStorage.getItem("reservationData");
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setReservationData(data);
        console.log("📄 [THANKYOU] Datos de reserva cargados:", data);

        // ⭐ LIMPIAR LOCALSTORAGE DESPUÉS DE 30 MINUTOS
        setTimeout(() => {
          localStorage.removeItem("reservationData");
          console.log(
            "🧹 [THANKYOU] Datos de reserva limpiados del localStorage"
          );
        }, 30 * 60 * 1000); // 30 minutos
      } catch (error) {
        console.error("❌ [THANKYOU] Error parsing reservation data:", error);
        toast.error("Error al cargar los datos de la reserva");
      }
    } else {
      console.warn("⚠️ [THANKYOU] No hay datos de reserva disponibles");
      toast.warning("No se encontraron datos de la reserva");
      setTimeout(() => navigate("/"), 3000);
    }
  }, [navigate]);

  // ⭐ FUNCIÓN PARA GENERAR Y DESCARGAR PDF
  const generatePDF = async () => {
    if (!reservationData || !pdfRef.current) return;

    setIsGeneratingPDF(true);
    try {
      // Crear canvas del contenido
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Crear PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      // Descargar PDF
      const fileName = `Reserva_BaluHotel_${reservationData.bookingId}.pdf`;
      pdf.save(fileName);

      toast.success("¡PDF descargado exitosamente!");
    } catch (error) {
      console.error("❌ Error generando PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!reservationData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12">
          <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Cargando datos de reserva...
            </h2>
            <p className="text-gray-500">Por favor espere un momento</p>
          </div>
        </div>
      </>
    );
  }

  const { bookingDetails, paymentDetails, guestInfo, priceBreakdown } =
    reservationData;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ⭐ HEADER DE CONFIRMACIÓN */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-xl text-gray-600">
              Tu reserva ha sido procesada exitosamente
            </p>
            <p className="text-lg text-blue-600 font-semibold mt-2">
              ID de Reserva:{" "}
              <span className="font-mono">{reservationData.bookingId}</span>
            </p>
          </div>

          {/* ⭐ BOTONES DE ACCIÓN */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                ></path>
              </svg>
              <span>Volver al Inicio</span>
            </button>
          </div>

          {/* ⭐ CONTENIDO PARA PDF */}
          <div
            ref={pdfRef}
            className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-[800px] mx-auto"
          >
            {/* Header del PDF */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-2">🏨 Balu Hotel</h2>
                  <p className="text-blue-100">Confirmación de Reserva</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    ID: {reservationData.bookingId}
                  </p>
                  <p className="text-blue-100 text-sm">
                    Generado: {new Date().toLocaleDateString("es-CO")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* ⭐ INFORMACIÓN DEL HUÉSPED */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">👤</span> Información del Huésped
                </h3>
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Nombre Completo
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {guestInfo.scostumername}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Documento
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {guestInfo.wdoctype}: {guestInfo.sdocno}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {guestInfo.selectronicmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Teléfono
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {guestInfo.stelephone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⭐ DETALLES DE LA RESERVA */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏨</span> Detalles de la Reserva
                </h3>
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Habitación
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {bookingDetails.roomType} - #{bookingDetails.roomNumber}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {bookingDetails.roomDescription}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Huéspedes
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {bookingDetails.adults} adultos,{" "}
                        {bookingDetails.children} niños
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {bookingDetails.guestCount} personas
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Check-in
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {bookingDetails.checkInFormatted}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Check-out
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {bookingDetails.checkOutFormatted}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Noches
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {bookingDetails.nights} noches
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Estado
                      </p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        ✅ Confirmada
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⭐ DESGLOSE DE PRECIOS */}
              {priceBreakdown && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">💰</span> Desglose de Precios
                  </h3>
                  <div className="bg-green-50 rounded-xl p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Precio base por noche:
                        </span>
                        <span className="font-semibold">
                          ${priceBreakdown.basePrice?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Número de noches:</span>
                        <span className="font-semibold">
                          {priceBreakdown.nights}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Número de huéspedes:
                        </span>
                        <span className="font-semibold">
                          {priceBreakdown.guestCount}
                        </span>
                      </div>
                      {priceBreakdown.extraGuestCharges > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Cargo por huéspedes extra:
                          </span>
                          <span className="font-semibold">
                            $
                            {priceBreakdown.extraGuestCharges?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <hr className="border-green-300" />
                      <div className="flex justify-between text-lg font-bold text-green-700">
                        <span>Total de la Reserva:</span>
                        <span>
                          ${paymentDetails.totalAmount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ⭐ INFORMACIÓN DE PAGO */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💳</span> Información de Pago
                </h3>
                <div className="bg-yellow-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Monto Pagado
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        ${paymentDetails.amountPaid?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Método de Pago
                      </p>
                      <p className="text-lg font-semibold text-gray-800 capitalize">
                        {paymentDetails.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        ID de Transacción
                      </p>
                      <p className="text-sm font-mono text-gray-800">
                        {paymentDetails.transactionId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Referencia
                      </p>
                      <p className="text-sm font-mono text-gray-800">
                        {paymentDetails.paymentReference}
                      </p>
                    </div>
                    {paymentDetails.remainingAmount > 0 && (
                      <div className="md:col-span-2">
                        <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                          <p className="text-sm font-medium text-orange-800">
                            Saldo Pendiente
                          </p>
                          <p className="text-lg font-bold text-orange-600">
                            ${paymentDetails.remainingAmount?.toLocaleString()}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            A pagar al momento del check-in
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ⭐ INFORMACIÓN IMPORTANTE */}
              <div className="bg-gray-100 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  📋 Información Importante
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    • Por favor, presente este comprobante al momento del
                    check-in
                  </li>
                  <li>• Check-in disponible a partir de las 3:00 PM</li>
                  <li>• Check-out antes de las 11:00 PM</li>
                  <li>• Para cancelaciones, consulte nuestras políticas</li>
                  <li>
                    • Cualquier consulta, contáctenos al: +57 (311) 061-010
                  </li>
                </ul>
              </div>
              {/* ⭐ TÉRMINOS Y CONDICIONES */}
              <div className="bg-white rounded-xl border border-gray-300 p-6 mt-8">
                <h4 className="text-lg font-bold text-gray-800 mb-3">
                  📑 Términos y condiciones
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                  <li>
                    Hotel Balú informa a sus clientes que para modificación de
                    fechas debe realizarse con un mínimo de 5 días a la fecha
                    programada de la reserva.
                  </li>
                  <li>
                    Hotel Balú se abstiene de realizar devoluciones de dinero
                    por tal motivo de no poder asistir a tomar la reserva
                    realizada el Hotel da un plazo 30 días calendario para hacer
                    uso de la reserva solicitada.
                  </li>
                  <li>
                    De no asistir y no realizar la respectiva cancelación o
                    modificación de fecha el HOTEL BALÚ, tendrá derecho a
                    quedarse con el anticipo realizado por el huésped.
                  </li>
                  <li>
                    Habitaciones asignadas previa disponibilidad del Hotel.
                  </li>
                  <li>Reserva sin abono no se hará efectiva.</li>
                  <li>Todo niño mayor de 5 años cancela tarifa.</li>
                  <li>
                    En caso de presentarse con acompañante, para reservas
                    realizadas para persona sola o en acomodación múltiple, se
                    realiza el cobro adicional.
                  </li>
                  <li>
                    Se acepta el ingreso de mascotas siempre y cuando el dueño
                    traiga equipaje para la comodidad del animal, y se haga
                    responsable de daños o perjuicios ocasionados por el mismo.
                  </li>
                  <li>
                    CHECK IN 3 PM, de lo contrario puede generar costo
                    adicional.
                  </li>
                  <li>
                    CHECK OUT 11 AM, de lo contrario puede generar costo
                    adicional.
                  </li>
                  <li>
                    Presentar siempre documento de identidad original de los
                    visitantes.
                  </li>
                  <li>
                    En caso de presentarse con menores de edad es necesario
                    presentar el Registro civil del menor.
                  </li>
                  <li>
                    El servicio de parqueadero aplica para los huéspedes hasta
                    la 11 AM, si el huésped entrega la habitación y deja el
                    carro en el parqueadero debe cancelar la tarifa con el
                    encargado del Parqueadero.
                  </li>
                  <li>
                    En Hotel Balú somos amigables con las mascotas, prepárate te
                    esperamos con su camita y elementos de aseo. Gracias.
                  </li>
                  <li>
                    Todo daño ocasionado en la habitación será cargado a su
                    cuenta.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThankYouPage;
