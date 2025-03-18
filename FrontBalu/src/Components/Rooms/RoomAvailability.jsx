import React, {useEffect} from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAvailability } from "../../Redux/Actions/bookingActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./RoomAvailability.css";
import DashboardLayout from "../Dashboard/DashboardLayout";


const RoomAvailability = () => {
const dispatch = useDispatch();
const { checkIn, checkOut } = useSelector((state) => state.booking);    
const { availability, loading, error } = useSelector((state) => state.booking);
useEffect(() => {
    console.log("Cargando disponibilidad inicial...");
    dispatch(checkAvailability({ checkIn, checkOut }));
  }, [dispatch]);


  // Función para determinar la clase de cada fecha en el calendario
  const getTileClassName = ({ date }, bookedDates) => {
    const isBooked = bookedDates.some(
      (booking) =>
        new Date(booking.checkIn) <= date && date <= new Date(booking.checkOut)
    );
    return isBooked ? "booked-date" : "available-date";
  };

  if (loading) {
    return <p>Cargando habitaciones...</p>;
  }

  if (error) {
    return <p className="error-message">Error: {error}</p>;
  }

  return (
    <DashboardLayout>
    <div className="room-availability-container">
      <h1 className="title">Disponibilidad de Habitaciones</h1>
      <div className="rooms-grid">
        {availability.map((room) => (
          <div key={room.roomNumber} className="room-card">
            <h2 className="room-number">Habitación {room.roomNumber}</h2>
            <img
              src={room.image_url[0]}
              alt={`Habitación ${room.roomNumber}`}
              className="room-image"
            />
            <ul>
                {room.Services.map((service) => (
                  <li key={service.serviceId}>{service.name}</li>
                ))}
              </ul>
            <div className="calendar-container">
              <Calendar
                tileClassName={({ date }) =>
                  getTileClassName({ date }, room.bookedDates)
                }
              />
            </div>
           
          </div>
        ))}
      </div>
    </div>
    </DashboardLayout>
  );
};

export default RoomAvailability;