import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);

  return (
    <DashboardLayout>
     
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Manage Hotels */}
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

        {/* Card 2: Create Staff */}
        {(user.role === 'owner' ) && (
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

        {/* Card 3: Create Room */}
        {(user.role === 'owner' || user.role === 'admin') && (
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
        {(user.role === 'owner' || user.role === 'admin' || user.role === 'recept') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> Check In</h2>
            <p className="text-gray-600 mb-4">CkeckList antes del checkIn</p>
            <Link to="/admin/CheckIn">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
              CHECK IN
            </button>
            </Link>
          </div>
        )}
         {(user.role === 'owner' || user.role === 'admin' || user.role === 'recept') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> Check Out</h2>
            <p className="text-gray-600 mb-4">Gestion Habitación Ocupada </p>
            <Link to="/admin/CheckOut">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
              CHECK OUT
            </button>
            </Link>
          </div>
        )}
               {(user.role === 'owner' || user.role === 'admin') && (
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

        {(user.role === 'owner' || user.role === 'admin') && (
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

        {/* Card 4: Upload Services */}
        {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">TAXXA</h2>
            <p className="text-gray-600 mb-4">Facturación</p>
            <Link to="/admin/pendientesFactura">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                TAXXA
              </button>
            </Link>
          </div>
        )}
         {(user.role === 'owner' || user.role === 'recept') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">DISPONIBILIDAD</h2>
            <p className="text-gray-600 mb-4">DISPONIBILIDAD</p>
            <Link to="/admin/localBooking">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                DISPONIBILIDAD
              </button>
            </Link>
          </div>
        )}
              {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> LISTADO DE PASAJEROS</h2>
            <p className="text-gray-600 mb-4"> LISTADO DE PASAJEROS</p>
            <Link to="/admin/PassengerList">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                LISTADO DE PASAJEROS
              </button>
            </Link>
          </div>
        )}
           {/* {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> CHEK ROOM</h2>
            <p className="text-gray-600 mb-4"> CHEK ROOM</p>
            <Link to="/roomCheck">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CHEK ROOM
              </button>
            </Link>
          </div>
        )} */}
         {(user.role === 'owner' ) && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">CARGAR INVENTARIO</h2>
            <p className="text-gray-600 mb-4">Crear y modificar inventario.</p>
            <Link to="/inventory">
            <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
              STOCK
            </button>
            </Link>
          </div>
        )}

       
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;