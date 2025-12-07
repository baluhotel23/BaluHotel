import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaListAlt, FaClock } from "react-icons/fa";
import DashboardLayout from "../Dashboard/DashboardLayout";

const ConfiguracionHotel = () => {
  const { user } = useSelector((state) => state.auth);

  // Verificar si el usuario tiene permisos para acceder
  const hasPermission = user && (user.role === "owner" || user.role === "admin");
  const canCreateRoom = user && user.role === 'owner';
  const canManageServices = user && user.role === 'owner';

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>No tienes permisos para acceder a esta sección.</p>
          <Link
            to="/dashboard"
            className="text-blue-500 underline mt-2 inline-block"
          >
            Volver al Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Configuración del Hotel</h1>
        <p className="text-gray-600">
          Gestiona la configuración del hotel, incluyendo staff y habitaciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {(user.role === 'owner' || user.role === 'admin') && (
                 <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
                   <h2 className="text-xl font-semibold mb-2">CREAR/MODIFICAR HOTEL</h2>
                   <p className="text-gray-600 mb-4">Modificar la informacion del Hotel.</p>
                   <Link to="/hotelSetting">
                   <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                     DATOS HOTEL
                   </button>
                   </Link>
                 </div>
               )}
        {user.role === "owner" && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">CREAR STAFF</h2>
            <p className="text-gray-600 mb-4">Crear el staff de trabajo.</p>
            <Link to="/register">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CREAR STAFF
              </button>
            </Link>
          </div>
        )}
        {canCreateRoom && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> CREAR HABITACION</h2>
            <p className="text-gray-600 mb-4">Agregar habitaciones.</p>
            <Link to="/admin/create-room">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CREAR HABITACION
              </button>
            </Link>
          </div>
        )}
        {canCreateRoom && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">LISTAR HABITACIONES</h2>
            <p className="text-gray-600 mb-4">Ver todas las habitaciones.</p>
            <Link to="/admin/rooms">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                LISTAR HABITACIONES
              </button>
            </Link>
          </div>
        )}

        {canManageServices && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">CARGAR SERVICIOS</h2>
            <p className="text-gray-600 mb-4">Cargar nuevos servicios.</p>
            <Link to="/admin/services">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CARGAR SERVICIOS
              </button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConfiguracionHotel;
