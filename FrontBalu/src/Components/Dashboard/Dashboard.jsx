// eslint-disable-next-line no-unused-vars
import React from 'react'
import { Link } from 'react-router-dom';

const Dasboard = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Manage Hotels */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300">
          <h2 className="text-lg font-semibold mb-2">Manage Hotels</h2>
          <p className="text-gray-600">Create and modify hotel information.</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            CREAR/MODIFICAR HOTEL
          </button>
        </div>

        {/* Card 2: Create Staff */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300">
          <h2 className="text-lg font-semibold mb-2">Create Staff</h2>
          <p className="text-gray-600">Add new staff members to the system.</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            CREAR STAFF
          </button>
        </div>

        {/* Card 3: Create Room */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300">
          <h2 className="text-lg font-semibold mb-2">Create Room</h2>
          <p className="text-gray-600">Add new rooms to the hotel.</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            CREAR HABITACION
          </button>
        </div>

        {/* Card 4: Upload Services */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300">
          <h2 className="text-lg font-semibold mb-2">Upload Services</h2>
          <p className="text-gray-600">Add or modify services offered by the hotel.</p>
          <Link to="/admin/services">
            <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              CARGAR SERVICIOS
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dasboard