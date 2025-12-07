/* eslint-disable no-unused-vars */
import React from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../Dashboard/DashboardLayout'

const Unauthorized = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">🚫 No autorizado</h1>
          <p className="text-gray-600 mb-6">No tienes permisos para acceder a esta sección o realizar esta acción.</p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Volver al Dashboard
            </Link>
            <Link to="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Ir a Inicio
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Unauthorized