import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllInvoices, createCreditNote } from '../../Redux/Actions/taxxaActions';
import { toast } from 'react-toastify';
import DashboardLayout from '../Dashboard/DashboardLayout';

const InvoiceList = () => {
  const dispatch = useDispatch();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [creditNoteData, setCreditNoteData] = useState({
    creditReason: '1',
    amount: '',
    description: ''
  });

  const { invoices = [], loading = false, error = null } = useSelector((state) => {
    return {
      invoices: state.taxxa.invoices || [],
      loading: state.taxxa.loadingInvoices || false,
      error: state.taxxa.invoicesError || null
    };
  });

  const loadInvoices = async () => {
    try {
      await dispatch(getAllInvoices());
      setRetryAttempts(0); // Reset en éxito
    } catch (error) {
      console.error('Error cargando facturas:', error);
      if (retryAttempts < 3) {
        setRetryAttempts(prev => prev + 1);
        setTimeout(() => {
          console.log(`🔄 Reintentando cargar facturas (intento ${retryAttempts + 1}/3)`);
          loadInvoices();
        }, 2000);
      } else {
        toast.error('Error al cargar las facturas después de varios intentos');
      }
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [dispatch]);


  const handleCreateCreditNote = async () => {
    if (!selectedInvoice || !creditNoteData.amount) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      const result = await dispatch(createCreditNote({
        originalInvoiceId: selectedInvoice.id,
        creditReason: creditNoteData.creditReason,
        amount: parseFloat(creditNoteData.amount),
        description: creditNoteData.description
      }));

      if (result.success) {
        setShowCreditNoteModal(false);
        setSelectedInvoice(null);
        setCreditNoteData({ creditReason: '1', amount: '', description: '' });
        dispatch(getAllInvoices()); // Recargar lista
      }
    } catch (error) {
      console.error('Error creando nota de crédito:', error);
    }
  };

  const creditReasons = {
    '1': 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
    '2': 'Anulación de factura electrónica',
    '3': 'Rebaja o descuento parcial o total',
    '4': 'Ajuste de precio',
    '5': 'Descuento comercial por pronto pago',
    '6': 'Descuento comercial por volumen de ventas'
  };

 if (error && !loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar facturas</h3>
            <p className="text-red-700 mb-4">
              {error || 'Ha ocurrido un error inesperado al cargar las facturas.'}
            </p>
            <button
              onClick={loadInvoices}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Cargando facturas emitidas...
            {retryAttempts > 0 && ` (Intento ${retryAttempts + 1}/3)`}
          </span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">⚡ Facturas Fiscales Emitidas</h2>
          <p className="text-gray-600 mt-2">
            Listado de facturas enviadas exitosamente a Taxxa
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-blue-400 text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">No hay facturas emitidas</h3>
            <p className="text-blue-700">
              Las facturas enviadas a Taxxa aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Factura {invoice.getFullInvoiceNumber || `${invoice.prefix}${invoice.invoiceSequentialNumber}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Bill #{invoice.billId?.slice(-8)}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    ✅ Enviada
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comprador:</span>
                    <span className="font-medium">{invoice.buyerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-xl text-green-600">
                      ${parseFloat(invoice.totalAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CUFE:</span>
                    <span className="text-xs font-mono">{invoice.cufe?.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enviada:</span>
                    <span>{new Date(invoice.sentToTaxxaAt).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setShowCreditNoteModal(true);
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  📝 Crear Nota de Crédito
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal para Nota de Crédito */}
        {showCreditNoteModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">📝 Crear Nota de Crédito</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Factura: {selectedInvoice.getFullInvoiceNumber || `${selectedInvoice.prefix}${selectedInvoice.invoiceSequentialNumber}`}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo:
                    </label>
                    <select
                      value={creditNoteData.creditReason}
                      onChange={(e) => setCreditNoteData({...creditNoteData, creditReason: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(creditReasons).map(([key, value]) => (
                        <option key={key} value={key}>{key}. {value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      max={selectedInvoice.totalAmount}
                      value={creditNoteData.amount}
                      onChange={(e) => setCreditNoteData({...creditNoteData, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo: ${parseFloat(selectedInvoice.totalAmount).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción:
                    </label>
                    <textarea
                      value={creditNoteData.description}
                      onChange={(e) => setCreditNoteData({...creditNoteData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Descripción adicional del motivo..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleCreateCreditNote}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    📝 Crear Nota de Crédito
                  </button>
                  <button
                    onClick={() => {
                      setShowCreditNoteModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InvoiceList;