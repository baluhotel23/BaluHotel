const { SellerData } = require('../../data');
const { Op } = require('sequelize');
const CustomError = require('../../utils/errors/errorHandler');

// 🆕 FUNCIÓN PARA MAPEAR TIPO DE DOCUMENTO (igual que en buyer)
const mapDocumentType = (docTypeInput) => {
  // Si ya es numérico, validar que esté en el rango correcto
  if (typeof docTypeInput === 'number') {
    const validTypes = [11, 12, 13, 21, 22, 31, 41, 42, 47, 48, 50, 91];
    return validTypes.includes(docTypeInput) ? docTypeInput : 31; // Default NIT para sellers
  }
  
  // Mapear desde texto a número
  const textToNumber = {
    'RC': 11,   'TI': 12,   'CC': 13,   'TE': 21,   'CE': 22,
    'NIT': 31,  'PAS': 41,  'DEX': 42,  'PEP': 47,  'PPT': 48,
    'FI': 50,   'NUIP': 91
  };
  
  const upperInput = String(docTypeInput).toUpperCase();
  return textToNumber[upperInput] || 31; // Default NIT para sellers
};

// 🆕 FUNCIÓN AUXILIAR PARA VALIDAR DATOS DEL SELLER
const validateSellerData = (sellerData) => {
  const errors = [];
  
  if (!sellerData.sellerId) {
    errors.push('El ID del vendedor (sellerId) es requerido');
  }
  
  if (!sellerData.sdocno) {
    errors.push('El número de documento (sdocno) es requerido');
  }
  
  if (!sellerData.scostumername || sellerData.scostumername.length < 2) {
    errors.push('El nombre del hotel debe tener al menos 2 caracteres');
  }
  
  if (!sellerData.selectronicmail || !/\S+@\S+\.\S+/.test(sellerData.selectronicmail)) {
    errors.push('Debe proporcionar un email válido');
  }
  
  if (!sellerData.stelephone || sellerData.stelephone.length < 7) {
    errors.push('El teléfono debe tener al menos 7 dígitos');
  }
  
  return errors;
};


