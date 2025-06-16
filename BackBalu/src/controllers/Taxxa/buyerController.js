const { Buyer } = require('../../data'); 
const CustomError = require('../../utils/errors/errorHandler');

const mapDocumentType = (docTypeInput) => {
  // Si ya es numérico, validar que esté en el rango correcto
  if (typeof docTypeInput === 'number') {
    const validTypes = [11, 12, 13, 21, 22, 31, 41, 42, 47, 48, 50, 91];
    return validTypes.includes(docTypeInput) ? docTypeInput : 13; // Default CC
  }
  
  // Mapear desde texto a número
  const textToNumber = {
    'RC': 11,   'TI': 12,   'CC': 13,   'TE': 21,   'CE': 22,
    'NIT': 31,  'PAS': 41,  'DEX': 42,  'PEP': 47,  'PPT': 48,
    'FI': 50,   'NUIP': 91
  };
  
  const upperInput = String(docTypeInput).toUpperCase();
  return textToNumber[upperInput] || 13; // Default CC
};

// 🆕 FUNCIÓN AUXILIAR PARA VALIDAR DATOS
const validateBuyerData = (buyerData) => {
  const errors = [];
  
  if (!buyerData.sdocno) {
    errors.push('El número de documento (sdocno) es requerido');
  }
  
  if (!buyerData.scostumername || buyerData.scostumername.length < 2) {
    errors.push('El nombre del cliente debe tener al menos 2 caracteres');
  }
  
  if (!buyerData.selectronicmail || !/\S+@\S+\.\S+/.test(buyerData.selectronicmail)) {
    errors.push('Debe proporcionar un email válido');
  }
  
  if (!buyerData.stelephone || buyerData.stelephone.length < 7) {
    errors.push('El teléfono debe tener al menos 7 dígitos');
  }
  
  return errors;
};


// Crea un nuevo Buyer
const createBuyer = async (req, res, next) => {
  try {
    console.log('📝 [BUYER] Creando nuevo comprador:', JSON.stringify(req.body, null, 2));
    
    const buyerData = req.body;
    
    // Extraer los campos que no queremos enviar (los anidados)
    const { jpartylegalentity, jcontact, ...rest } = buyerData;
    
    // Formar el objeto aplanado, asignando las propiedades a nivel raíz
    const flattenedBuyerData = {
      ...rest,
      sdocno: buyerData.sdocno || (jpartylegalentity && jpartylegalentity.sdocno),
      wdoctype: mapDocumentType(buyerData.wdoctype || (jpartylegalentity && jpartylegalentity.wdoctype)),
      scorporateregistrationschemename:
        buyerData.scorporateregistrationschemename ||
        (jpartylegalentity && jpartylegalentity.scorporateregistrationschemename) ||
        'DIAN',
      scontactperson: buyerData.scontactperson || (jcontact && jcontact.scontactperson),
      selectronicmail: buyerData.selectronicmail || (jcontact && jcontact.selectronicmail),
      stelephone: buyerData.stelephone || (jcontact && jcontact.stelephone),
    };

    console.log('🔧 [BUYER] Datos procesados:', flattenedBuyerData);
    
    // Validar datos
    const validationErrors = validateBuyerData(flattenedBuyerData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Errores de validación',
        details: validationErrors
      });
    }
    
    const sdocno = flattenedBuyerData.sdocno;
    
    // Verificar si ya existe un Buyer con el mismo sdocno
    const existingBuyer = await Buyer.findOne({ where: { sdocno } });
    if (existingBuyer) {
      console.log('⚠️ [BUYER] Comprador ya existe:', sdocno);
      return res.status(409).json({ // 409 Conflict es más apropiado
        error: true,
        message: 'El comprador ya se encuentra registrado',
        data: existingBuyer,
      });
    }
    
    const newBuyer = await Buyer.create(flattenedBuyerData);
    console.log('✅ [BUYER] Comprador creado exitosamente:', newBuyer.sdocno);
    
    return res.status(201).json({
      error: false,
      message: 'Buyer registrado exitosamente',
      data: {
        ...newBuyer.toJSON(),
        wdoctype: newBuyer.wdoctype // Incluir el campo virtual
      },
    });
  } catch (error) {
    console.error('❌ [BUYER] Error creando comprador:', error);
    
    // Manejo específico de errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: true,
        message: 'Error de validación',
        details: error.errors.map(e => e.message)
      });
    }
    
    next(error);
  }
};

