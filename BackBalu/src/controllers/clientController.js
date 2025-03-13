const { Booking, User, Review, Preference } = require('../data'); // Asegúrate de exportar correctamente estos modelos
const { CustomError } = require('../middleware/error');

// CREACIÓN DE RESERVA
const createBooking = async (req, res) => {
    const bookingData = req.body;
    // Usamos guestId porque la relación se define para el alias "guest"
    const booking = await Booking.create({ ...bookingData, guestId: req.user.n_document });
    res.status(201).json({
      error: false,
      message: 'Reserva creada exitosamente',
      data: booking
    });
};

// OBTENER RESERVAS DEL USUARIO
const getUserBookings = async (req, res) => {
  const bookings = await Booking.findAll({ where: { guestId: req.user.n_document } });
  res.json({
    error: false,
    message: 'Reservas obtenidas exitosamente',
    data: bookings
  });
};

// DETALLE DE UNA RESERVA
const getBookingDetails = async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findOne({ where: { id, guestId: req.user.n_document } });
  if (!booking) throw new CustomError('Reserva no encontrada', 404);
  res.json({
    error: false,
    message: 'Detalles de la reserva',
    data: booking
  });
};

// CANCELAR UNA RESERVA
const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findOne({ where: { id,guestId: req.user.n_document } });
  if (!booking) throw new CustomError('Reserva no encontrada', 404);
  booking.status = 'cancelled'; // o el estado que manejes para cancelaciones
  await booking.save();
  res.json({
    error: false,
    message: 'Reserva cancelada exitosamente',
    data: booking
  });
};

// OBTENER PERFIL DEL USUARIO
const getUserProfile = async (req, res) => {
  const user = await User.findByPk(req.user.n_document);
  if (!user) throw new CustomError('Usuario no encontrado', 404);
  res.json({
    error: false,
    message: 'Perfil obtenido exitosamente',
    data: user
  });
};

// ACTUALIZAR PERFIL DEL USUARIO
const updateProfile = async (req, res) => {
  const updatedData = req.body;
  let user = await User.findByPk(req.user.n_document);
  if (!user) throw new CustomError('Usuario no encontrado', 404);
  user = await user.update(updatedData);
  res.json({
    error: false,
    message: 'Perfil actualizado exitosamente',
    data: user
  });
};



// CREAR OPINIÓN/RESEÑA
const createReview = async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  // Se asume que se validan los datos en el middleware (si no, agregar validación aquí)
  const review = await Review.create({ bookingId, rating, comment, userId: req.user.id });
  res.status(201).json({
    error: false,
    message: 'Reseña creada exitosamente',
    data: review
  });
};

// OBTENER OPINIONES DEL USUARIO
const getUserReviews = async (req, res) => {
  const reviews = await Review.findAll({ where: { guestId: req.user.n_document } });
  res.json({
    error: false,
    message: 'Reseñas obtenidas exitosamente',
    data: reviews
  });
};

// OBTENER PREFERENCIAS DEL USUARIO
const getUserPreferences = async (req, res) => {
  const preferences = await Preference.findOne({ where: { guestId: req.user.n_document } });
  res.json({
    error: false,
    message: 'Preferencias obtenidas exitosamente',
    data: preferences
  });
};

// ACTUALIZAR PREFERENCIAS DEL USUARIO
const updatePreferences = async (req, res) => {
  const updatedPrefs = req.body;
  let preferences = await Preference.findOne({ where: { guestId: req.user.n_document} });
  if (!preferences) {
    // Si no existen, se crea uno nuevo
    preferences = await Preference.create({ userId: req.user.n_document, ...updatedPrefs });
  } else {
    preferences = await preferences.update(updatedPrefs);
  }
  res.json({
    error: false,
    message: 'Preferencias actualizadas exitosamente',
    data: preferences
  });
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  getUserProfile,
  updateProfile,
  createReview,
  getUserReviews,
  getUserPreferences,
  updatePreferences
};