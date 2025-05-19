import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchPurchaseDetail } from '../../Redux/Actions/purchaseActions';
import { FaArrowLeft, FaFilePdf, FaPrint, FaExclamationCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import DashboardLayout from '../Dashboard/DashboardLayout';

const PurchaseDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPurchase = async () => {
      try {
        setLoading(true);
        const result = await dispatch(fetchPurchaseDetail(id));
        if (result.success) {
          setPurchase(result.data);
        } else {
          setError('No se pudo cargar la información de la compra');
        }
      } catch (err) {
        setError(err.message || 'Error al cargar los detalles de la compra');
      } finally {
        setLoading(false);
      }
    };

    loadPurchase();
  }, [dispatch, id]);

  // Función para formatear fechas
  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '-';
    
    try {
      const formatStr = includeTime ? 'dd MMMM yyyy, HH:mm' : 'dd MMMM yyyy';
      return format(new Date(dateString), formatStr, { locale: es });
    } catch (e) {
      console.error('Error al formatear fecha:', e);
      return dateString;
    }
  };

  // Método de pago en formato legible
  const getPaymentMethodText = (method) => {
    const methods = {
      cash: 'Efectivo',
      credit_card: 'Tarjeta de Crédito',
      transfer: 'Transferencia',
      credit: 'Crédito'
    };
    return methods[method] || method;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info('Funcionalidad de exportación a PDF en desarrollo');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
        <span className="ml-2">Cargando detalles de la compra...</span>
      </div>
    );
  }

  if (error || !purchase) {
    return (
       
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center text-red-800 mb-4">
          <FaExclamationCircle className="text-xl mr-2" />
          <h3 className="text-lg font-medium">Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error || 'No se encontró la compra solicitada'}</p>
        <button
          onClick={() => navigate('/purchasePanel')}
          className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
        >
          Volver al Panel
        </button>
      </div>
    );
  }

  return (
  <DashboardLayout>
    <div className="bg-white shadow-md rounded-lg p-6 max-w-5xl mx-auto print:shadow-none print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link to="/purchases" className="flex items-center text-blue-500 hover:text-blue-700">
          <FaArrowLeft className="mr-2" /> Volver al listado
        </Link>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded flex items-center hover:bg-gray-200"
          >
            <FaPrint className="mr-1" /> Imprimir
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-red-100 text-red-700 px-3 py-1 rounded flex items-center hover:bg-red-200"
          >
            <FaFilePdf className="mr-1" /> PDF
          </button>
        </div>
      </div>

      <div className="print:py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Detalle de Compra</h1>
          <p className="text-gray-600">
            Factura {purchase.invoiceNumber ? `#${purchase.invoiceNumber}` : 'Sin número'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-2 border-b pb-2">Información de la Compra</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Proveedor:</span> {purchase.supplier}</p>
              <p><span className="font-medium">Fecha de Compra:</span> {formatDate(purchase.purchaseDate)}</p>
              <p>
                <span className="font-medium">Método de Pago:</span> {getPaymentMethodText(purchase.paymentMethod)}
              </p>
              <p>
                <span className="font-medium">Estado de Pago:</span>{' '}
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full 
                  ${purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : ''} 
                  ${purchase.paymentStatus === 'pending' ? 'bg-red-100 text-red-800' : ''}
                  ${purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : ''}`}>
                  {purchase.paymentStatus === 'paid' && 'Pagado'}
                  {purchase.paymentStatus === 'pending' && 'Pendiente'}
                  {purchase.paymentStatus === 'partial' && 'Pago Parcial'}
                </span>
              </p>
              {purchase.notes && (
                <div>
                  <span className="font-medium">Notas:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded mt-1 text-sm">{purchase.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2 border-b pb-2">Resumen</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Total de Productos:</span> {purchase.PurchaseItems?.length || 0}</p>
              <p>
                <span className="font-medium">Total Unidades:</span>{' '}
                {purchase.PurchaseItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
              </p>
              <div className="mt-4 pt-2 border-t">
                <p className="text-xl font-bold text-gray-800">
                  Total: ${parseFloat(purchase.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Productos Comprados</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchase.PurchaseItems && purchase.PurchaseItems.map((item) => (
                <tr key={item.id || `item-${Math.random()}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.Item?.name || item.Item?.itemName || 'Producto no disponible'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.Item?.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.quantity || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${parseFloat(item.price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    ${parseFloat(item.total || item.quantity * item.price || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan="3" className="px-6 py-4 text-right font-semibold">Total:</td>
                <td className="px-6 py-4 text-right font-bold">
                  ${parseFloat(purchase.totalAmount || 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-8 text-sm text-gray-500 border-t pt-4 print:mt-16">
          <p>Fecha de registro: {formatDate(purchase.createdAt, true)}</p>
          {purchase.updatedAt && purchase.updatedAt !== purchase.createdAt && (
            <p>Última actualización: {formatDate(purchase.updatedAt, true)}</p>
          )}
          <p>ID de compra: {purchase.id}</p>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default PurchaseDetail;