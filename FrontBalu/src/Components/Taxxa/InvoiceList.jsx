import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllInvoices, createCreditNote } from '../../Redux/Actions/taxxaActions';
import { toast } from 'react-toastify';
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';

const InvoiceList = () => {
  const dispatch = useDispatch();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12); // Facturas por página
  const [totalInvoices, setTotalInvoices] = useState(0);
  
  const [creditNoteData, setCreditNoteData] = useState({
    creditReason: '1',
    amount: '',
    description: ''
  });

  // ⭐ OPTIMIZADO: Selectores separados para evitar recreación de objeto
  const invoices = useSelector((state) => state.taxxa?.invoices || []);
  const loading = useSelector((state) => state.taxxa?.loadingInvoices || false);
  const error = useSelector((state) => state.taxxa?.invoicesError || null);

  const loadInvoices = async (page = currentPage, search = searchTerm) => {
    try {
      const params = {
        page,
        limit,
        status: 'sent'
      };
      
      // ⭐ Agregar búsqueda si existe
      if (search && search.trim() !== '') {
        params.search = search.trim();
      }
      
      const result = await dispatch(getAllInvoices(params));
      
      // ⭐ El action retorna { data, pagination, success, message }
      if (result?.pagination) {
        setTotalInvoices(result.pagination.totalItems || 0);
      } else {
        // Fallback si no hay paginación (lista completa)
        setTotalInvoices(invoices.length);
      }
      
      setRetryAttempts(0); // Reset en éxito
    } catch (error) {
      console.error('Error cargando facturas:', error);
      if (retryAttempts < 3) {
        setRetryAttempts(prev => prev + 1);
        setTimeout(() => {
          console.log(`🔄 Reintentando cargar facturas (intento ${retryAttempts + 1}/3)`);
          loadInvoices(page, search);
        }, 2000);
      } else {
        toast.error('Error al cargar las facturas después de varios intentos');
      }
    }
  };

  useEffect(() => {
    loadInvoices(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Volver a la primera página al buscar
    loadInvoices(1, searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    loadInvoices(1, '');
  };

  const totalPages = Math.ceil(totalInvoices / limit);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };


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
        loadInvoices(); // Recargar lista con parámetros actuales
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

        {/* 🔍 BUSCADOR Y FILTROS */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número de factura (ej: SETT1, 001, 123)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✕ Limpiar
              </button>
            )}
          </form>

          {/* CONTADOR */}
          <div className="mt-3 text-sm text-gray-600 flex justify-between items-center">
            <span>
              {searchTerm ? (
                <>Resultados encontrados: <strong>{totalInvoices}</strong></>
              ) : (
                <>Total de facturas: <strong>{totalInvoices}</strong></>
              )}
            </span>
            <span>
              Página {currentPage} de {totalPages || 1}
            </span>
          </div>
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
                  
                  {/* CUFE Completo con botón de copiar */}
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600 font-medium">CUFE:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invoice.cufe || '');
                          toast.success('CUFE copiado al portapapeles');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        title="Copiar CUFE"
                      >
                        📋 Copiar
                      </button>
                    </div>
                    <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                      {invoice.cufe || 'No disponible'}
                    </p>
                  </div>

                  {/* QR Code */}
                  {invoice.qrCode && (
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600 font-medium">QR Code:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(invoice.qrCode);
                            toast.success('QR Code copiado al portapapeles');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Copiar QR Code"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                        {invoice.qrCode}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Enviada:</span>
                    <span>{new Date(invoice.sentToTaxxaAt).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-2">
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                    >
                      📄 Descargar PDF
                    </a>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowCreditNoteModal(true);
                    }}
                    disabled={invoice.hasCreditNote}
                    className={`w-full px-4 py-2 rounded-md transition-colors ${
                      invoice.hasCreditNote
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={invoice.hasCreditNote ? 'Esta factura ya tiene nota de crédito' : 'Crear nota de crédito'}
                  >
                    {invoice.hasCreditNote ? '✅ Nota de Crédito Creada' : '📝 Crear Nota de Crédito'}
                  </button>
                  
                  {/* Mostrar información de la nota de crédito si existe */}
                  {invoice.hasCreditNote && invoice.creditNoteAmount > 0 && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Nota de Crédito:</strong> ${parseFloat(invoice.creditNoteAmount).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 📄 PAGINACIÓN */}
        {!loading && invoices.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center">
              {/* Botón Anterior */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FaChevronLeft />
                <span>Anterior</span>
              </button>

              {/* Indicador de página */}
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">
                  Página {currentPage} de {totalPages || 1}
                </p>
                <p className="text-sm text-gray-600">
                  Mostrando {invoices.length} de {totalInvoices} facturas
                </p>
              </div>

              {/* Botón Siguiente */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage >= totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>Siguiente</span>
                <FaChevronRight />
              </button>
            </div>
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