const { HotelSettings } = require('../data');

// GET /settings - Obtiene la configuración del hotel (se asume que es un singleton)
const getHotelSettings = async (req, res) => {
  try {
    // Buscar el único registro de configuración del hotel
    const hotelSettings = await HotelSettings.findOne();

    // Validar si se encontraron datos
    if (!hotelSettings) {
      return res.status(404).json({ message: 'Configuración del hotel no encontrada' });
    }

    // Responder con los datos del hotel
    res.status(200).json({ 
      message: 'Configuración del hotel encontrada exitosamente', 
      data: hotelSettings 
    });
  } catch (error) {
    console.error('Error al obtener la configuración del hotel:', error);
    res.status(500).json({ 
      message: 'Error al obtener la configuración del hotel', 
      error: error.message 
    });
  }
};

// PUT /settings - Crea o actualiza la configuración del hotel
const updateHotelSettings = async (req, res) => {
  try {
    console.log('--- Inicio updateHotelSettings ---');
    console.log('Body recibido:', req.body);
    
    const {
      name,
      address,
      contactInfo,
      wlegalorganizationtype,
      sfiscalresponsibilities,
      sdocno,
      sdoctype,
      ssellername,
      ssellerbrand,
      scontactperson,
      saddresszip,
      wdepartmentcode,
      wtowncode,
      scityname,
      contact_selectronicmail,
      registration_wdepartmentcode,
      registration_scityname,
      registration_saddressline1,
      registration_scountrycode,
      registration_wprovincecode,
      registration_szip,
      registration_sdepartmentname,
    } = req.body;
    
    const data = {
      name,
      address,
      contactInfo,
      wlegalorganizationtype,
      sfiscalresponsibilities,
      sdocno,
      sdoctype,
      ssellername,
      ssellerbrand,
      scontactperson,
      saddresszip,
      wdepartmentcode,
      wtowncode,
      scityname,
      contact_selectronicmail,
      registration_wdepartmentcode,
      registration_scityname,
      registration_saddressline1,
      registration_scountrycode,
      registration_wprovincecode,
      registration_szip,
      registration_sdepartmentname,
    };
    
    console.log('Datos a procesar:', data);
    
    let settings = await HotelSettings.findOne();
    if (!settings) {
      console.log('No se encontró configuración existente. Se creará nueva.');
      settings = await HotelSettings.create(data);
      console.log('Configuración creada:', settings);
    } else {
      console.log('Configuración existente encontrada:', settings.dataValues);
      settings = await settings.update(data);
      console.log('Configuración actualizada:', settings.dataValues);
    }
    
    res.status(200).json({ error: false, data: settings, message: 'Configuración actualizada correctamente' });
    console.log('--- Fin updateHotelSettings ---');
  } catch (error) {
    console.error('Error en updateHotelSettings:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar la configuración', details: error.message });
  }
};

module.exports = {
  getHotelSettings,
  updateHotelSettings,
};