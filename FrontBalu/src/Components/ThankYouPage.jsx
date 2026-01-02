import  { useState, useEffect, useRef } from "react";
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

              {/* ⭐ MENSAJE DESTACADO - PRESENTAR EN CHECK-IN */}
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-6 mb-6 text-center border-4 border-yellow-600 shadow-2xl">
                <div className="flex items-center justify-center mb-3">
                  <svg className="w-12 h-12 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  ⚠️ IMPORTANTE: PRESENTAR EN EL CHECK-IN ⚠️
                </h3>
                <p className="text-lg font-semibold">
                  Debe presentar este comprobante impreso o en formato digital al momento de su llegada
                </p>
                <p className="text-sm mt-2 opacity-90">
                  Guarde este documento en un lugar seguro
                </p>
              </div>

              {/* ⭐ INFORMACIÓN IMPORTANTE */}
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📋</span> Información Importante
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="font-semibold text-green-700 mb-1">✅ Check-in</p>
                    <p className="text-sm text-gray-700">A partir de las 3:00 PM</p>
                    <p className="text-xs text-gray-500">Llegadas tempranas pueden generar costo adicional</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="font-semibold text-orange-700 mb-1">📤 Check-out</p>
                    <p className="text-sm text-gray-700">Antes de las 11:00 AM</p>
                    <p className="text-xs text-gray-500">Salidas tardías pueden generar costo adicional</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="font-semibold text-blue-700 mb-1">📞 Contacto</p>
                    <p className="text-sm text-gray-700">+57 (311) 061-010</p>
                    <p className="text-xs text-gray-500">servicioalcliente@hotelbalu.com.co</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="font-semibold text-purple-700 mb-1">📍 Dirección</p>
                    <p className="text-sm text-gray-700">Cl. 8 #8-57, Centro</p>
                    <p className="text-xs text-gray-500">Restrepo, Meta</p>
                  </div>
                </div>
                <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">🆔 Documentos requeridos:</span> Todos los visitantes deben presentar documento de identidad original al momento del check-in.
                  </p>
                </div>
              </div>
              {/* ⭐ TÉRMINOS Y CONDICIONES */}
              <div className="bg-white rounded-xl border-2 border-gray-300 p-6 mt-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📑</span> Términos y Condiciones de Reserva
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Reservas y Pagos:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>Reserva sin abono no se hará efectiva.</li>
                      <li>Habitaciones asignadas previa disponibilidad del Hotel.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Modificaciones y Cancelaciones:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>Las modificaciones de fecha deben realizarse con un mínimo de 5 días calendario antes de la fecha programada.</li>
                      <li>Hotel Balú <strong>no realiza devoluciones de dinero</strong>.</li>
                      <li>En caso de no poder asistir, el hotel otorgará un plazo máximo de 30 días calendario para hacer uso de la reserva.</li>
                      <li>Si el huésped no se presenta y no realiza cancelación o modificación, Hotel Balú podrá retener el anticipo realizado.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Tarifas y Ocupación:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>Todo niño mayor de 5 años paga tarifa completa.</li>
                      <li>En caso de presentarse con acompañante adicional no registrado, se realizará el cobro correspondiente.</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-gray-700 mb-2">Check-in y Check-out:</h5>
                    <ul className="space-y-1 text-sm text-gray-700 list-disc pl-5">
                      <li><strong>Check-in: 3:00 PM</strong> (ingresos antes de esta hora pueden generar costos adicionales)</li>
                      <li><strong>Check-out: 11:00 AM</strong> (salidas posteriores pueden generar costos adicionales)</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Documentación:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>Todos los visitantes deben presentar documento de identidad original al momento del check-in.</li>
                      <li>En caso de presentarse con menores de edad es necesario presentar el Registro Civil del menor.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Parqueadero:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>El servicio de parqueadero aplica hasta las 11:00 AM.</li>
                      <li>Si el huésped entrega la habitación y deja el vehículo en el parqueadero, deberá cancelar la tarifa correspondiente directamente con el encargado.</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h5 className="font-semibold text-purple-700 mb-2 flex items-center">
                      <span className="mr-2">🐾</span> Hotel Pet Friendly
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-700 list-disc pl-5">
                      <li>El huésped deberá traer los elementos necesarios para la comodidad de su mascota.</li>
                      <li>El propietario será responsable por cualquier daño o perjuicio ocasionado por el animal.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Responsabilidad por Daños:</h5>
                    <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                      <li>Todo daño ocasionado en la habitación o áreas comunes será cargado a la cuenta del huésped.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ⭐ POLÍTICA DE PROTECCIÓN DE MENORES */}
              <div className="bg-red-50 rounded-xl border-2 border-red-300 p-6 mt-6">
                <h4 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                  <span className="mr-2">⚠️</span> Política de Protección de Niños, Niñas y Adolescentes
                </h4>
                <div className="space-y-3 text-sm text-gray-700">
                  <p className="font-semibold text-red-700">
                    Hotel Balú cumple estrictamente con la Ley 1098 de 2006 (Código de la Infancia y la Adolescencia), 
                    la Ley 679 de 2001 y la Ley 704 de 2001, orientadas a la prevención de la explotación sexual y 
                    comercial de menores de edad.
                  </p>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>Todo huésped que se presente con menores de edad deberá acreditar el parentesco o autorización legal, presentando el Registro Civil del menor.</li>
                    <li>El hotel reportará a las autoridades competentes cualquier situación sospechosa que atente contra los derechos de los menores.</li>
                  </ul>
                  <div className="bg-red-100 border-l-4 border-red-500 p-3 mt-3 rounded">
                    <p className="font-bold text-red-800">
                      TOLERANCIA CERO: Hotel Balú rechaza y denuncia cualquier forma de explotación, abuso o turismo sexual que involucre a niños, niñas y adolescentes.
                    </p>
                  </div>
                </div>
              </div>

              {/* ⭐ FOOTER DEL COMPROBANTE */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 mt-6 text-center">
                <p className="text-2xl font-bold mb-2">🏨 Hotel Balú</p>
                <p className="text-blue-100 mb-2">Tu descanso con elegancia en el corazón del Llano</p>
                <p className="text-sm text-blue-200">Cl. 8 #8-57, Centro, Restrepo, Meta</p>
                <p className="text-sm text-blue-200">+57 (311) 061-010 | servicioalcliente@hotelbalu.com.co</p>
                <p className="text-xs text-blue-300 mt-3">
                  © {new Date().getFullYear()} Hotel Balú. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThankYouPage;
