import React, { useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import jsPDF from "jspdf";

const PaymentAndReceipt = ({
  bookingData,
  amountToPay,
  currentBuyerData,
  selectedRoom,
  onPaymentSuccess,
}) => {
  const dispatch = useDispatch();
  const [paymentMethod, setPaymentMethod] = useState("cash"); // Default: efectivo
  const [isProcessing, setIsProcessing] = useState(false);

  const generatePDF = () => {
    const doc = new jsPDF({
      unit: "pt",
      format: [226.77, 839.28],
    });

    const date = new Date().toLocaleDateString("es-CO");
    const receiptNumber = `#${Date.now()}`;

    doc.setFontSize(18);
    doc.text("Balu Hotel", doc.internal.pageSize.width / 2, 30, {
      align: "center",
    });

    doc.setFontSize(10);
    let currentY = 50;

    doc.text(`RECIBO ${receiptNumber}`, doc.internal.pageSize.width / 2, currentY, {
      align: "center",
    });
    currentY += 20;

    doc.text(`Fecha: ${date}`, doc.internal.pageSize.width / 2, currentY, {
      align: "center",
    });
    currentY += 30;

    doc.text(
      "***************************",
      doc.internal.pageSize.width / 2,
      currentY,
      { align: "center" }
    );
    currentY += 20;

    doc.text(`Huésped: ${currentBuyerData.scostumername}`, 20, currentY);
    currentY += 20;

    doc.text(`Documento: ${currentBuyerData.sdocno}`, 20, currentY);
    currentY += 20;

    doc.text(`Email: ${currentBuyerData.selectronicmail}`, 20, currentY);
    currentY += 20;

    doc.text(`Teléfono: ${currentBuyerData.stelephone}`, 20, currentY);
    currentY += 30;

    doc.text(`Habitación: ${selectedRoom.type} - ${selectedRoom.roomNumber}`, 20, currentY);
    currentY += 20;

    doc.text(`Check-in: ${bookingData.checkIn}`, 20, currentY);
    currentY += 20;

    doc.text(`Check-out: ${bookingData.checkOut}`, 20, currentY);
    currentY += 20;

    doc.text(`Monto Total: $${bookingData.totalAmount}`, 20, currentY);
    currentY += 20;

    doc.text(`Monto Pagado: $${amountToPay}`, 20, currentY);
    currentY += 20;

    doc.text(`Método de Pago: ${paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}`, 20, currentY);
    currentY += 30;

    doc.text(
      "***************************",
      doc.internal.pageSize.width / 2,
      currentY,
      { align: "center" }
    );
    currentY += 20;

    doc.text(
      "Gracias por elegirnos!",
      doc.internal.pageSize.width / 2,
      currentY,
      { align: "center" }
    );

    doc.output("dataurlnewwindow");
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Simular el procesamiento del pago
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generar el recibo en PDF
      generatePDF();

      toast.success("Pago realizado exitosamente.");
      if (onPaymentSuccess) {
        onPaymentSuccess({ paymentMethod, amount: amountToPay });
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      toast.error("Error al procesar el pago. Intente nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-bold mb-4">Procesar Pago</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Método de Pago:</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
        </select>
      </div>
      <div className="mb-4">
        <span className="block text-sm font-medium">Monto a Pagar:</span>
        <span className="text-lg font-bold">${amountToPay.toLocaleString()}</span>
      </div>
      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className={`w-full px-4 py-2 rounded text-white ${
          isProcessing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isProcessing ? "Procesando..." : "Pagar"}
      </button>
    </div>
  );
};

PaymentAndReceipt.propTypes = {
  bookingData: PropTypes.object.isRequired,
  amountToPay: PropTypes.number.isRequired,
  currentBuyerData: PropTypes.shape({
    scostumername: PropTypes.string,
    sdocno: PropTypes.string,
    selectronicmail: PropTypes.string.isRequired,
    stelephone: PropTypes.string,
  }).isRequired,
  selectedRoom: PropTypes.shape({
    type: PropTypes.string,
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onPaymentSuccess: PropTypes.func,
};

export default PaymentAndReceipt;
  