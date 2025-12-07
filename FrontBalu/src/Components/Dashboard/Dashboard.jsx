import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Manage Hotels */}
        {(user.role === "owner" ||
          user.role === "admin" ||
          user.role === "recept") && (
          <div className="bg-white border border-yellow-500 rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">DISPONIBILIDAD</h2>
            <p className="text-gray-600 mb-4">DISPONIBILIDAD</p>
            <Link to="/admin/localBooking">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                DISPONIBILIDAD
              </button>
            </Link>
          </div>
        )}
        {(user.role === "owner" || user.role === "recept") && (
          <div className="bg-white rounded-lg border border-yellow-500 shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> Check In</h2>
            <p className="text-gray-600 mb-4">CkeckList antes del checkIn</p>
            <Link to="/admin/CheckIn">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CHECK IN
              </button>
            </Link>
          </div>
        )}
        {(user.role === "owner" || user.role === "admin" || user.role === "recept") && (
          <div className="bg-white rounded-lg border border-orange-500 shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">🏨 Gestión Turnos</h2>
            <p className="text-gray-600 mb-4">Vista de habitaciones y gestión de turnos</p>
            <Link to="/admin/rooms-dashboard">
              <button className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 font-bold py-2 px-4 rounded">
                Ingresar
              </button>
            </Link>
          </div>
        )}
        {(user.role === "owner" || user.role === "recept") && (
          <div className="bg-white rounded-lg border border-yellow-500 shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> Check Out</h2>
            <p className="text-gray-600 mb-4">Gestion Habitación Ocupada </p>
            <Link to="/admin/CheckOut">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                CHECK OUT
              </button>
            </Link>
          </div>
        )}{" "}
        {(user.role === "owner" || user.role === "recept") && (
          <div className="bg-white rounded-lg border border-yellow-500 shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">
              {" "}
              LISTADO DE PASAJEROS
            </h2>
            <p className="text-gray-600 mb-4"> LISTADO DE PASAJEROS</p>
            <Link to="/admin/PassengerList">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                LISTADO DE PASAJEROS
              </button>
            </Link>
          </div>
        )}
        {user.role === "owner" && (
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
        {user.role === "owner" && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">COMPRAS Y GASTOS</h2>
            <p className="text-gray-600 mb-4">
              CARGAR Y LISTAR COMPRAS Y GASTOS
            </p>
            <Link to="/purchasePanel">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                COMPRAS Y GASTOS
              </button>
            </Link>
          </div>
        )}
        {user.role === "owner" && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">TAXXA</h2>
            <p className="text-gray-600 mb-4">FACTURACION</p>
            <Link to="/panelTaxxa">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                TAXXA
              </button>
            </Link>
          </div>
        )}
        {(user.role === "owner" || user.role === "admin") && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2"> BALANCE FINANCIERO</h2>
            <p className="text-gray-600 mb-4"> BALANCE FINANCIERO</p>
            <Link to="/balance">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                BALANCE FINANCIERO
              </button>
            </Link>
          </div>
        )}
        {(user.role === "owner" ||
          
          user.role === "recept") && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">
              {" "}
              RESERVAS FINALIZADAS
            </h2>
            <p className="text-gray-600 mb-4"> RESERVAS FINALIZADAS </p>
            <Link to="/admin/completas">
              <button className=" bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                RESERVAS FINALIZADAS
              </button>
            </Link>
          </div>
        )}
        {user.role === "owner" && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">
              CREAR/MODIFICAR HOTEL
            </h2>
            <p className="text-gray-600 mb-4">
              Modificar la informacion del Hotel.
            </p>
            <Link to="/panelConfiguracion">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                DATOS HOTEL
              </button>
            </Link>
          </div>
        )}
        {user.role === "owner" && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
            <h2 className="text-xl font-semibold mb-2">GESTIONAR VOUCHERS</h2>
            <p className="text-gray-600 mb-4">CANCELACIONES</p>
            <Link to="/vouchers">
              <button className="bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded">
                VOUCHERS
              </button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
