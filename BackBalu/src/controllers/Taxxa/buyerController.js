const { Buyer } = require('../../data'); 
const CustomError = require('../../utils/errors/errorHandler');


// Crea un nuevo Buyer
const createBuyer = async (req, res, next) => {
  try {
    const buyerData = req.body;
    // Extraer los campos que no queremos enviar (los anidados)
    const { jpartylegalentity, jcontact, ...rest } = buyerData;
    
    // Formar el objeto aplanado, asignando las propiedades a nivel raíz
    const flattenedBuyerData = {
      ...rest,
      sdocno: buyerData.sdocno || (jpartylegalentity && jpartylegalentity.sdocno),
      wdoctype: buyerData.wdoctype || (jpartylegalentity && jpartylegalentity.wdoctype),
      scorporateregistrationschemename:
        buyerData.scorporateregistrationschemename ||
        (jpartylegalentity && jpartylegalentity.scorporateregistrationschemename),
      scontactperson: buyerData.scontactperson || (jcontact && jcontact.scontactperson),
      selectronicmail: buyerData.selectronicmail || (jcontact && jcontact.selectronicmail),
      stelephone: buyerData.stelephone || (jcontact && jcontact.stelephone),
    };

    const sdocno = flattenedBuyerData.sdocno;
    
    if (!sdocno) {
      throw new CustomError('El número de documento (sdocno) es requerido', 400);
    }
    // Verificar si ya existe un Buyer con el mismo sdocno
    const existingBuyer = await Buyer.findOne({ where: { sdocno } });
    if (existingBuyer) {
      return res.status(400).json({
        error: true,
        message: 'El comprador ya se encuentra registrado',
        data: existingBuyer,
      });
    }
    
    const newBuyer = await Buyer.create(flattenedBuyerData);
    return res.status(201).json({
      error: false,
      message: 'Buyer registrado exitosamente',
      data: newBuyer,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener Buyer por sdocno
const getBuyerByDocument = async (req, res, next) => {
  try {
    const { sdocno } = req.params;
    console.log('Backend: Buscando Buyer con sdocno (desde req.params):', sdocno); // Log del sdocno recibido

    if (!sdocno) {
      console.log('Backend: sdocno no proporcionado en los parámetros de la ruta.');
      return res.status(400).json({
        error: true,
        message: 'Número de documento (sdocno) no proporcionado.',
      });
    }

    const buyer = await Buyer.findOne({ where: { sdocno } });
    console.log('Backend: Resultado de Buyer.findOne:', buyer); // Log del resultado de la consulta

    if (!buyer) {
      console.log('Backend: Comprador no encontrado en la base de datos para sdocno:', sdocno);
      return res.status(404).json({
        error: true,
        message: 'Comprador no encontrado',
      });
    }

    console.log('Backend: Comprador encontrado:', buyer.toJSON()); // Log del comprador encontrado (usando .toJSON() para una mejor visualización)
    return res.status(200).json({
      error: false,
      message: 'Comprador encontrado',
      data: buyer,
    });
  } catch (error) {
    console.error('Backend: Error en getBuyerByDocument:', error); // Log del error capturado
    next(error);
  }
};

module.exports = {
  createBuyer,
  getBuyerByDocument,
};