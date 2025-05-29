import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllBills } from '../../Redux/Actions/bookingActions';
import { sendInvoice } from '../../Redux/Actions/taxxaActions';
import { toast } from 'react-toastify';
import DashboardLayout from '../Dashboard/DashboardLayout';

const FacturasPendientes = () => {
  const dispatch = useDispatch();
  const { bills = [], loading = false, error = null } = useSelector((state) => ({
    bills: state.booking.bills || [],
    loading: state.booking.loading || false,
    error: state.booking.error || null,
  }));

  const [selectedBill, setSelectedBill] = useState(null); // Estado para la factura seleccionada

  useEffect(() => {
    dispatch(getAllBills()); // Obtener todas las facturas
  }, [dispatch]);

  const handleEnviarFactura = async () => {
  if (!selectedBill) {
    toast.error('Por favor, selecciona una factura para enviar.');
    return;
  }

  try {
    const invoiceData = {
      idBill: selectedBill.idBill,
      bookingId: selectedBill.bookingId,
      reservationAmount: selectedBill.reservationAmount,
      extraChargesAmount: selectedBill.extraChargesAmount,
      taxAmount: selectedBill.taxAmount,
      totalAmount: selectedBill.totalAmount,
      guest: selectedBill.Booking.guest, // Información del huésped
    };

    // Log para verificar los datos que se están enviando al backend
    console.log('Datos enviados al backend (invoiceData):', JSON.stringify(invoiceData, null, 2));

    await dispatch(sendInvoice(invoiceData));
    toast.success('Factura enviada a Taxxa con éxito.');
  } catch (error) {
    console.error('Error al enviar la factura:', error);
    toast.error('Error al enviar la factura. Por favor, intenta nuevamente.');
  }
};

  if (loading) return <div>Cargando facturas...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Facturas Pendientes</h2>
        {bills.length === 0 ? (
          <div className="bg-blue-50 p-4 text-blue-700 rounded mb-4">
            No hay facturas disponibles.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bills.map((bill) => (
              <div
                key={bill.idBill}
                className={`bg-white rounded shadow p-4 cursor-pointer ${
                  selectedBill?.idBill === bill.idBill ? 'border-2 border-blue-600' : ''
                }`}
                onClick={() => setSelectedBill(bill)} // Seleccionar factura
              >
                <p><strong>Reserva:</strong> #{bill.bookingId}</p>
                <p><strong>Total:</strong> ${bill.totalAmount}</p>
                <p><strong>Estado:</strong> {bill.status}</p>
              </div>
            ))}
          </div>
        )}
        {selectedBill && (
          <div className="mt-4">
            <p>
              <strong>Factura seleccionada:</strong> #{selectedBill.idBill} - Total: ${selectedBill.totalAmount}
            </p>
            <button
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleEnviarFactura}
            >
              Enviar factura seleccionada a Taxxa
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacturasPendientes;