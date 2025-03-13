const { Service } = require('../data');

const createService = async (req, res, next) => {
  try {
    const { name } = req.body; // nombre del servicio
    const service = await Service.create({ name });
    res.status(201).json({
      error: false,
      data: service,
      message: 'Servicio creado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { name } = req.body;
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        error: true,
        message: 'Servicio no encontrado'
      });
    }
    const updatedService = await service.update({ name });
    res.status(200).json({
      error: false,
      data: updatedService,
      message: 'Servicio actualizado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        error: true,
        message: 'Servicio no encontrado'
      });
    }
    await service.destroy();
    res.status(200).json({
      error: false,
      message: 'Servicio eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.findAll();
    res.status(200).json({
      error: false,
      data: services,
      message: 'Servicios obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createService, updateService, deleteService, getAllServices };