const getOrCreateSellerData = async (req, res) => {
  try {
    console.log('🏨 [SELLER-DATA] Body completo recibido:', JSON.stringify(req.body, null, 2));
    
    // 🔧 DESTRUCTURING IGUAL QUE EN PRODUCCIÓN
    const {
      // Datos básicos
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
      
      // Objeto de contacto anidado
      jcontact: {
        selectronicmail: contact_selectronicmail = null,
        jregistrationaddress: {
          wdepartmentcode: registration_wdepartmentcode = null,
          scityname: registration_scityname = null,
          saddressline1: registration_saddressline1 = null,
          scountrycode: registration_scountrycode = null,
          wprovincecode: registration_wprovincecode = null,
          szip: registration_szip = null,
          sdepartmentname: registration_sdepartmentname = null,
        } = {},
      } = {},
      
      // Campos adicionales para compatibilidad
      scostumername,
      selectronicmail,
      stelephone,
      saddress,
      scity,
      spostalcode,
      scountry,
      stributaryidentificationkey,
      sfiscalregime,
      scorporateregistrationschemename,
      sellerId,
      notes,
      taxxaConfig
    } = req.body;

    console.log('🔧 [SELLER-DATA] Datos extraídos:', {
      ssellername,
      contact_selectronicmail,
      registration_saddressline1,
      sdocno,
      sdoctype
    });

    // 🔧 MAPEAR CAMPOS PARA COMPATIBILIDAD CON AMBAS ESTRUCTURAS
    const processedSellerData = {
      // IDs principales
      sellerId: sellerId || sdocno || `seller_${Date.now()}`,
      sdocno: sdocno || sellerId,
      sdoctype: mapDocumentType(sdoctype || 31),
      
      // Nombres (priorizar ssellername de producción, fallback a scostumername)
      scostumername: ssellername || scostumername || 'Hotel Sin Nombre',
      ssellername: ssellername || scostumername,
      ssellerbrand: ssellerbrand || ssellername || scostumername,
      
      // Contacto (priorizar estructura de producción)
      selectronicmail: contact_selectronicmail || selectronicmail,
      contact_selectronicmail: contact_selectronicmail || selectronicmail,
      scontactperson: scontactperson || 'Administrador',
      stelephone: stelephone || '+57 300 000 0000', // Valor por defecto si no viene
      
      // Dirección principal
      saddress: saddress || registration_saddressline1 || '',
      saddresszip: saddresszip || spostalcode || registration_szip,
      scity: scity || scityname || registration_scityname || '',
      scityname: scityname || scity || registration_scityname,
      spostalcode: spostalcode || saddresszip || registration_szip,
      scountry: scountry || (registration_scountrycode === 'CO' ? 'Colombia' : 'Colombia'),
      
      // Dirección de registro (estructura de producción)
      registration_wdepartmentcode: registration_wdepartmentcode || wdepartmentcode,
      registration_scityname: registration_scityname || scityname || scity,
      registration_saddressline1: registration_saddressline1 || saddress,
      registration_scountrycode: registration_scountrycode || 'CO',
      registration_wprovincecode: registration_wprovincecode || wdepartmentcode,
      registration_szip: registration_szip || spostalcode || saddresszip,
      registration_sdepartmentname: registration_sdepartmentname,
      
      // Códigos geográficos
      wdepartmentcode: wdepartmentcode || registration_wdepartmentcode,
      wtowncode: wtowncode,
      
      // Datos fiscales
      wlegalorganizationtype: wlegalorganizationtype || 'company',
      sfiscalresponsibilities: sfiscalresponsibilities || 'O-13',
      stributaryidentificationkey: stributaryidentificationkey || '01',
      sfiscalregime: sfiscalregime || '48',
      scorporateregistrationschemename: scorporateregistrationschemename || 'DIAN',
      
      // Configuración adicional
      taxxaConfig: taxxaConfig ? JSON.stringify(taxxaConfig) : null,
      notes: notes || '',
      isActive: true
    };

    console.log('✅ [SELLER-DATA] Datos procesados para guardar:', {
      sellerId: processedSellerData.sellerId,
      scostumername: processedSellerData.scostumername,
      selectronicmail: processedSellerData.selectronicmail,
      sdocno: processedSellerData.sdocno
    });

    // 🔧 VALIDAR DATOS ESENCIALES
    const validationErrors = validateSellerData(processedSellerData);
    if (validationErrors.length > 0) {
      console.log('❌ [SELLER-DATA] Errores de validación:', validationErrors);
      return res.status(400).json({
        error: true,
        message: 'Errores de validación',
        details: validationErrors
      });
    }

    const documentNumber = processedSellerData.sdocno;
    
    // 🔧 VERIFICAR SI YA EXISTE
    const existingSeller = await SellerData.findOne({ 
      where: { sdocno: documentNumber } 
    });
    
    if (existingSeller) {
      console.log('📝 [SELLER-DATA] Seller ya existe, actualizando:', documentNumber);
      
      // Actualizar datos existentes (no actualizar PK)
      const updateData = { ...processedSellerData };
      delete updateData.sellerId;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      await existingSeller.update(updateData);
      
      console.log('✅ [SELLER-DATA] Seller actualizado exitosamente');
      
      return res.status(200).json({
        error: false,
        message: 'Datos del comercio actualizados exitosamente',
        data: existingSeller.toJSON(),
      });
    }
    
    // 🔧 CREAR NUEVO SELLER
    console.log('🆕 [SELLER-DATA] Creando nuevo seller...');
    const newSeller = await SellerData.create(processedSellerData);
    
    console.log('✅ [SELLER-DATA] Seller creado exitosamente:', newSeller.sellerId);
    
    return res.status(201).json({
      error: false,
      message: 'Datos del comercio registrados exitosamente',
      data: newSeller.toJSON(),
    });
    
  } catch (error) {
    console.error('❌ [SELLER-DATA] Error en getOrCreateSellerData:', error);
    
    // 🔧 MANEJO ESPECÍFICO DE ERRORES
    if (error.name === 'SequelizeValidationError') {
      const errorDetails = error.errors.map(e => `${e.path}: ${e.message}`);
      console.error('❌ [SELLER-DATA] Errores de validación Sequelize:', errorDetails);
      
      return res.status(400).json({
        error: true,
        message: 'Error de validación en base de datos',
        details: errorDetails
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: true,
        message: 'Ya existe un comercio con ese número de documento',
        details: error.errors.map(e => e.message)
      });
    }
    
    return res.status(500).json({
      error: true,
      message: 'Error interno del servidor al procesar datos del comercio',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contacte al administrador'
    });
  }
};

// 🆕 FUNCIÓN SIMPLIFICADA PARA FRONTEND (ALIAS)
const createOrUpdateSellerData = async (req, res, next) => {
  return getOrCreateSellerData(req, res);
};