// Obtener Buyer por sdocno
const getBuyerByDocument = async (req, res, next) => {
  try {
    const { sdocno } = req.params;
    console.log('🔍 [BUYER] Buscando comprador con documento:', sdocno);

    if (!sdocno) {
      console.log('❌ [BUYER] Documento no proporcionado');
      return res.status(400).json({
        error: true,
        message: 'Número de documento (sdocno) no proporcionado.',
      });
    }

    const buyer = await Buyer.findOne({ 
      where: { sdocno },
      attributes: { 
        include: ['wdoctype'] // Incluir campo virtual
      }
    });
    
    console.log('📋 [BUYER] Resultado de búsqueda:', buyer ? 'Encontrado' : 'No encontrado');

    if (!buyer) {
      console.log('❌ [BUYER] Comprador no encontrado para documento:', sdocno);
      return res.status(404).json({
        error: true,
        message: 'Comprador no encontrado',
      });
    }

    console.log('✅ [BUYER] Comprador encontrado:', buyer.scostumername);
    return res.status(200).json({
      error: false,
      message: 'Comprador encontrado',
      data: {
        ...buyer.toJSON(),
        wdoctype: buyer.wdoctype // Asegurar que se incluya
      },
    });
  } catch (error) {
    console.error('❌ [BUYER] Error en getBuyerByDocument:', error);
    next(error);
  }
};

// 🆕 OBTENER TODOS LOS COMPRADORES CON PAGINACIÓN
const getAllBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', docType = '' } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { scostumername: { [Op.iLike]: `%${search}%` } },
        { sdocno: { [Op.iLike]: `%${search}%` } },
        { selectronicmail: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (docType) {
      whereClause.wdoctype = mapDocumentType(docType);
    }
    
    const { count, rows } = await Buyer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    const buyersWithDocText = rows.map(buyer => ({
      ...buyer.toJSON(),
      wdoctype: buyer.wdoctype
    }));
    
    return res.status(200).json({
      error: false,
      message: 'Compradores obtenidos exitosamente',
      data: buyersWithDocText,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('❌ [BUYER] Error obteniendo compradores:', error);
    next(error);
  }
};

// 🆕 ACTUALIZAR COMPRADOR
const updateBuyer = async (req, res, next) => {
  try {
    const { sdocno } = req.params;
    const updateData = req.body;
    
    console.log('📝 [BUYER] Actualizando comprador:', sdocno);
    
    // Mapear tipo de documento si viene en la actualización
    if (updateData.wdoctype) {
      updateData.wdoctype = mapDocumentType(updateData.wdoctype);
    }
    
    // Remover campos que no se deben actualizar
    delete updateData.sdocno;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const [rowsUpdated] = await Buyer.update(updateData, {
      where: { sdocno }
    });
    
    if (rowsUpdated === 0) {
      return res.status(404).json({
        error: true,
        message: 'Comprador no encontrado'
      });
    }
    
    const updatedBuyer = await Buyer.findOne({ where: { sdocno } });
    
    console.log('✅ [BUYER] Comprador actualizado exitosamente');
    
    return res.status(200).json({
      error: false,
      message: 'Comprador actualizado exitosamente',
      data: {
        ...updatedBuyer.toJSON(),
        wdoctype: updatedBuyer.wdoctype
      }
    });
  } catch (error) {
    console.error('❌ [BUYER] Error actualizando comprador:', error);
    next(error);
  }
};

module.exports = {
  createBuyer,
  getBuyerByDocument,
  getAllBuyers, // 🆕
  updateBuyer, // 🆕
  mapDocumentType // 🆕 Exportar para uso en otros módulos
};