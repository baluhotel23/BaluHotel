const { HotelSettings, RoomCategory } = require('../data');

// GET /settings - Obtiene la configuración del hotel (se asume que es un singleton)
const getHotelSettings = async (req, res) => {
  try {
    const settings = await HotelSettings.findOne();
    if (!settings) {
      return res.status(404).json({ error: true, message: 'Configuración no encontrada' });
    }
    res.status(200).json({ error: false, data: settings });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener la configuración', details: error.message });
  }
};

// PUT /settings - Actualiza la configuración del hotel
const updateHotelSettings = async (req, res) => {
  try {
    const { name, address, contactInfo } = req.body;
    let settings = await HotelSettings.findOne();
    if (!settings) {
      // Si no existe, se crea uno nuevo
      settings = await HotelSettings.create({ name, address, contactInfo });
    } else {
      settings = await settings.update({ name, address, contactInfo });
    }
    res.status(200).json({ error: false, data: settings, message: 'Configuración actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al actualizar la configuración', details: error.message });
  }
};

// POST /rooms/category - Crea una nueva categoría de habitaciones
const createRoomCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await RoomCategory.create({ name, description });
    res.status(201).json({ error: false, data: category, message: 'Categoría creada correctamente' });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al crear la categoría', details: error.message });
  }
};

// PUT /rooms/category/:id - Actualiza una categoría de habitaciones existente
const updateRoomCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const category = await RoomCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: true, message: 'Categoría no encontrada' });
    }
    const updatedCategory = await category.update({ name, description });
    res.status(200).json({ error: false, data: updatedCategory, message: 'Categoría actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al actualizar la categoría', details: error.message });
  }
};

module.exports = {
  getHotelSettings,
  updateHotelSettings,
  createRoomCategory,
  updateRoomCategory,
};