// 🆕 OBTENER SELLER POR DOCUMENTO (basado en getBuyerByDocument)
const getSellerDataByNIT = async (req, res, next) => {
  try {
    const { sdocno } = req.params;
    console.log('🔍 [SELLER-DATA] Buscando seller con documento:', sdocno);

    if (!sdocno) {
      console.log('❌ [SELLER-DATA] Documento no proporcionado');
      return res.status(400).json({
        error: true,
        message: 'Número de documento (sdocno) no proporcionado.',
      });
    }

    const seller = await SellerData.findOne({ 
      where: { sdocno }
    });
    
    console.log('📋 [SELLER-DATA] Resultado de búsqueda:', seller ? 'Encontrado' : 'No encontrado');

    if (!seller) {
      console.log('❌ [SELLER-DATA] Seller no encontrado para documento:', sdocno);
      return res.status(404).json({
        error: true,
        message: 'Datos del hotel no encontrados',
      });
    }

    console.log('✅ [SELLER-DATA] Seller encontrado:', seller.scostumername);
    return res.status(200).json({
      error: false,
      message: 'Datos del hotel encontrados',
      data: seller.toJSON(),
    });
  } catch (error) {
    console.error('❌ [SELLER-DATA] Error en getSellerDataByNIT:', error);
    next(error);
  }
};

// 🆕 OBTENER TODOS LOS SELLERS CON PAGINACIÓN (basado en getAllBuyers)
const getAllSellers = async (req, res, next) => {
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
      whereClause.sdoctype = mapDocumentType(docType);
    }
    
    const { count, rows } = await SellerData.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      error: false,
      message: 'Sellers obtenidos exitosamente',
      data: rows.map(seller => seller.toJSON()),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('❌ [SELLER-DATA] Error obteniendo sellers:', error);
    next(error);
  }
};

// 🆕 ACTUALIZAR SELLER (basado en updateBuyer)
const updateSeller = async (req, res, next) => {
  try {
    const { sdocno } = req.params;
    const updateData = req.body;
    
    console.log('📝 [SELLER-DATA] Actualizando seller:', sdocno);
    
    // Mapear tipo de documento si viene en la actualización
    if (updateData.sdoctype || updateData.wdoctype) {
      updateData.sdoctype = mapDocumentType(updateData.sdoctype || updateData.wdoctype);
    }
    
    // Remover campos que no se deben actualizar
    delete updateData.sellerId;
    delete updateData.sdocno;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const [rowsUpdated] = await SellerData.update(updateData, {
      where: { sdocno }
    });
    
    if (rowsUpdated === 0) {
      return res.status(404).json({
        error: true,
        message: 'Datos del hotel no encontrados'
      });
    }
    
    const updatedSeller = await SellerData.findOne({ where: { sdocno } });
    
    console.log('✅ [SELLER-DATA] Seller actualizado exitosamente');
    
    return res.status(200).json({
      error: false,
      message: 'Datos del hotel actualizados exitosamente',
      data: updatedSeller.toJSON()
    });
  } catch (error) {
    console.error('❌ [SELLER-DATA] Error actualizando seller:', error);
    next(error);
  }
};

// 🆕 VALIDAR CONFIGURACIÓN TAXXA
const validateTaxxaConfig = async (req, res, next) => {
  try {
    const { sdocno } = req.params;

    const sellerData = await SellerData.findOne({
      where: { sdocno }
    });

    if (!sellerData) {
      return res.status(404).json({
        error: true,
        message: 'Datos del hotel no encontrados'
      });
    }

    const validationErrors = validateSellerData(sellerData.toJSON());
    const isValidForTaxxa = validationErrors.length === 0;

    res.status(200).json({
      error: false,
      message: 'Validación completada',
      data: {
        isValid: isValidForTaxxa,
        errors: validationErrors,
        sellerData: sellerData.toJSON()
      }
    });

  } catch (error) {
    console.error('❌ [SELLER-DATA] Error en validación:', error);
    next(error);
  }
};



module.exports = {
   getOrCreateSellerData,
  createOrUpdateSellerData,
  getSellerDataByNIT,
  getAllSellers,
  updateSeller,
  validateTaxxaConfig,
  mapDocumentType,
  // Mantener compatibilidad
  getSellerDataBySdocno: getSellerDataByNIT,
  updateSellerData: createOrUpdateSellerData
};