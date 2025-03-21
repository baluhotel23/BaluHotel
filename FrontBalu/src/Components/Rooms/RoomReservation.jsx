import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { createBooking } from "../../Redux/Actions/bookingActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, differenceInDays, isValid } from "date-fns";
import { toast } from "react-toastify";
import ParentBuyerRegistration from "../Taxxa/ParentBuyerRegistration"; // Importar el componente de registro
import DashboardLayout from "../Dashboard/DashboardLayout";


const RoomReservation = ({ room }) => {
  const dispatch = useDispatch();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [buyerData, setBuyerData] = useState(null); // Estado para los datos del cliente
  const [isBuyerRegistered, setIsBuyerRegistered] = useState(false); // Estado para verificar si el cliente está registrado

  const today = new Date(); // Obtener la fecha actual

  const calculateTotal = () => {
    if (!checkIn || !checkOut) return 0;

    const totalGuests = adults + children;
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) + 1;

    let pricePerPerson = room.price;
    if (totalGuests === 1) pricePerPerson = 70000;
    else if (totalGuests >= 2 && totalGuests <= 4) pricePerPerson = 60000;
    else if (totalGuests > 4) pricePerPerson = 50000;

    return pricePerPerson * totalGuests * nights;
  };

  const handleBuyerDataComplete = (buyerData) => {
    console.log("Cliente registrado exitosamente:", buyerData);
    setBuyerData(buyerData);
    setIsBuyerRegistered(true); // Marcar al cliente como registrado
  };

  const handleBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.error("Por favor selecciona las fechas de check-in y check-out.");
      return;
    }

    if (!buyerData) {
      toast.error("Por favor completa el registro del cliente.");
      return;
    }

    const totalGuests = adults + children;
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn)) + 1;
    const totalAmount = calculateTotal();

    const bookingData = {
      checkIn,
      checkOut,
      pointOfSale: "Local",
      status: "pending",
      guestCount: totalGuests,
      roomNumber: room.roomNumber,
      totalAmount,
      adults,
      children,
      nights,
      guestId: buyerData.sdocno, // Usar el ID del cliente registrado
      buyerInfo: {
        name: buyerData.scostumername,
        docType: buyerData.wdoctype,
        sdocno: buyerData.sdocno,
        email: buyerData.selectronicmail,
        phone: buyerData.stelephone,
      },
    };

    try {
      const response = await dispatch(createBooking(bookingData));
      if (response.success) {
        toast.success("Reserva creada exitosamente");
      } else {
        toast.error("Error al crear la reserva: " + response.message);
      }
    } catch (error) {
      console.error("Error al crear la reserva:", error);
      toast.error("Error al procesar la reserva: " + error.message);
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setCheckIn(start);
    setCheckOut(end || start); // Si no hay rango, usar la misma fecha para check-in y check-out
  };

  return (
    <DashboardLayout>
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Sección izquierda: Selección de fechas */}
      <div className="lg:w-1/2 bg-gray-100 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Habitación: {room.roomNumber}</h3>
        <Calendar
          selectRange
          onChange={handleDateChange}
          tileDisabled={({ date }) =>
            // Deshabilitar fechas anteriores a hoy o fechas reservadas
            date < today ||
            room.bookedDates.some(
              (booking) =>
                new Date(booking.checkIn) <= date &&
                date <= new Date(booking.checkOut)
            )
          }
        />
        <p className="mt-4">
          <strong>Desde:</strong>{" "}
          {checkIn && isValid(new Date(checkIn))
            ? format(new Date(checkIn), "dd-MM-yyyy")
            : "No seleccionado"}
        </p>
        <p>
          <strong>Hasta:</strong>{" "}
          {checkOut && isValid(new Date(checkOut))
            ? format(new Date(checkOut), "dd-MM-yyyy")
            : "No seleccionado"}
        </p>
        <div className="mt-4">
          <label className="block font-semibold">Adultos:</label>
          <select
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value))}
            className="w-full p-2 border rounded-md"
          >
            {[...Array(room.maxGuests)].map((_, index) => (
              <option key={index} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <label className="block font-semibold">Niños:</label>
          <select
            value={children}
            onChange={(e) => setChildren(parseInt(e.target.value))}
            className="w-full p-2 border rounded-md"
          >
            {[...Array(Math.max(0, room.maxGuests - adults))].map((_, index) => (
              <option key={index} value={index}>
                {index}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-4 text-lg font-semibold">
          Total: ${calculateTotal()}
        </p>
      </div>

      {/* Sección derecha: Detalles y formulario */}
      <div className="lg:w-1/2 bg-white p-6 rounded-lg shadow-md">
        {!isBuyerRegistered ? (
          <div>
           
            <ParentBuyerRegistration onComplete={handleBuyerDataComplete} />
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-light border-2 text-secondary mb-4">
              Reservar Habitación {room.roomNumber}
            </h1>
            <p className="mb-2 text-customYellow">
              <strong>Tipo: </strong> {room.type}
            </p>
            <p className="mb-2  text-customYellow">
              <strong>Descripción:</strong> {room.description}
            </p>
            <p className="mb-2  text-customYellow">
                <strong>Check-In:</strong>{" "}
                {checkIn && isValid(new Date(checkIn))
                  ? format(new Date(checkIn), "dd-MM-yyyy")
                  : "No seleccionado"}
              </p>
              <p className="mb-2  text-customYellow">
                <strong>Check-Out:</strong>{" "}
                {checkOut && isValid(new Date(checkOut))
                  ? format(new Date(checkOut), "dd-MM-yyyy")
                  : "No seleccionado"}
              </p>
              <p className="mb-2  text-customYellow">
  <strong>Cantidad de Personas:</strong> {adults + children}{" "}
  ({adults} adultos, {children} niños)
</p>
            <p className="mb-4  text-teal-950 text-lg">
              <strong>Total:</strong> ${calculateTotal()}
            </p>
            <button
              onClick={handleBooking}
              className="w-full bg-boton text-white py-2 px-4 rounded-md hover:bg-Hover"
            >
              Confirmar Reserva
            </button>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
};

export default RoomReservation;