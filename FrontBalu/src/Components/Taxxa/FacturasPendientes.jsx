import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllBills } from '../../Redux/Actions/bookingActions';
import { sendInvoice } from '../../Redux/Actions/taxxaActions';
import { toast } from 'react-toastify';
import DashboardLayout from '../Dashboard/DashboardLayout';

const FacturasPendientes = () => {
  const dispatch = useDispatch();
  
  // 🔧 CORREGIR EL SELECTOR - Acceder a la estructura anidada del loading
  const { bills, loading, error } = useSelector((state) => {
    console.log('🔍 [FACTURAS] Estado completo de booking:', state.booking);
    
    return {
      bills: state.booking.bills || [],
      loading: state.booking.loading?.bills || false, // ✅ Acceder al loading anidado
      error: state.booking.errors?.bills || null,     // ✅ Acceder al error anidado
    };
  });

  const [selectedBill, setSelectedBill] = useState(null);
  const [sending, setSending] = useState(false);

  // 🔧 CARGAR FACTURAS AL MONTAR EL COMPONENTE
  useEffect(() => {
    console.log('🚀 [FACTURAS] Cargando facturas...');
    dispatch(getAllBills());
  }, [dispatch]);

  // 🔧 LOG PARA DEBUGGING
  useEffect(() => {
    console.log('📊 [FACTURAS] Bills actuales:', bills);
    console.log('📊 [FACTURAS] Loading:', loading);
    console.log('📊 [FACTURAS] Error:', error);
  }, [bills, loading, error]);

  // 🔧 FUNCIÓN PARA ENVIAR FACTURA MEJORADA
  const handleEnviarFactura = async () => {
    if (!selectedBill) {
      toast.error('Por favor, selecciona una factura para enviar.');
      return;
    }

    // Verificar si ya tiene factura fiscal
    if (selectedBill.hasTaxInvoice) {
      toast.warning('Esta factura ya fue enviada a Taxxa.');
      return;
    }

    setSending(true);

    try {
      const invoiceData = {
        idBill: selectedBill.idBill,
        bookingId: selectedBill.bookingId,
        reservationAmount: selectedBill.reservationAmount,
        extraChargesAmount: selectedBill.extraChargesAmount,
        taxAmount: selectedBill.taxAmount,
        totalAmount: selectedBill.totalAmount,
        guest: selectedBill.booking.guest, // Acceder a través de booking.guest
      };

      console.log('📤 [FACTURAS] Enviando factura a Taxxa:', JSON.stringify(invoiceData, null, 2));

      await dispatch(sendInvoice(invoiceData));
      toast.success('Factura enviada a Taxxa con éxito.');
      
      // Recargar las facturas para actualizar el estado
      dispatch(getAllBills());
      setSelectedBill(null);
      
    } catch (error) {
      console.error('❌ [FACTURAS] Error al enviar la factura:', error);
      toast.error('Error al enviar la factura. Por favor, intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  // 🔧 FUNCIÓN PARA FORMATEAR EL ESTADO DE LA FACTURA FISCAL
  const getTaxInvoiceStatus = (bill) => {
    if (bill.hasTaxInvoice) {
      return {
        text: 'Enviada a Taxxa',
        className: 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs'
      };
    }
    return {
      text: 'Pendiente de envío',
      className: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'
    };
  };

  // 🔧 ESTADOS DE CARGA Y ERROR
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando facturas...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error al cargar facturas</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => dispatch(getAllBills())}
                  className="bg-red-100 px-3 py-2 rounded-md text-red-800 hover:bg-red-200 transition-colors"
                >
                  🔄 Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">🧾 Facturas Pendientes</h2>
          <p className="text-gray-600 mt-2">
            Gestiona y envía las facturas a Taxxa para facturación electrónica
          </p>
        </div>

        {/* Debug Info - Mostrará la estructura real del estado */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug:</strong> {bills.length} facturas cargadas | Loading: {loading.toString()} | Error: {error || 'ninguno'}
        </div>

        {/* Lista de Facturas */}
        {bills.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-blue-400 text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">No hay facturas disponibles</h3>
            <p className="text-blue-700">
              Las facturas aparecerán aquí una vez que se completen las reservas.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {bills.map((bill) => {
                const taxStatus = getTaxInvoiceStatus(bill);
                
                return (
                  <div
                    key={bill.idBill}
                    className={`bg-white rounded-lg shadow-md p-6 cursor-pointer border-2 transition-all hover:shadow-lg ${
                      selectedBill?.idBill === bill.idBill 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedBill(bill)}
                  >
                    {/* Header de la Factura */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Factura #{bill.idBill.slice(-8)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Reserva #{bill.bookingId}
                        </p>
                      </div>
                      <span className={taxStatus.className}>
                        {taxStatus.text}
                      </span>
                    </div>

                    {/* Información del Huésped */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700">
                        {bill.guestName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {bill.guestDocument} • {bill.guestEmail}
                      </p>
                    </div>

                    {/* Detalles de la Reserva */}
                    <div className="mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Habitación:</span>
                        <span className="font-medium">{bill.roomNumber} ({bill.roomType})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in:</span>
                        <span>{bill.checkIn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out:</span>
                        <span>{bill.checkOut}</span>
                      </div>
                    </div>

                    {/* Detalles Financieros */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Reserva:</span>
                        <span>{bill.reservationAmountFormatted}</span>
                      </div>
                      {bill.hasExtraCharges && (
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Extras:</span>
                          <span>{bill.extraChargesAmountFormatted}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span className="text-green-600">{bill.totalAmountFormatted}</span>
                      </div>
                    </div>

                    {/* Estado del Pago */}
                    <div className="mt-4 flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        bill.isPaid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {bill.statusLabel}
                      </span>
                      <span className="text-xs text-gray-500">
                        {bill.paymentMethodLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panel de Acción para Factura Seleccionada */}
            {selectedBill && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Factura Seleccionada
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Factura</p>
                    <p className="font-medium">#{selectedBill.idBill.slice(-8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Huésped</p>
                    <p className="font-medium">{selectedBill.guestName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total a Facturar</p>
                    <p className="font-bold text-xl text-green-600">
                      {selectedBill.totalAmountFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado Taxxa</p>
                    <p className={selectedBill.hasTaxInvoice ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                      {selectedBill.hasTaxInvoice ? '✅ Ya enviada' : '⏳ Pendiente'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleEnviarFactura}
                    disabled={sending || selectedBill.hasTaxInvoice}
                    className={`flex-1 py-3 px-6 rounded-md font-medium text-white transition-all ${
                      sending || selectedBill.hasTaxInvoice
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    {sending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando a Taxxa...
                      </span>
                    ) : selectedBill.hasTaxInvoice ? (
                      '✅ Ya enviada a Taxxa'
                    ) : (
                      '📤 Enviar a Taxxa'
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedBill(null)}
                    className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacturasPendientes;