import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createBooking } from "../../Redux/Actions/bookingActions";
import { calculateRoomPrice } from "../../Redux/Actions/roomActions"; // ⭐ NUEVA IMPORTACIÓN
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, differenceInDays, isValid } from "date-fns";
import { toast } from "react-toastify";
//import ParentBuyerRegistration from "../Taxxa/ParentBuyerRegistration";
import DashboardLayout from "../Dashboard/DashboardLayout";

const RoomReservation = ({ room }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [buyerData, setBuyerData] = useState(null);
  const [isBuyerRegistered, setIsBuyerRegistered] = useState(false);
  
  // ⭐ NUEVOS ESTADOS PARA MANEJO DE PRECIOS
  const [totalAmount, setTotalAmount] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  const today = new Date();

  // ⭐ NUEVA FUNCIÓN PARA CALCULAR PRECIOS CON EL BACKEND
  const calculateTotal = async () => {
    if (!checkIn || !checkOut || !room?.roomNumber) {
      setTotalAmount(0);
      setPriceBreakdown(null);
      return;
    }

    const totalGuests = adults + children;
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    
    if (nights <= 0 || totalGuests <= 0) {
      setTotalAmount(0);
      setPriceBreakdown(null);
      return;
    }

    setPriceLoading(true);
    
    try {
      const result = await dispatch(calculateRoomPrice({
        roomNumber: room.roomNumber,
        guestCount: totalGuests,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        promoCode: promoCode || null
      }));

      if (result.success) {
        setTotalAmount(result.data.totalAmount);
        setPriceBreakdown(result.data.breakdown);
        
        if (result.data.isPromotion) {
          toast.success(`¡Precio promocional aplicado! $${result.data.pricePerNight.toLocaleString()} por noche`);
        }
      } else {
        console.error('Error calculating price:', result.error);
        setTotalAmount(0);
        setPriceBreakdown(null);
        toast.error('Error al calcular el precio');
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      setTotalAmount(0);
      setPriceBreakdown(null);
      toast.error('Error al calcular el precio');
    } finally {
      setPriceLoading(false);
    }
  };

  // ⭐ EFECTO PARA RECALCULAR PRECIOS AUTOMÁTICAMENTE
  useEffect(() => {
    if (checkIn && checkOut && room?.roomNumber && adults >= 1) {
      calculateTotal();
    } else {
      setTotalAmount(0);
      setPriceBreakdown(null);
    }
  }, [checkIn, checkOut, adults, children, promoCode, room?.roomNumber]);

  const handleBuyerDataComplete = (buyerData) => {
    console.log("Cliente registrado exitosamente:", buyerData);
    setBuyerData(buyerData);
    setIsBuyerRegistered(true);
  };

  const handleBooking = async () => {
    if (user?.role === 'admin') {
      toast.error('No tienes permisos para crear reservas locales');
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Por favor selecciona las fechas de check-in y check-out.");
      return;
    }

    if (!buyerData) {
      toast.error("Por favor completa el registro del cliente.");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Error en el cálculo del precio. Por favor intenta nuevamente.");
      return;
    }

    const totalGuests = adults + children;
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

    const bookingData = {
      checkIn,
      checkOut,
      pointOfSale: "Local",
      status: "pending",
      guestCount: totalGuests,
      roomNumber: room.roomNumber,
      totalAmount, // ⭐ USAR EL TOTAL CALCULADO POR EL BACKEND
      adults,
      children,
      nights,
      guestId: buyerData.sdocno,
      // ⭐ AGREGAR INFORMACIÓN DEL BREAKDOWN SI ESTÁ DISPONIBLE
      priceBreakdown: priceBreakdown,
      promoCode: promoCode || null,
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
        // ⭐ LIMPIAR FORMULARIO DESPUÉS DE RESERVA EXITOSA
        setCheckIn(null);
        setCheckOut(null);
        setAdults(1);
        setChildren(0);
        setPromoCode('');
        setTotalAmount(0);
        setPriceBreakdown(null);
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
    setCheckOut(end || start);
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
              date < today ||
              room.bookedDates?.some(
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

          {/* ⭐ CAMPO DE CÓDIGO PROMOCIONAL */}
          <div className="mt-4">
            <label className="block font-semibold mb-2">Código Promocional (Opcional):</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded-md"
              placeholder="Ingrese código promocional"
            />
          </div>

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

          {/* ⭐ MOSTRAR BREAKDOWN DE PRECIO */}
          {priceLoading && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-blue-600">Calculando precio...</p>
            </div>
          )}

          {priceBreakdown && !priceLoading && (
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <h4 className="font-semibold mb-2">Detalle del Precio:</h4>
              <div className="text-sm space-y-1">
                <p>Precio base por noche: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                <p>Noches: {priceBreakdown.nights}</p>
                <p>Huéspedes: {priceBreakdown.guestCount}</p>
                {priceBreakdown.extraGuestCharges > 0 && (
                  <p>Cargo por huéspedes extra: ${priceBreakdown.extraGuestCharges?.toLocaleString()}</p>
                )}
                <hr className="my-2" />
                <p className="font-bold text-lg">Total: ${totalAmount.toLocaleString()}</p>
              </div>
            </div>
          )}

          {!priceBreakdown && !priceLoading && totalAmount > 0 && (
            <p className="mt-4 text-lg font-semibold text-green-600">
              Total: ${totalAmount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Sección derecha: Detalles y formulario */}
        <div className="lg:w-1/2 bg-white p-6 rounded-lg shadow-md">
          {!isBuyerRegistered ? (
            <div>
              {/* <ParentBuyerRegistration onComplete={handleBuyerDataComplete} /> */}
              <p className="text-center text-gray-500">
                Componente de registro de cliente aquí
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-light border-2 text-secondary mb-4">
                Reservar Habitación {room.roomNumber}
              </h1>
              <p className="mb-2 text-customYellow">
                <strong>Tipo: </strong> {room.type}
              </p>
              <p className="mb-2 text-customYellow">
                <strong>Descripción:</strong> {room.description}
              </p>
              <p className="mb-2 text-customYellow">
                <strong>Check-In:</strong>{" "}
                {checkIn && isValid(new Date(checkIn))
                  ? format(new Date(checkIn), "dd-MM-yyyy")
                  : "No seleccionado"}
              </p>
              <p className="mb-2 text-customYellow">
                <strong>Check-Out:</strong>{" "}
                {checkOut && isValid(new Date(checkOut))
                  ? format(new Date(checkOut), "dd-MM-yyyy")
                  : "No seleccionado"}
              </p>
              <p className="mb-2 text-customYellow">
                <strong>Cantidad de Personas:</strong> {adults + children}{" "}
                ({adults} adultos, {children} niños)
              </p>

              {/* ⭐ MOSTRAR BREAKDOWN DETALLADO EN LA CONFIRMACIÓN */}
              {priceBreakdown && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="font-semibold mb-2">Resumen de Precios:</h4>
                  <div className="text-sm space-y-1">
                    <p>Precio por noche: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                    <p>Noches: {priceBreakdown.nights}</p>
                    <p>Huéspedes: {priceBreakdown.guestCount}</p>
                    {promoCode && (
                      <p className="text-green-600 font-medium">
                        Código promocional aplicado: {promoCode}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p className="mb-4 text-teal-950 text-lg">
                <strong>Total:</strong> ${totalAmount.toLocaleString()}
              </p>
              
              <button
                onClick={handleBooking}
                disabled={priceLoading || totalAmount <= 0 || user?.role === 'admin'}
                className="w-full bg-boton text-white py-2 px-4 rounded-md hover:bg-Hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {priceLoading ? 'Calculando...' : user?.role === 'admin' ? 'No autorizado' : 'Confirmar Reserva'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoomReservation;