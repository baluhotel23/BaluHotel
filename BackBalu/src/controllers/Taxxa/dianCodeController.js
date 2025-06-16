const dianCatalogService = require('../../services/dianCatalogService');

// 🌍 Obtener países
const getCountries = async (req, res, next) => {
  try {
    const countries = dianCatalogService.getAllCountries();
    
    return res.status(200).json({
      error: false,
      message: 'Países obtenidos exitosamente',
      data: countries,
      total: countries.length
    });
  } catch (error) {
    console.error('❌ [DIAN] Error obteniendo países:', error);
    next(error);
  }
};

// 🏛️ Obtener departamentos
const getDepartments = async (req, res, next) => {
  try {
    const { countryCode = 'CO' } = req.query;
    const departments = dianCatalogService.getAllDepartments(countryCode);
    
    return res.status(200).json({
      error: false,
      message: 'Departamentos obtenidos exitosamente',
      data: departments,
      total: departments.length,
      filters: { countryCode }
    });
  } catch (error) {
    console.error('❌ [DIAN] Error obteniendo departamentos:', error);
    next(error);
  }
};

// 🏙️ Obtener municipios
const getMunicipalities = async (req, res, next) => {
  try {
    const { departmentCode, search, limit = 50 } = req.query;
    
    let municipalities;
    
    if (search) {
      municipalities = dianCatalogService.searchMunicipalities(search, departmentCode);
    } else if (departmentCode) {
      municipalities = dianCatalogService.getMunicipalitiesByDepartment(departmentCode);
    } else {
      municipalities = dianCatalogService.getAllMunicipalities();
    }
    
    // Paginación simple
    const limitedResults = municipalities.slice(0, parseInt(limit));
    
    return res.status(200).json({
      error: false,
      message: 'Municipios obtenidos exitosamente',
      data: limitedResults,
      total: municipalities.length,
      showing: limitedResults.length,
      filters: { departmentCode, search, limit }
    });
  } catch (error) {
    console.error('❌ [DIAN] Error obteniendo municipios:', error);
    next(error);
  }
};

// 🔍 Validar ubicación
const validateLocation = async (req, res, next) => {
  try {
    const { municipalityCode, departmentCode, countryCode = 'CO' } = req.body;
    
    console.log('🔍 [VALIDATION] Datos recibidos:', {
      municipalityCode,
      departmentCode,
      countryCode
    });
    
    const validation = dianCatalogService.validateLocationConsistency(
      municipalityCode,
      departmentCode,
      countryCode
    );
    
    console.log('✅ [VALIDATION] Resultado:', validation);
    
    return res.status(200).json({
      error: false,
      message: 'Validación completada',
      data: validation
    });
  } catch (error) {
    console.error('❌ [VALIDATION] Error:', error);
    next(error);
  }
};

// 📊 Estadísticas de catálogos
const getCatalogStats = async (req, res, next) => {
  try {
    const stats = dianCatalogService.getLocationStats();
    
    return res.status(200).json({
      error: false,
      message: 'Estadísticas de catálogos obtenidas exitosamente',
      data: stats
    });
  } catch (error) {
    console.error('❌ [DIAN] Error obteniendo estadísticas:', error);
    next(error);
  }
};

module.exports = {
  getCountries,
  getDepartments,
  getMunicipalities,
  validateLocation,
  getCatalogStats
};