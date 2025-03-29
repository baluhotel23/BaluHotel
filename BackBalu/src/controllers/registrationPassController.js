const { Booking, Room, RegistrationPass } = require('../data');


// Crear un nuevo registro de pasajero
const createRegistrationPass = async (req, res) => {
  try {
    const {
      bookingId,
      passengers, // Array opcional de pasajeros
      name,
      nationality,
      maritalStatus,
      profession,
      stayDuration,
      checkInTime,
      numberOfPeople,
      destination,
      idNumber,
      idIssuingPlace,
      foreignIdOrPassport,
      address,
      phoneNumber,
    } = req.body;

    // Verificar que la reserva exista
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Room }],
    });

    if (!booking) {
      return res.status(404).json({ error: true, message: "Reserva no encontrada" });
    }

    // Extraer el roomNumber de la reserva
    const roomNumber = booking.roomNumber;

    // Crear registros de pasajeros
    if (Array.isArray(passengers)) {
      // Si se envía un array de pasajeros
      await Promise.all(
        passengers.map(async (passenger) => {
          await RegistrationPass.create({
            bookingId,
            roomNumber,
            checkInDate: booking.checkIn,
            ...passenger, // Desestructurar los datos del pasajero
          });
        })
      );
    } else {
      // Si se envían datos individuales
      await RegistrationPass.create({
        bookingId,
        roomNumber,
        checkInDate: booking.checkIn,
        name,
        nationality,
        maritalStatus,
        profession,
        stayDuration,
        checkInTime,
        numberOfPeople,
        destination,
        idNumber,
        idIssuingPlace,
        foreignIdOrPassport,
        address,
        phoneNumber,
      });
    }

    // Consultar todos los pasajeros de la misma reserva
    const allPassengers = await RegistrationPass.findAll({
      where: { bookingId },
      include: [
        { model: Room, as: "room" },
        { model: Booking, as: "booking" },
      ],
    });

    res.status(201).json({
      error: false,
      message: "Registro(s) de pasajero(s) creado(s) exitosamente",
      data: {
        bookingId,
        roomNumber,
        passengers: allPassengers,
      },
    });
  } catch (error) {
    console.error("Error al crear el registro de pasajero:", error);
    res.status(500).json({ error: true, message: "Error al crear el registro de pasajero" });
  }
};
  // Obtener todos los registros de pasajeros
  const getAllRegistrationPasses = async (req, res) => {
    try {
      // Consultar todos los registros de pasajeros agrupados por bookingId
      const registrationPasses = await RegistrationPass.findAll({
        include: [
          { model: Room, as: "room" },
          { model: Booking, as: "booking" },
        ],
      });
  
      if (!registrationPasses.length) {
        return res.status(404).json({ error: true, message: "No se encontraron registros de pasajeros" });
      }
  
      // Agrupar pasajeros por bookingId
      const groupedByBooking = registrationPasses.reduce((acc, pass) => {
        const bookingId = pass.bookingId;
  
        if (!acc[bookingId]) {
          acc[bookingId] = {
            bookingId,
            roomNumber: pass.roomNumber,
            passengers: [],
          };
        }
  
        acc[bookingId].passengers.push(pass);
        return acc;
      }, {});
  
      // Convertir el objeto agrupado en un array
      const result = Object.values(groupedByBooking).map((group) => ({
        bookingId: group.bookingId,
        roomNumber: group.roomNumber,
        passengerCount: group.passengers.length,
        passengers: group.passengers,
      }));
  
      res.status(200).json({ error: false, data: result });
    } catch (error) {
      console.error("Error al obtener los registros de pasajeros:", error);
      res.status(500).json({ error: true, message: "Error al obtener los registros de pasajeros" });
    }
  };
  // Actualizar un registro de pasajero
  const updateRegistrationPass = async (req, res) => {
    try {
      const { registrationNumber } = req.params;
      const { name, nationality, maritalStatus, profession, stayDuration, checkInTime, numberOfPeople, destination, idNumber, idIssuingPlace, foreignIdOrPassport, address, phoneNumber } = req.body;
  
      // Buscar el registro de pasajero
      const registrationPass = await RegistrationPass.findByPk(registrationNumber);
  
      if (!registrationPass) {
        return res.status(404).json({ error: true, message: "Registro de pasajero no encontrado" });
      }
  
      // Actualizar el registro
      await registrationPass.update({
        name,
        nationality,
        maritalStatus,
        profession,
        stayDuration,
        checkInTime,
        numberOfPeople,
        destination,
        idNumber,
        idIssuingPlace,
        foreignIdOrPassport,
        address,
        phoneNumber,
      });
  
      res.status(200).json({ error: false, message: "Registro de pasajero actualizado exitosamente", data: registrationPass });
    } catch (error) {
      console.error("Error al actualizar el registro de pasajero:", error);
      res.status(500).json({ error: true, message: "Error al actualizar el registro de pasajero" });
    }
  };
  
  // Eliminar un registro de pasajero
  const deleteRegistrationPass = async (req, res) => {
    try {
      const { registrationNumber } = req.params;
  
      // Buscar el registro de pasajero
      const registrationPass = await RegistrationPass.findByPk(registrationNumber);
  
      if (!registrationPass) {
        return res.status(404).json({ error: true, message: "Registro de pasajero no encontrado" });
      }
  
      // Eliminar el registro
      await registrationPass.destroy();
  
      res.status(200).json({ error: false, message: "Registro de pasajero eliminado exitosamente" });
    } catch (error) {
      console.error("Error al eliminar el registro de pasajero:", error);
      res.status(500).json({ error: true, message: "Error al eliminar el registro de pasajero" });
    }
  };
  
  module.exports = {
    createRegistrationPass,
    getAllRegistrationPasses,
    updateRegistrationPass,
    deleteRegistrationPass,
  };