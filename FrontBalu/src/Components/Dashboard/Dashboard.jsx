import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Manage Hotels */}
        {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">Manage Hotels</h2>
            <p className="text-gray-600 mb-4">Create and modify hotel information.</p>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              CREAR/MODIFICAR HOTEL
            </button>
          </div>
        )}

        {/* Card 2: Create Staff */}
        {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">Create Staff</h2>
            <p className="text-gray-600 mb-4">Add new staff members to the system.</p>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              CREAR STAFF
            </button>
          </div>
        )}

        {/* Card 3: Create Room */}
        {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">Create Room</h2>
            <p className="text-gray-600 mb-4">Add new rooms to the hotel.</p>
            <Link to="/admin/create-room">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              CREAR HABITACION
            </button>
            </Link>
          </div>
        )}
               {(user.role === 'owner' || user.role === 'admin') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">Create Room</h2>
            <p className="text-gray-600 mb-4">Add new rooms to the hotel.</p>
            <Link to="/admin/rooms">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              LISTAR HABITACIONES
            </button>
            </Link>
          </div>
        )}

        {/* Card 4: Upload Services */}
        {user.role === 'owner' && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">Upload Services</h2>
            <p className="text-gray-600 mb-4">Add or modify services offered by the hotel.</p>
            <Link to="/admin/services">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                CARGAR SERVICIOS
              </button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;