import React from "react";
import { useSelector } from "react-redux";
import Navbar from "./Navbar";

const ThankYouPage = () => {
  const buyer = useSelector((state) => state.taxxa.buyer);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-colorBeige py-12 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold text-pink-600 text-center mb-6">
            ¡Gracias por tu reserva!
          </h1>
          <p className="text-gray-700 text-center mb-4">
            Tu reserva ha sido procesada con éxito.
          </p>
          {buyer && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-semibold text-pink-700 mb-2">
                Detalles del comprador
              </h2>
              <p className="text-gray-600">
                <b>Nombre:</b> {buyer.name || buyer.fullName || "-"}<br />
                <b>Documento:</b> {buyer.sdocno || buyer.document || "-"}<br />
                <b>Email:</b> {buyer.email || "-"}
              </p>
            </div>
          )}
          <p className="text-gray-700 text-center">
            Si tienes alguna pregunta o necesitas asistencia, no dudes en{" "}
            <span className="font-semibold text-pink-600">contactarnos</span>.
          </p>
        </div>
      </div>
    </>
  );
};

export default ThankYouPage;




