import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import jsPDF from "jspdf";
import { registerLocalPayment } from "../../Redux/Actions/paymentActions";

const PaymentAndReceipt = ({
  bookingData,
  amountToPay,
  currentBuyerData,
  selectedRoom,
  onPaymentSuccess,
  onClose, // ✅ AGREGAR PROP onClose QUE FALTABA
}) => {
  const dispatch = useDispatch();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showExtraCharges, setShowExtraCharges] = useState(false);

  // ✅ AGREGAR LOG DE DEBUG PARA IDENTIFICAR PROBLEMAS
  useEffect(() => {
    console.log("💳 [PAYMENT-MODAL] Datos recibidos:", {
      bookingId: bookingData?.bookingId,
      amountToPay,
      hasGuestData: !!currentBuyerData,
      hasRoomData: !!selectedRoom,
      hasPaymentInfo: !!bookingData?.paymentInfo,
      hasFinancialSummary: !!bookingData?.financialSummary
    });
  }, [bookingData, amountToPay, currentBuyerData, selectedRoom]);

  // 🔧 FUNCIÓN PARA FORMATEAR FECHAS
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.warn("Error formateando fecha:", error);
      return 'Fecha inválida';
    }
  };

  // 🔧 FUNCIÓN PARA OBTENER ETIQUETA DEL MÉTODO DE PAGO
  const getPaymentMethodLabel = (method) => {
    const methods = {
      'cash': '💵 Efectivo',
      'credit_card': '💳 Tarjeta de Crédito',
      'debit_card': '💳 Tarjeta de Débito',
      'transfer': '🏦 Transferencia',
      'bank_transfer': '🏦 Transferencia Bancaria',
      'card': '💳 Tarjeta',
      'other': '📝 Otro',
      'online': '🌐 Pago Online',
      'nequi': '📱 Nequi',
      'daviplata': '📱 Daviplata'
    };
    return methods[method] || `📄 ${method}`;
  };

  const { user } = useSelector(state => state.auth);

  // ✅ FUNCIÓN MEJORADA PARA OBTENER DATOS FINANCIEROS - PRIORIZAR BACKEND
  const getFinancialData = () => {
    console.log('📊 [PAYMENT] bookingData recibida:', bookingData);
    
    // ✅ 1. PRIORIZAR financialSummary DEL BACKEND (NUEVO FORMATO)
    if (bookingData?.financialSummary) {
      const fs = bookingData.financialSummary;
      console.log('✅ [PAYMENT] Usando financialSummary del backend:', fs);
      
      return {
        totalReserva: parseFloat(fs.totalReserva || bookingData.totalAmount || 0),
        totalExtras: parseFloat(fs.totalExtras || 0),
        totalPagado: parseFloat(fs.totalPagado || 0),
        totalFinal: parseFloat(fs.totalFinal || fs.totalReserva || 0),
        pendienteReal: parseFloat(fs.totalPendiente || 0),
        allPayments: fs.allPayments || [],
        paymentCount: fs.paymentsCount || 0,
        paymentStatus: fs.paymentStatus || 'unpaid',
        hasExtras: fs.hasExtras || false,
        extraChargesCount: fs.extraChargesCount || 0
      };
    }
    
    // ✅ 2. USAR paymentInfo DEL BACKEND (FORMATO ANTERIOR)
    if (bookingData?.paymentInfo) {
      const paymentInfo = bookingData.paymentInfo;
      const extraChargesInfo = bookingData.extraChargesInfo || {};
      
      const financialData = {
        totalReserva: parseFloat(bookingData.totalAmount || 0),
        totalExtras: parseFloat(extraChargesInfo.totalExtraCharges || 0),
        totalPagado: parseFloat(paymentInfo.totalPaid || 0),
        totalFinal: parseFloat(paymentInfo.totalAmount || bookingData.totalAmount || 0),
        pendienteReal: parseFloat(paymentInfo.balance || 0),
        allPayments: paymentInfo.allPayments || [],
        paymentCount: paymentInfo.paymentCount || 0,
        paymentStatus: paymentInfo.paymentStatus || 'unpaid'
      };

      console.log('📊 [PAYMENT] Usando paymentInfo del backend:', financialData);
      return financialData;
    }

    // ✅ 3. FALLBACK: Cálculo manual si no hay datos del backend
    console.log('⚠️ [PAYMENT] No hay datos financieros del backend, calculando manualmente');
    
    const totalReserva = parseFloat(bookingData?.totalAmount || 0);
    const extraCharges = bookingData?.extraCharges || [];
    const payments = bookingData?.payments || [];
    
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      return sum + (amount * quantity);
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
      pendienteReal,
      allPayments: payments,
      paymentCount: payments.filter(p => p.paymentStatus === 'completed').length,
      paymentStatus: totalPagado >= totalFinal ? 'fully_paid' : totalPagado > 0 ? 'partially_paid' : 'unpaid'
    };
  };

  const financialData = getFinancialData();
  const [paymentAmount, setPaymentAmount] = useState(0);

  // ✅ ACTUALIZAR MONTO CUANDO CAMBIEN LOS DATOS
  useEffect(() => {
    const newFinancialData = getFinancialData();
    const amountToSet = newFinancialData.pendienteReal || amountToPay || 0;
    setPaymentAmount(amountToSet);
    
    console.log('💰 [PAYMENT] Monto actualizado:', {
      pendienteReal: newFinancialData.pendienteReal,
      amountToPay,
      finalAmount: amountToSet
    });
  }, [bookingData, amountToPay]);

  // ✅ FUNCIÓN PRINCIPAL DE PAGO MEJORADA
  const handlePayment = async () => {
    // ❌ Bloquear acción de pago para admin (solo visualiza)
    if (user?.role === 'admin') {
      toast.error('No tienes permisos para procesar pagos desde esta cuenta');
      return;
    }
    // 🛡️ VALIDACIONES EXHAUSTIVAS
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("El monto del pago debe ser mayor a 0");
      return;
    }

    const currentFinancialData = getFinancialData();
    
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

      // ✅ PREPARAR DATOS DEL PAGO
      const paymentData = {
        bookingId: bookingData.bookingId,
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod,
        paymentDate: new Date().toISOString(),
        paymentStatus: 'completed',
        notes: `Pago ${getPaymentMethodLabel(paymentMethod).replace(/[^\w\s]/g, '')} - Check-out`,
        paymentType: 'checkout',
        description: `Pago ${paymentAmount === currentFinancialData.pendienteReal ? 'total' : 'parcial'} de reserva #${bookingData.bookingId}`,
        // ✅ METADATOS ADICIONALES
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

      // ✅ ENVIAR AL BACKEND
      const result = await dispatch(registerLocalPayment(paymentData));
      
      console.log("📥 Resultado del backend:", result);

      if (result?.success || result?.data || !result?.error) {
        console.log("✅ Pago registrado exitosamente");
        
        // ✅ PREPARAR DATOS DEL RESULTADO
        const paymentDetails = {
          paymentId: result.data?.data?.id || result.data?.id || result.paymentId || Date.now(),
          amount: paymentAmount,
          method: paymentMethod,
          date: new Date(),
          bookingId: bookingData.bookingId,
          ...result.data?.data,
          ...result.data
        };

        // ✅ GENERAR RECIBO CON CONTEXTO COMPLETO
        setTimeout(() => {
          generatePDF(paymentDetails);
        }, 500);

        // ✅ MOSTRAR ÉXITO
        const remainingAmount = currentFinancialData.pendienteReal - paymentAmount;
        const successMessage = remainingAmount > 0 
          ? `✅ Pago parcial de $${parseFloat(paymentAmount).toLocaleString()} registrado. Resta: $${remainingAmount.toLocaleString()}`
          : `✅ Pago completo de $${parseFloat(paymentAmount).toLocaleString()} registrado. ¡Cuenta saldada!`;
        
        toast.success(successMessage);
        
        // ✅ NOTIFICAR AL COMPONENTE PADRE CON DATOS COMPLETOS
        if (onPaymentSuccess) {
          onPaymentSuccess({
            bookingId: bookingData.bookingId,
            paymentId: paymentDetails.paymentId,
            amount: paymentAmount,
            paymentMethod,
            paymentData: result.data,
            isPartialPayment: paymentAmount < currentFinancialData.pendienteReal,
            remainingAmount: Math.max(0, currentFinancialData.pendienteReal - paymentAmount),
            isFullyPaid: paymentAmount >= currentFinancialData.pendienteReal,
            // ✅ DATOS ADICIONALES PARA EL HOOK
            success: true,
            payment: paymentDetails,
            financialData: currentFinancialData
          });
        }

        // ✅ CERRAR MODAL DESPUÉS DE UN DELAY
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 1500);

      } else {
        throw new Error(result?.error || result?.message || 'Error desconocido al registrar el pago');
      }

    } catch (error) {
      console.error("❌ Error al procesar el pago:", error);
      
      // ✅ MANEJO MEJORADO DE ERRORES
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

  // 🆕 FUNCIÓN MEJORADA PARA GENERAR PDF CON HISTORIAL COMPLETO
  const generatePDF = (paymentDetails) => {
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: [226.77, 839.28], // Formato ticket
      });

      const date = formatDateTime(new Date());
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
      doc.text("NIT: 1121881455", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;
      doc.text("Calle 8 # 8 -56,  Restrepo -Meta", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;
      doc.text("Tel: 3112061010", pageWidth / 2, currentY, { align: "center" });
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
      const separator = "=".repeat(35);
      doc.text(separator, pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // 👤 DATOS DEL HUÉSPED
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("DATOS DEL HUESPED:", 15, currentY);
      currentY += 15;

      doc.setFont(undefined, 'normal');
      const guestName = currentBuyerData?.scostumername || bookingData?.guest?.scostumername || 'N/A';
      const guestDoc = currentBuyerData?.sdocno || bookingData?.guest?.sdocno || 'N/A';
      
      doc.text(`Nombre: ${guestName}`, 15, currentY);
      currentY += 12;
      doc.text(`Documento: ${guestDoc}`, 15, currentY);
      currentY += 15;

      // 🏨 DATOS DE LA RESERVA
      doc.setFont(undefined, 'bold');
      doc.text("DATOS DE LA RESERVA:", 15, currentY);
      currentY += 15;

      doc.setFont(undefined, 'normal');
      const roomInfo = `${selectedRoom?.type || bookingData?.room?.type || 'Habitacion'} - ${selectedRoom?.roomNumber || bookingData?.roomNumber || 'N/A'}`;
      doc.text(`Habitacion: ${roomInfo}`, 15, currentY);
      currentY += 12;

      doc.text(`Reserva #: ${bookingData?.bookingId || 'N/A'}`, 15, currentY);
      currentY += 12;

      if (bookingData?.checkIn) {
        const checkInFormatted = formatDateTime(bookingData.checkIn).split(' ')[0]; // Solo fecha
        doc.text(`Check-in: ${checkInFormatted}`, 15, currentY);
        currentY += 12;
      }

      if (bookingData?.checkOut) {
        const checkOutFormatted = formatDateTime(bookingData.checkOut).split(' ')[0]; // Solo fecha
        doc.text(`Check-out: ${checkOutFormatted}`, 15, currentY);
        currentY += 12;
      }

      currentY += 15;

      // 💰 SECCIÓN DE CUENTA - REORGANIZADA Y CLARA
      doc.text("-".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text("RESUMEN DE CUENTA", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      doc.text("-".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 10;

      // 📊 DESGLOSE DE LA CUENTA
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      
      // 1. COSTO RESERVA
      doc.text("COSTO RESERVA:", 15, currentY);
      doc.text(`$${financialData.totalReserva.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 12;

      // 2. EXTRAS (SI LOS HAY)
      if (financialData.totalExtras > 0) {
        doc.text("CONSUMOS EXTRAS:", 15, currentY);
        doc.text(`+$${financialData.totalExtras.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 10;
        
        // Detalle de extras si hay pocos
        const extraCharges = bookingData?.extraCharges || [];
        if (extraCharges.length > 0 && extraCharges.length <= 5) {
          doc.setFontSize(7);
          extraCharges.forEach((charge) => {
            const amount = parseFloat(charge.amount || 0);
            const quantity = parseInt(charge.quantity || 1);
            const total = amount * quantity;
            
            const description = (charge.description || 'Extra').substring(0, 20);
            doc.text(`  • ${description}`, 15, currentY);
            doc.text(`$${total.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
            currentY += 8;
          });
          doc.setFontSize(8);
        }
        currentY += 5;
      }

      // 3. TOTAL DE LA CUENTA
      doc.text("-".repeat(25), 15, currentY);
      doc.text("-".repeat(8), pageWidth - 65, currentY);
      currentY += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text("TOTAL CUENTA:", 15, currentY);
      doc.text(`$${financialData.totalFinal.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 15;

      // 🆕 4. HISTORIAL DE PAGOS COMPLETO
      doc.setFont(undefined, 'normal');
      doc.text("HISTORIAL DE PAGOS:", 15, currentY);
      currentY += 12;

      // 🔍 OBTENER PAGOS PREVIOS Y CALCULAR TOTALES
      const currentPaymentAmount = parseFloat(paymentDetails.amount);
      const totalPagadoConEste = financialData.totalPagado + currentPaymentAmount;
      
      // Mostrar pagos anteriores si los hay
      if (financialData.allPayments.length > 0) {
        doc.setFontSize(7);
        
        financialData.allPayments.forEach((payment, index) => {
          const paymentDate = formatDateTime(payment.paymentDate).split(' ')[0];
          const method = getPaymentMethodLabel(payment.paymentMethod).replace(/[^\w\s\-]/g, '').trim();
          
          doc.text(`  ${index + 1}. ${paymentDate} - ${method}`, 15, currentY);
          doc.text(`$${parseFloat(payment.amount).toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
          currentY += 10;
        });
        
        // Subtotal de pagos anteriores
        if (financialData.allPayments.length > 0) {
          doc.setFontSize(8);
          doc.text("Subtotal pagos anteriores:", 15, currentY);
          doc.text(`$${financialData.totalPagado.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
          currentY += 12;
        }
      }

      // 5. ESTE PAGO ACTUAL
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text("PAGO ACTUAL:", 15, currentY);
      doc.text(`$${currentPaymentAmount.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 12;

      // Método de pago actual
      doc.setFont(undefined, 'normal');
      const methodLabel = getPaymentMethodLabel(paymentMethod).replace(/[^\w\s\-]/g, '').trim();
      doc.text(`Metodo: ${methodLabel}`, 15, currentY);
      currentY += 15;

      // 6. TOTAL PAGADO HASTA AHORA (INCLUYENDO ESTE PAGO)
      doc.text("-".repeat(25), 15, currentY);
      doc.text("-".repeat(8), pageWidth - 65, currentY);
      currentY += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text("TOTAL PAGADO:", 15, currentY);
      doc.text(`$${totalPagadoConEste.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 12;

      // 7. SALDO RESTANTE
      const saldoRestante = Math.max(0, financialData.totalFinal - totalPagadoConEste);
      
      if (saldoRestante > 0) {
        doc.setFont(undefined, 'normal');
        doc.text("SALDO PENDIENTE:", 15, currentY);
        doc.text(`$${saldoRestante.toLocaleString()}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 15;
      } else {
        doc.setFont(undefined, 'bold');
        doc.text("CUENTA PAGADA:", 15, currentY);
        doc.text("$0", pageWidth - 15, currentY, { align: "right" });
        currentY += 15;
      }

      // 🎯 LÍNEA SEPARADORA FINAL
      doc.text("=".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // 📊 ESTADO FINAL DE LA CUENTA - MUY CLARO
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      
      if (saldoRestante <= 0) {
        doc.text("✓ PAGO 100%", pageWidth / 2, currentY, { align: "center" });
        currentY += 15;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text("No hay montos pendientes", pageWidth / 2, currentY, { align: "center" });
      } else {
        doc.text("PAGO PARCIAL REALIZADO", pageWidth / 2, currentY, { align: "center" });
        currentY += 15;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Resta pagar: $${saldoRestante.toLocaleString()}`, pageWidth / 2, currentY, { align: "center" });
      }
      
      currentY += 20;

      // 📈 RESUMEN VISUAL RÁPIDO
      doc.text("-".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text("RESUMEN:", pageWidth / 2, currentY, { align: "center" });
      currentY += 12;

      // Porcentaje pagado
      const porcentajePagado = Math.round((totalPagadoConEste / financialData.totalFinal) * 100);
      doc.text(`Pagado: ${porcentajePagado}% de la cuenta total`, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;
      
      // Número total de pagos
      const totalPagosRealizados = financialData.paymentCount + 1; // +1 por este pago
      doc.text(`Total de pagos realizados: ${totalPagosRealizados}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;
      
      if (saldoRestante > 0) {
        const porcentajePendiente = 100 - porcentajePagado;
        doc.text(`Pendiente: ${porcentajePendiente}%`, pageWidth / 2, currentY, { align: "center" });
        currentY += 15;
      } else {
        doc.text("Estado: PAGO COMPLETO", pageWidth / 2, currentY, { align: "center" });
        currentY += 15;
      }

      // 🎯 LÍNEA SEPARADORA FINAL
      doc.text("=".repeat(35), pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // 🙏 MENSAJE DE AGRADECIMIENTO
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("¡Gracias por su pago!", pageWidth / 2, currentY, { align: "center" });
      currentY += 15;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Conserve este recibo", pageWidth / 2, currentY, { align: "center" });
      currentY += 10;
      doc.text("como comprobante de pago", pageWidth / 2, currentY, { align: "center" });

      // 🔧 GENERAR Y MOSTRAR EL PDF
      doc.output("dataurlnewwindow");
      
      console.log("✅ PDF generado exitosamente con historial completo de pagos");
      
    } catch (error) {
      console.error("❌ Error generando PDF:", error);
      toast.error("Error al generar el recibo PDF");
    }
  };

  // 🔧 FUNCIÓN PRINCIPAL DE PAGO MEJORADA
 const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onPaymentSuccess) {
      onPaymentSuccess(null);
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
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ OBTENER DATOS PARA LOS HISTORIALES
  const paymentHistory = financialData.allPayments || bookingData?.payments?.filter(p => p.paymentStatus === 'completed') || [];
  const extraCharges = bookingData?.extraCharges || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* ✅ HEADER MEJORADO */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">💳 Procesar Pago - Reserva #{bookingData?.bookingId}</h3>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 text-xl font-bold"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>
          {/* ✅ MOSTRAR ESTADO DE LOS DATOS */}
          <div className="text-xs mt-2 opacity-75">
            {bookingData?.financialSummary ? '📊 Datos del backend' : 
             bookingData?.paymentInfo ? '📊 PaymentInfo del backend' : 
             '⚠️ Cálculo manual'}
          </div>
        </div>

        <div className="p-6">
          {/* 🏨 INFORMACIÓN DE LA RESERVA */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">📋 Información de la Reserva</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <div>Habitación: {selectedRoom?.roomNumber || bookingData?.roomNumber} ({selectedRoom?.type || bookingData?.room?.type})</div>
                <div>Huésped: {currentBuyerData?.scostumername || bookingData?.guest?.scostumername}</div>
                {(currentBuyerData?.sdocno || bookingData?.guest?.sdocno) && (
                  <div>Documento: {currentBuyerData?.sdocno || bookingData?.guest?.sdocno}</div>
                )}
              </div>
              <div>
                {bookingData?.checkIn && (
                  <div>Check-in: {formatDateTime(bookingData.checkIn)}</div>
                )}
                {bookingData?.checkOut && (
                  <div>Check-out: {formatDateTime(bookingData.checkOut)}</div>
                )}
              </div>
            </div>
          </div>

          {/* 💰 RESUMEN FINANCIERO DETALLADO */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">💰 Resumen Financiero</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Costo reserva:</span>
                <span className="font-medium">${financialData.totalReserva.toLocaleString()}</span>
              </div>
              {financialData.totalExtras > 0 && (
                <div className="flex justify-between">
                  <span>Consumos extras:</span>
                  <span className="font-medium text-blue-600">
                    +${financialData.totalExtras.toLocaleString()}
                    <button
                      onClick={() => setShowExtraCharges(!showExtraCharges)}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {showExtraCharges ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total cuenta:</span>
                <span>${financialData.totalFinal.toLocaleString()}</span>
              </div>
              {financialData.totalPagado > 0 && (
                <div className="flex justify-between">
                  <span>Ya pagado:</span>
                  <span className="text-green-600 font-medium">
                    -${financialData.totalPagado.toLocaleString()}
                    {paymentHistory.length > 0 && (
                      <button
                        onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                        className="ml-2 text-xs text-green-600 hover:text-green-800 underline"
                      >
                        {showPaymentHistory ? 'Ocultar' : 'Ver pagos'}
                      </button>
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-red-600 border-t pt-2">
                <span>Pendiente:</span>
                <span>${financialData.pendienteReal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 📋 HISTORIAL DE PAGOS (EXPANDIBLE) */}
          {showPaymentHistory && paymentHistory.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3">💳 Historial de Pagos</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {paymentHistory.map((payment, index) => (
                  <div key={payment.paymentId || index} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                    <div>
                      <div className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</div>
                      <div className="text-xs text-gray-600">
                        {formatDateTime(payment.paymentDate)}
                      </div>
                      {payment.paymentType && (
                        <div className="text-xs text-gray-500">
                          Tipo: {payment.paymentType}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${parseFloat(payment.amount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">
                        {payment.paymentStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🍽️ DETALLE DE CARGOS EXTRAS (EXPANDIBLE) */}
          {showExtraCharges && extraCharges.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 rounded-lg">
              <h4 className="font-semibold text-amber-800 mb-3">➕ Detalle de Consumos Extras</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {extraCharges.map((charge, index) => {
                  const amount = parseFloat(charge.amount || 0);
                  const quantity = parseInt(charge.quantity || 1);
                  const total = amount * quantity;
                  
                  return (
                    <div key={charge.id || index} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                      <div>
                        <div className="font-medium">{charge.description || 'Cargo extra'}</div>
                        <div className="text-xs text-gray-600">
                          {formatDateTime(charge.chargeDate)}
                        </div>
                        {charge.chargeType && (
                          <div className="text-xs text-gray-500">
                            Tipo: {charge.chargeType}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-amber-600">
                          ${total.toLocaleString()}
                        </div>
                        {quantity > 1 && (
                          <div className="text-xs text-amber-600">
                            {quantity} x ${amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              <button
                onClick={() => setPaymentAmount(financialData.pendienteReal)}
                className="px-3 py-2 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                disabled={isProcessing}
              >
                Máximo
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div>Máximo: ${financialData.pendienteReal.toLocaleString()}</div>
              {paymentAmount < financialData.pendienteReal && paymentAmount > 0 && (
                <div className="text-orange-600">
                  ⚠️ Pago parcial - Quedará pendiente: ${(financialData.pendienteReal - paymentAmount).toLocaleString()}
                </div>
              )}
              {paymentAmount === financialData.pendienteReal && paymentAmount > 0 && (
                <div className="text-green-600">
                  ✅ Pago completo - Se saldará toda la cuenta
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
              <option value="credit_card">💳 Tarjeta de Crédito</option>
              <option value="debit_card">💳 Tarjeta de Débito</option>
              <option value="transfer">🏦 Transferencia</option>
              <option value="other">📝 Otro</option>
            </select>
          </div>

          {/* 🎯 BOTONES DE ACCIÓN */}
         <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePayment}
              disabled={isProcessing || !paymentAmount || paymentAmount <= 0 || user?.role === 'admin'}
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
                ) : user?.role === 'admin' ? (
                  'No tienes permisos para procesar pagos'
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
    paymentInfo: PropTypes.object, // ⭐ DATOS DEL BACKEND (FORMATO ANTERIOR)
    financialSummary: PropTypes.object, // ⭐ DATOS DEL BACKEND (NUEVO FORMATO)
    extraChargesInfo: PropTypes.object, // ⭐ DATOS DEL BACKEND
    guest: PropTypes.object,
    room: PropTypes.object,
  }).isRequired,
  amountToPay: PropTypes.number,
  currentBuyerData: PropTypes.shape({
    scostumername: PropTypes.string,
    sdocno: PropTypes.string,
    selectronicmail: PropTypes.string,
    stelephone: PropTypes.string,
  }),
  selectedRoom: PropTypes.shape({
    type: PropTypes.string,
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onPaymentSuccess: PropTypes.func,
  onClose: PropTypes.func, // ✅ AGREGAR onClose A LOS PropTypes
};

export default PaymentAndReceipt;