import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaShoppingCart, FaListAlt, FaFileInvoiceDollar } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';

const PurchasePanel = () => {
  const { user } = useSelector(state => state.auth);

  // Verificar si el usuario tiene permisos para acceder
  const hasPermission = user && (user.role === 'owner' || user.role === 'admin');
  // Verificar si el usuario puede crear compras
  const canCreatePurchase = user && (user.role === 'owner' || user.role === 'recept' || user.role === 'receptionist');

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>No tienes permisos para acceder a esta sección.</p>
          <Link to="/dashboard" className="text-blue-500 underline mt-2 inline-block">
            Volver al Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Panel de Compras</h1>
        <p className="text-gray-600">
          Gestiona el inventario mediante el registro y seguimiento de compras realizadas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Nueva Compra */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">REGISTRAR COMPRA</h2>
              <p className="text-gray-600 mb-4">
                Registra una nueva factura de compra y actualiza el inventario
              </p>
            </div>
            <FaShoppingCart className="text-3xl text-yellow-600" />
          </div>
          {canCreatePurchase ? (
            <Link to="/purchaseForm">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
                NUEVA COMPRA
              </button>
            </Link>
          ) : (
            <button disabled className="bg-gray-300 text-white opacity-80 font-bold py-2 px-4 rounded w-full cursor-not-allowed">
              NO AUTORIZADO
            </button>
          )}
        </div>

        {/* Card 2: Lista de Compras */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">HISTORIAL DE COMPRAS</h2>
              <p className="text-gray-600 mb-4">
                Consulta todas las compras realizadas y sus detalles
              </p>
            </div>
            <FaListAlt className="text-3xl text-blue-600" />
          </div>
          <Link to="/purchaseList">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
              VER COMPRAS
            </button>
          </Link>
        </div>

        {/* Card 3: Reportes de Gastos */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">GASTOS</h2>
              <p className="text-gray-600 mb-4">
              Cargar, editar, listrar y filtrar los gastos existentes
              </p>
            </div>
            <FaFileInvoiceDollar  className="text-3xl text-green-600" />
          </div>
          <Link to="/expenses">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
              GASTOS
            </button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PurchasePanel;