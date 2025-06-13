import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import jsPDF from "jspdf";
import { registerLocalPayment } from "../../Redux/Actions/paymentActions";

const PaymentAndReceipt = ({
  bookingData,
  amountToPay,
  currentBuyerData,
  selectedRoom,
  onPaymentSuccess,
}) => {
  const dispatch = useDispatch();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  // 🔧 CALCULAR MONTO PENDIENTE REAL INTERNAMENTE
  const calculateRealPendingAmount = () => {
    const totalReserva = parseFloat(bookingData?.totalAmount || 0);
    const extraCharges = bookingData?.extraCharges || [];
    const payments = bookingData?.payments || [];
    
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalPagado = payments
      .filter(payment => payment.paymentStatus === 'completed')
      .reduce((sum, payment) => {
        const amount = parseFloat(payment.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    
    const totalFinal = totalReserva + totalExtras;
    const pendienteReal = Math.max(0, totalFinal - totalPagado);
    
    return {
      totalReserva,
      totalExtras,
      totalPagado,
      totalFinal,
      pendienteReal
    };
  };

  const financialData = calculateRealPendingAmount();
  const [paymentAmount, setPaymentAmount] = useState(financialData.pendienteReal);

  // 🔧 ACTUALIZAR MONTO CUANDO CAMBIEN LOS DATOS
  useEffect(() => {
    const newFinancialData = calculateRealPendingAmount();
    setPaymentAmount(newFinancialData.pendienteReal);
  }, [bookingData]);

  // 🔧 FUNCIÓN MEJORADA PARA GENERAR PDF
  const generatePDF = (paymentDetails) => {
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: [226.77, 839.28], // Formato ticket
      });

      const date = new Date().toLocaleDateString("es-CO", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const receiptNumber = `#${paymentDetails.paymentId || Date.now()}`;
      const pageWidth = doc.internal.pageSize.width;
      let currentY = 30;

      // 🎨 HEADER DEL HOTEL
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("BALU HOTEL", pageWidth / 2, currentY, { align: "center" });
      currentY += 25;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("NIT: 123.456.789-0", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;
      doc.text("Calle 123 #45-67, Ciudad", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;
      doc.text("Tel: (123) 456-7890", pageWidth / 2, currentY, { align: "center" });
      currentY += 25;

      // 🧾 INFORMACIÓN DEL RECIBO
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`RECIBO DE PAGO ${receiptNumber}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Fecha: ${date}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 25;

      // 🎯 LÍNEA SEPARADORA
      doc.text("━".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // 👤 DATOS DEL HUÉSPED
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("DATOS DEL HUÉSPED:", 15, currentY);
      currentY += 15;

      doc.setFont(undefined, 'normal');
      const guestName = currentBuyerData?.scostumername || 'N/A';
      const guestDoc = currentBuyerData?.sdocno || 'N/A';
      const guestEmail = currentBuyerData?.selectronicmail;
      const guestPhone = currentBuyerData?.stelephone;

      doc.text(`Nombre: ${guestName}`, 15, currentY);
      currentY += 12;
      doc.text(`Documento: ${guestDoc}`, 15, currentY);
      currentY += 12;

      if (guestEmail) {
        doc.text(`Email: ${guestEmail}`, 15, currentY);
        currentY += 12;
      }

      if (guestPhone) {
        doc.text(`Teléfono: ${guestPhone}`, 15, currentY);
        currentY += 12;
      }

      currentY += 10;

      // 🏨 DATOS DE LA RESERVA
      doc.setFont(undefined, 'bold');
      doc.text("DATOS DE LA RESERVA:", 15, currentY);
      currentY += 15;

      doc.setFont(undefined, 'normal');
      const roomInfo = `${selectedRoom?.type || 'Habitación'} - ${selectedRoom?.roomNumber || bookingData?.roomNumber || 'N/A'}`;
      doc.text(`Habitación: ${roomInfo}`, 15, currentY);
      currentY += 12;

      doc.text(`Reserva #: ${bookingData?.bookingId || 'N/A'}`, 15, currentY);
      currentY += 12;

      if (bookingData?.checkIn) {
        const checkInDate = new Date(bookingData.checkIn).toLocaleDateString('es-CO');
        doc.text(`Check-in: ${checkInDate}`, 15, currentY);
        currentY += 12;
      }

      if (bookingData?.checkOut) {
        const checkOutDate = new Date(bookingData.checkOut).toLocaleDateString('es-CO');
        doc.text(`Check-out: ${checkOutDate}`, 15, currentY);
        currentY += 12;
      }

      currentY += 15;

      // 💰 DESGLOSE FINANCIERO
      doc.setFont(undefined, 'bold');
      doc.text("DESGLOSE DE PAGO:", 15, currentY);
      currentY += 15;

      doc.setFont(undefined, 'normal');
      
      // Total reserva
      const totalReserva = parseFloat(bookingData?.totalAmount || 0);
      doc.text(`Costo reserva:`, 15, currentY);
      doc.text(`$${totalReserva.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 12;

      // Extras si los hay
      const extraCharges = bookingData?.extraCharges || [];
      const totalExtras = extraCharges.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      if (totalExtras > 0) {
        doc.text(`Consumos extras:`, 15, currentY);
        doc.text(`$${totalExtras.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 12;
      }

      // Subtotal
      const subtotal = totalReserva + totalExtras;
      doc.text("─".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 10;
      
      doc.text(`Subtotal:`, 15, currentY);
      doc.text(`$${subtotal.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 15;

      // MONTO DE ESTE PAGO
      doc.setFont(undefined, 'bold');
      doc.text(`MONTO PAGADO:`, 15, currentY);
      doc.text(`$${parseFloat(paymentDetails.amount).toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 15;

      // Método de pago
      doc.setFont(undefined, 'normal');
      const paymentMethodText = {
        cash: "Efectivo",
        card: "Tarjeta",
        transfer: "Transferencia",
        other: "Otro"
      };
      doc.text(`Método: ${paymentMethodText[paymentMethod] || paymentMethod}`, 15, currentY);
      currentY += 20;

      // 🎯 LÍNEA SEPARADORA FINAL
      doc.text("━".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // 🙏 MENSAJE DE AGRADECIMIENTO
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("¡Gracias por elegirnos!", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Conserve este recibo", pageWidth / 2, currentY, { align: "center" });

      // 🔧 GENERAR Y MOSTRAR EL PDF
      doc.output("dataurlnewwindow");
      
      console.log("✅ PDF generado exitosamente");
      
    } catch (error) {
      console.error("❌ Error generando PDF:", error);
      toast.error("Error al generar el recibo PDF");
    }
  };

  // 🔧 FUNCIÓN PRINCIPAL DE PAGO MEJORADA
  const handlePayment = async () => {
    // 🛡️ VALIDACIONES EXHAUSTIVAS
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("El monto del pago debe ser mayor a 0");
      return;
    }

    const currentFinancialData = calculateRealPendingAmount();
    
    if (paymentAmount > currentFinancialData.pendienteReal) {
      toast.error(`El monto del pago ($${paymentAmount.toLocaleString()}) no puede ser mayor al monto pendiente ($${currentFinancialData.pendienteReal.toLocaleString()})`);
      return;
    }

    if (!bookingData?.bookingId) {
      toast.error("Error: No se encontró la información de la reserva");
      return;
    }

    if (!paymentMethod) {
      toast.error("Debe seleccionar un método de pago");
      return;
    }

    setIsProcessing(true);

    try {
      console.group("🔍 [PAYMENT] Procesando pago");
      console.log("📊 Datos financieros:", currentFinancialData);
      console.log("💰 paymentAmount:", paymentAmount);
      console.log("💳 paymentMethod:", paymentMethod);

      // 🔧 PREPARAR DATOS DEL PAGO
      const paymentData = {
        bookingId: bookingData.bookingId,
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod,
        paymentDate: new Date().toISOString(),
        paymentStatus: 'completed',
        notes: `Pago ${paymentMethod === 'cash' ? 'en efectivo' : `con ${paymentMethod}`} - Check-out`,
        paymentType: 'checkout',
        description: `Pago ${paymentAmount === currentFinancialData.pendienteReal ? 'total' : 'parcial'} de reserva #${bookingData.bookingId}`,
        // 🔧 METADATOS ADICIONALES
        metadata: {
          totalReserva: currentFinancialData.totalReserva,
          totalExtras: currentFinancialData.totalExtras,
          totalPagadoAntes: currentFinancialData.totalPagado,
          pendienteAntes: currentFinancialData.pendienteReal,
          processedAt: new Date().toISOString(),
          processedBy: 'checkout_system'
        }
      };

      console.log("📤 Enviando al backend:", paymentData);

      // 🔧 ENVIAR AL BACKEND
      const result = await dispatch(registerLocalPayment(paymentData));
      
      console.log("📥 Resultado del backend:", result);

      if (result?.success || result?.data) {
        console.log("✅ Pago registrado exitosamente");
        
        // 🔧 PREPARAR DATOS DEL RECIBO
        const paymentDetails = {
          paymentId: result.data?.data?.id || result.data?.id || Date.now(),
          amount: paymentAmount,
          method: paymentMethod,
          date: new Date(),
          bookingId: bookingData.bookingId,
          ...result.data?.data
        };

        // 🧾 GENERAR RECIBO
        generatePDF(paymentDetails);

        // 🎉 MOSTRAR ÉXITO
        const remainingAmount = currentFinancialData.pendienteReal - paymentAmount;
        const successMessage = remainingAmount > 0 
          ? `✅ Pago parcial de $${parseFloat(paymentAmount).toLocaleString()} registrado. Resta: $${remainingAmount.toLocaleString()}`
          : `✅ Pago completo de $${parseFloat(paymentAmount).toLocaleString()} registrado. ¡Cuenta saldada!`;
        
        toast.success(successMessage);
        
        // 🔧 NOTIFICAR AL COMPONENTE PADRE
        if (onPaymentSuccess) {
          onPaymentSuccess({
            paymentMethod,
            amount: paymentAmount,
            paymentData: result.data,
            isPartialPayment: paymentAmount < currentFinancialData.pendienteReal,
            remainingAmount: Math.max(0, currentFinancialData.pendienteReal - paymentAmount),
            isFullyPaid: paymentAmount >= currentFinancialData.pendienteReal
          });
        }

      } else {
        throw new Error(result?.error || result?.message || 'Error desconocido al registrar el pago');
      }

    } catch (error) {
      console.error("❌ Error al procesar el pago:", error);
      
      // 🔧 MANEJO MEJORADO DE ERRORES
      let errorMessage = "Error al procesar el pago";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ ${errorMessage}`);
      
    } finally {
      setIsProcessing(false);
      console.groupEnd();
    }
  };

  // 🛡️ PROTECCIÓN: SI NO HAY MONTO PENDIENTE
  if (financialData.pendienteReal <= 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-bold mb-4 text-green-600">Pagos Completados</h3>
            <p className="text-gray-600 mb-4">
              Esta reserva no tiene montos pendientes por pagar.
            </p>
            <div className="bg-green-50 p-3 rounded mb-4">
              <div className="text-sm text-green-700">
                <div>Total pagado: ${financialData.totalPagado.toLocaleString()}</div>
                <div>Total cuenta: ${financialData.totalFinal.toLocaleString()}</div>
              </div>
            </div>
            <button
              onClick={() => onPaymentSuccess && onPaymentSuccess(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 🎯 HEADER */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">💳 Procesar Pago</h3>
            <button
              onClick={() => onPaymentSuccess && onPaymentSuccess(null)}
              className="text-white hover:text-gray-200 text-xl font-bold"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 🏨 INFORMACIÓN DE LA RESERVA */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">📋 Información de la Reserva</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Reserva #{bookingData?.bookingId}</div>
              <div>Habitación: {selectedRoom?.roomNumber || bookingData?.roomNumber}</div>
              <div>Huésped: {currentBuyerData?.scostumername}</div>
              {currentBuyerData?.sdocno && (
                <div>Documento: {currentBuyerData.sdocno}</div>
              )}
            </div>
          </div>

          {/* 💰 RESUMEN FINANCIERO DETALLADO */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">💰 Resumen Financiero</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Costo reserva:</span>
                <span>${financialData.totalReserva.toLocaleString()}</span>
              </div>
              {financialData.totalExtras > 0 && (
                <div className="flex justify-between">
                  <span>Consumos extras:</span>
                  <span>${financialData.totalExtras.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total cuenta:</span>
                <span>${financialData.totalFinal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Ya pagado:</span>
                <span>-${financialData.totalPagado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600 border-t pt-2">
                <span>Pendiente:</span>
                <span>${financialData.pendienteReal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 💸 MONTO A PAGAR */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              💰 Monto a Pagar:
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">$</span>
              <input
                type="number"
                min="0"
                max={financialData.pendienteReal}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setPaymentAmount(Math.min(value, financialData.pendienteReal));
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div>Máximo: ${financialData.pendienteReal.toLocaleString()}</div>
              {paymentAmount < financialData.pendienteReal && paymentAmount > 0 && (
                <div className="text-orange-600">
                  Pago parcial - Quedará pendiente: ${(financialData.pendienteReal - paymentAmount).toLocaleString()}
                </div>
              )}
              {paymentAmount === financialData.pendienteReal && paymentAmount > 0 && (
                <div className="text-green-600">
                  ✅ Pago completo - Se saldará la cuenta
                </div>
              )}
            </div>
          </div>

          {/* 💳 MÉTODO DE PAGO */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              💳 Método de Pago:
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            >
              <option value="cash">💵 Efectivo</option>
              <option value="card">💳 Tarjeta</option>
              <option value="transfer">🏦 Transferencia</option>
              <option value="other">📝 Otro</option>
            </select>
          </div>

          {/* 🎯 BOTONES DE ACCIÓN */}
          <div className="flex gap-3">
            <button
              onClick={() => onPaymentSuccess && onPaymentSuccess(null)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePayment}
              disabled={isProcessing || !paymentAmount || paymentAmount <= 0}
              className={`flex-1 px-4 py-2 rounded-md text-white font-medium transition-colors ${
                isProcessing || !paymentAmount || paymentAmount <= 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </div>
              ) : (
                `💰 Pagar $${parseFloat(paymentAmount || 0).toLocaleString()}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

PaymentAndReceipt.propTypes = {
  bookingData: PropTypes.shape({
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    totalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    extraCharges: PropTypes.array,
    payments: PropTypes.array,
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    checkIn: PropTypes.string,
    checkOut: PropTypes.string,
  }).isRequired,
  amountToPay: PropTypes.number.isRequired,
  currentBuyerData: PropTypes.shape({
    scostumername: PropTypes.string,
    sdocno: PropTypes.string,
    selectronicmail: PropTypes.string,
    stelephone: PropTypes.string,
  }).isRequired,
  selectedRoom: PropTypes.shape({
    type: PropTypes.string,
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onPaymentSuccess: PropTypes.func,
};

export default PaymentAndReceipt;