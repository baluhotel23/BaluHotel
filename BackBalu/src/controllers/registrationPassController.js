const { Booking, Room, RegistrationPass } = require('../data');


// Crear un nuevo registro de pasajero
const createRegistrationPass = async (req, res) => {
  try {
    console.log("Body recibido en createRegistrationPass:", req.body);

    const {
      bookingId,
      passengers,
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

    if (!bookingId) {
      return res.status(400).json({ error: true, message: "bookingId es requerido" });
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Room }],
    });

    if (!booking) {
      return res.status(404).json({ error: true, message: "Reserva no encontrada" });
    }

    const roomNumber = booking.roomNumber;

    if (Array.isArray(passengers)) {
      await Promise.all(
        passengers.map(async (passenger) => {
          await RegistrationPass.create({
            bookingId,
            roomNumber,
            checkInDate: booking.checkIn,
            ...passenger,
          });
        })
      );
    } else {
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
    res.status(500).json({ error: true, message: "Error al crear el registro de pasajero", detalle: error.message });
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

  // Obtener todos los pasajeros de una reserva específica
const getRegistrationPassesByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const passengers = await RegistrationPass.findAll({
      where: { bookingId },
      include: [
        { model: Room, as: "room" },
        { model: Booking, as: "booking" },
      ],
    });

    if (!passengers.length) {
      return res.status(404).json({ error: true, message: "No se encontraron pasajeros para esta reserva" });
    }

    res.status(200).json({ error: false, data: passengers });
  } catch (error) {
    console.error("Error al obtener los pasajeros por reserva:", error);
    res.status(500).json({ error: true, message: "Error al obtener los pasajeros por reserva" });
  }
};
  
  module.exports = {
    createRegistrationPass,
    getAllRegistrationPasses,
    updateRegistrationPass,
    deleteRegistrationPass,
    getRegistrationPassesByBooking
  };