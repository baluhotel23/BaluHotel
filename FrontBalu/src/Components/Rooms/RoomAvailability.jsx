import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAvailability, createBooking } from "../../Redux/Actions/bookingActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import DashboardLayout from "../Dashboard/DashboardLayout";
import RoomReservation from "./RoomReservation";
import { format, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';

const RoomAvailability = () => {
  const dispatch = useDispatch();
  // Assuming checkIn/checkOut are managed elsewhere or set to a default range for overview
  const { availability, loading, error } = useSelector(
    (state) => state.booking
  );
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); // Control calendar view centrally

  useEffect(() => {
    // Fetch availability for a default range or based on global state
    // Example: Fetch for the current month or a specific range
    dispatch(checkAvailability({ /* provide default checkIn/checkOut if needed */ }));
  }, [dispatch]);

  // Function to determine the class for calendar tiles
  // Apply Tailwind classes directly or via a helper function
  const getTileClassName = ({ date, view }, bookedDates) => {
    // Only apply styles if in the current month's view
    if (view === 'month') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const isBooked = bookedDates.some(booking => {
        const start = format(new Date(booking.checkIn), 'yyyy-MM-dd');
        const end = format(new Date(booking.checkOut), 'yyyy-MM-dd');
        return dateStr >= start && dateStr <= end;
      });
      // Use Tailwind classes for booked/available dates
      return isBooked ? 'bg-red-300 text-red-800 rounded-full' : 'bg-green-200 text-green-800 rounded-full';
    }
    return ''; // No special class for other views
  };


  if (loading) {
    return <DashboardLayout><p className="text-center p-4">Cargando habitaciones...</p></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><p className="text-center p-4 text-red-600">Error: {error}</p></DashboardLayout>;
  }

  // If a room is selected, maybe show RoomReservation or a modal?
  if (selectedRoom) {
    // Placeholder: Render RoomReservation or handle selection appropriately
    return (
      <DashboardLayout>
        <div className="p-4">
          <button onClick={() => setSelectedRoom(null)} className="mb-4 px-4 py-2 bg-gray-300 rounded">Volver a Disponibilidad</button>
          {/* Render RoomReservation or details for selectedRoom */}
          <p>Detalles/Reserva para Habitación {selectedRoom.roomNumber}</p>
          {/* <RoomReservation room={selectedRoom} checkIn={checkIn} checkOut={checkOut} /> */}
        </div>
      </DashboardLayout>
    );
  }

  // Sort rooms by number
  const sortedAvailability = availability ? [...availability].sort((a, b) => a.roomNumber - b.roomNumber) : [];

  return (
    <DashboardLayout>
      {/* Container with padding */}
      <div className="p-4 md:p-6">
       

        {/* Grid for room cards - Adjust columns based on screen size */}
        {/* Example: 2 cols on small, 4 on medium, 6 on large, up to 8 on xl */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
          {sortedAvailability.map((room) => (
            // Room Card - Reduced padding, smaller text, border, shadow
            <div key={room.roomNumber} className="room-card-compact border border-gray-300 rounded-lg p-2 shadow hover:shadow-md transition-shadow duration-200 flex flex-col bg-white text-xs">
              {/* Room Header */}
              <div className="flex justify-between items-center mb-1">
                 <h2 className="font-semibold text-sm text-stone-700">Hab. {room.roomNumber}</h2>
                 <span className="text-gray-500">Max: {room.maxGuests}</span>
              </div>
              {/* Optional: Room Type */}
              {/* <p className="text-gray-600 mb-1">{room.type}</p> */}

              {/* Services (Optional - takes space) */}
              {/* <ul className="text-gray-500 text-[10px] list-disc list-inside mb-1 truncate">
                {room.Services?.map((service) => (
                  <li key={service.serviceId} className="truncate">{service.name}</li>
                ))}
              </ul> */}

              {/* Compact Calendar */}
              {/* Apply custom CSS or Tailwind workarounds to shrink react-calendar */}
              {/* NOTE: This will likely still be too large/complex for many cards.
                   Consider replacing with a simpler status or date list. */}
              <div className="calendar-compact-container mb-2 overflow-hidden">
                <Calendar
                  // value={viewDate} // Control the displayed month centrally if needed
                  activeStartDate={viewDate} // Show the same month initially
                  tileClassName={({ date, view }) => getTileClassName({ date, view }, room.bookedDates || [])}
                  // Hide navigation and prev/next month days for compactness
                  showNavigation={false}
                  showNeighboringMonth={false}
                  // Further reduce size via CSS (see below)
                />
              </div>

              {/* Action Button - Smaller */}
              <button
                onClick={() => setSelectedRoom(room)}
                className="mt-auto w-full px-2 py-1 bg-stone-500 text-white text-[11px] font-semibold rounded hover:bg-stone-600 transition-colors duration-150"
              >
                Ver/Reservar
              </button>
            </div>
          ))}
        </div>
        {sortedAvailability.length === 0 && !loading && (
          <p className="text-center text-gray-500 mt-4">No hay datos de disponibilidad para mostrar.</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RoomAvailability;
