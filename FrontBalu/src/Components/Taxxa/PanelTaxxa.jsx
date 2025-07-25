import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {  FaListAlt, FaClock } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';

const PanelTaxxa = () => {
  const { user } = useSelector(state => state.auth);

  // Verificar si el usuario tiene permisos para acceder
  const hasPermission = user && (user.role === 'owner' || user.role === 'admin');

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
        <h1 className="text-2xl font-bold mb-2">Panel de Facturación</h1>
        <p className="text-gray-600">
          Gestiona la facturación mediante el registro y seguimiento de comprobantes pendientes y emitidos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Nueva Compra */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">Reservas Pendientes de Factura</h2>
              <p className="text-gray-600 mb-4">
                Listado de facturas Pendientes de ser enviadas a Taxxa
              </p>
            </div>
            <FaClock className="text-3xl text-yellow-600" />
          </div>
          <Link to="/pendientInvoices">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
              Listado de reservas Pendientes
            </button>
          </Link>
        </div>

        {/* Card 2: Lista de Compras */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">Facturas Emitidas</h2>
              <p className="text-gray-600 mb-4">
                Consulta todas las facturas emitidas y sus detalles
              </p>
            </div>
            <FaListAlt className="text-3xl text-blue-600" />
          </div>
          <Link to="/invoiceList">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
              VER FACTURAS
            </button>
          </Link>
        </div>

        {/* Card 2: Facuras manual */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mb-2">Factura Manual</h2>
              <p className="text-gray-600 mb-4">
                Gestionar facturas manuales
              </p>
            </div>
            <FaListAlt className="text-3xl text-blue-600" />
          </div>
          <Link to="/facturaManual">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded w-full">
              FACTURACION MANUAL
            </button>
          </Link>
        </div>

       </div>
    </DashboardLayout>
  );
};

export default PanelTaxxa;