import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPurchases } from '../../Redux/Actions/purchaseActions';
import { Link } from 'react-router-dom';
import { FaEye, FaSearch, FaPlus, FaFilePdf, FaFileAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../Dashboard/DashboardLayout';

import * as XLSX from 'xlsx';

const PurchaseList = () => {
  const dispatch = useDispatch();
  const { purchases = [], loading } = useSelector(state => state.purchase || {});
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    status: ''
  });

  useEffect(() => {
    dispatch(fetchPurchases());
  }, [dispatch]);

  // Extraer proveedores únicos para el filtro
  const suppliers = [...new Set(purchases.filter(p => p && p.supplier).map(p => p.supplier))];

  // Filtrar compras según criterios
  const filteredPurchases = purchases.filter(purchase => {
    if (!purchase) return false;
    
    // Filtrar por término de búsqueda
    const searchMatch = !search || 
      (purchase.invoiceNumber && purchase.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (purchase.supplier && purchase.supplier.toLowerCase().includes(search.toLowerCase()));
    
    // Filtrar por fecha desde
    const fromDateMatch = !filters.dateFrom || 
      (purchase.purchaseDate && new Date(purchase.purchaseDate) >= new Date(filters.dateFrom));
    
    // Filtrar por fecha hasta
    const toDateMatch = !filters.dateTo || 
      (purchase.purchaseDate && new Date(purchase.purchaseDate) <= new Date(filters.dateTo));
    
    // Filtrar por proveedor
    const supplierMatch = !filters.supplier || purchase.supplier === filters.supplier;
    
    // Filtrar por estado de pago
    const statusMatch = !filters.status || purchase.paymentStatus === filters.status;
    
    return searchMatch && fromDateMatch && toDateMatch && supplierMatch && statusMatch;
  });

  const handleExcelDownload = () => {
  // Define los encabezados
  const data = [
    ['Factura', 'Fecha', 'Proveedor', 'Total', 'Estado', 'Comprobante']
  ];
  // Agrega las filas
  filteredPurchases.forEach(purchase => {
    data.push([
      purchase.invoiceNumber || 'Sin número',
      formatDate(purchase.purchaseDate),
      purchase.supplier,
      parseFloat(purchase.totalAmount || 0).toFixed(2),
      purchase.paymentStatus,
      purchase.receiptUrl || ''
    ]);
  });
  // Crea y descarga el archivo
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Compras');
  XLSX.writeFile(wb, `compras-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      supplier: '',
      status: ''
    });
    setSearch('');
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      console.error("Error formateando fecha:", e);
      return dateString;
    }
  };

  // Función para mostrar estado de pago
  const renderPaymentStatus = (status) => {
    switch(status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Pagado</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Pendiente</span>;
      case 'partial':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Parcial</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  // ⭐ NUEVA FUNCIÓN PARA MOSTRAR EL COMPROBANTE
  const renderReceiptStatus = (receiptUrl) => {
    if (!receiptUrl) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center">
          <FaFileAlt className="mr-1" />
          Sin comprobante
        </span>
      );
    }

    return (
      
      <div className="flex items-center space-x-1">
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
          <FaFilePdf className="mr-1" />
          Disponible
        </span>
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 p-1"
          title="Ver comprobante"
        >
          <FaExternalLinkAlt className="text-xs" />
        </a>
      </div>
    );
  };

  // ⭐ FUNCIÓN PARA ABRIR COMPROBANTE EN MODAL (OPCIONAL)
  const openReceiptModal = (receiptUrl) => {
    if (!receiptUrl) return;
    
    // Crear modal simple para mostrar el PDF
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full h-5/6 flex flex-col">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">Comprobante de Compra</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>
        <div class="flex-1 p-4">
          <iframe src="${receiptUrl}" width="100%" height="100%" class="border-0"></iframe>
        </div>
        <div class="p-4 border-t flex justify-end">
          <a href="${receiptUrl}" target="_blank" class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Abrir en nueva pestaña</a>
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded">Cerrar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  };

  return (
     <DashboardLayout>
    <div className="bg-white shadow-md rounded-lg p-6">
    <button
  onClick={handleExcelDownload}
  className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-600 mr-2"
>
  <FaFileAlt className="mr-2" /> Descargar Excel
</button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Historial de Compras</h2>
        <Link 
          to="/purchaseForm" 
          className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600"
        >
          <FaPlus className="mr-2" /> Nueva Compra
        </Link>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6 flex">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proveedor o número de factura..."
            className="pl-10 w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <select
            value={filters.supplier}
            onChange={(e) => handleFilterChange('supplier', e.target.value)}
            className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {suppliers.map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="partial">Pago Parcial</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="w-full bg-gray-100 text-gray-700 px-4 py-1 rounded-md hover:bg-gray-200"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de compras */}
      {loading ? (
        <div className="text-center py-20">
          <div className="spinner"></div>
          <p className="mt-2 text-gray-600">Cargando compras...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No se encontraron compras con los criterios seleccionados</p>
          <Link to="/purchases/new" className="text-blue-500 hover:underline">
            Registrar una nueva compra
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                {/* ⭐ NUEVA COLUMNA PARA COMPROBANTE */}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Comprobante</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {purchase.invoiceNumber || <span className="text-gray-400">Sin número</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(purchase.purchaseDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {purchase.supplier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    ${parseFloat(purchase.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {renderPaymentStatus(purchase.paymentStatus)}
                  </td>
                  {/* ⭐ NUEVA CELDA PARA MOSTRAR COMPROBANTE */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {renderReceiptStatus(purchase.receiptUrl)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      <Link 
                        to={`/purchases/${purchase.id}`} 
                        className="text-blue-500 hover:text-blue-700"
                        title="Ver detalles"
                      >
                        <FaEye />
                      </Link>
                      {/* ⭐ BOTÓN PARA VER COMPROBANTE EN MODAL (OPCIONAL) */}
                      {purchase.receiptUrl && (
                        <button
                          onClick={() => openReceiptModal(purchase.receiptUrl)}
                          className="text-green-500 hover:text-green-700"
                          title="Ver comprobante en modal"
                        >
                          <FaFilePdf />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

export default PurchaseList;