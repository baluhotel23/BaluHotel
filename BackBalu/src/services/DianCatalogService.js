// 🆕 CORREGIR ESTE IMPORT
const { countries, departments, municipalities } = require('../controllers/Taxxa/catalogoDian');

// ✅ Verificar que se importaron correctamente
console.log('🔍 [DIAN] Verificando imports:', {
  countries: countries ? countries.length : 'undefined',
  departments: departments ? departments.length : 'undefined', 
  municipalities: municipalities ? municipalities.length : 'undefined'
});

class DianCatalogService {
  
  // 🌍 PAÍSES
  getAllCountries() {
    try {
      console.log('📋 [DIAN] Obteniendo países, total disponible:', countries?.length || 0);
      return countries || [];
    } catch (error) {
      console.error('❌ [DIAN] Error en getAllCountries:', error);
      return [];
    }
  }
  
  getCountryByCode(code) {
    try {
      const country = countries?.find(country => country.code === code);
      console.log('🔍 [DIAN] Búsqueda país por código:', code, '-> Encontrado:', !!country);
      return country || null;
    } catch (error) {
      console.error('❌ [DIAN] Error en getCountryByCode:', error);
      return null;
    }
  }
  
  // 🏛️ DEPARTAMENTOS
  getAllDepartments(countryCode = 'CO') {
    try {
      // ✅ Agregar verificación de seguridad
      if (!departments || !Array.isArray(departments)) {
        console.error('❌ [DIAN] departments no está definido o no es un array:', typeof departments);
        return [];
      }
      
      const filteredDepartments = departments.filter(dept => dept.country_code === countryCode);
      console.log('🏛️ [DIAN] Obteniendo departamentos para:', countryCode, '-> Total:', filteredDepartments.length);
      return filteredDepartments;
    } catch (error) {
      console.error('❌ [DIAN] Error en getAllDepartments:', error);
      return [];
    }
  }
  
  getDepartmentByCode(code) {
    try {
      if (!departments || !Array.isArray(departments)) {
        console.error('❌ [DIAN] departments no está definido para búsqueda por código');
        return null;
      }
      
      const department = departments.find(dept => dept.code === code);
      console.log('🔍 [DIAN] Búsqueda departamento por código:', code, '-> Encontrado:', !!department);
      return department || null;
    } catch (error) {
      console.error('❌ [DIAN] Error en getDepartmentByCode:', error);
      return null;
    }
  }
  
  // 🏙️ MUNICIPIOS
  getAllMunicipalities(countryCode = 'CO') {
    try {
      if (!municipalities || !Array.isArray(municipalities)) {
        console.error('❌ [DIAN] municipalities no está definido o no es un array:', typeof municipalities);
        return [];
      }
      
      const filteredMunicipalities = municipalities.filter(muni => muni.country_code === countryCode);
      console.log('🏙️ [DIAN] Obteniendo municipios para:', countryCode, '-> Total:', filteredMunicipalities.length);
      return filteredMunicipalities;
    } catch (error) {
      console.error('❌ [DIAN] Error en getAllMunicipalities:', error);
      return [];
    }
  }
  
  getMunicipalitiesByDepartment(departmentCode) {
    try {
      if (!municipalities || !Array.isArray(municipalities)) {
        console.error('❌ [DIAN] municipalities no está definido para filtrar por departamento');
        return [];
      }
      
      const filteredMunicipalities = municipalities.filter(muni => muni.department_code === departmentCode);
      console.log('🏙️ [DIAN] Obteniendo municipios para departamento:', departmentCode, '-> Total:', filteredMunicipalities.length);
      return filteredMunicipalities;
    } catch (error) {
      console.error('❌ [DIAN] Error en getMunicipalitiesByDepartment:', error);
      return [];
    }
  }
  
 getMunicipalityByCode(code) {
  try {
    console.log('🔍 [DIAN] Buscando municipio por código:', code);
    
    if (!municipalities || !Array.isArray(municipalities)) {
      console.error('❌ [DIAN] municipalities no definido');
      return null;
    }
    
    // 🔍 BUSCAR POR DIFERENTES CAMPOS
    const municipality = municipalities.find(muni => 
      muni.code === code || 
      muni.wtowncode === code ||
      muni.wmunicpalitycode === code
    );
    
    console.log('🏙️ [DIAN] Resultado búsqueda:', {
      codigo_buscado: code,
      municipio_encontrado: municipality ? municipality.name : 'NO ENCONTRADO',
      total_municipios: municipalities.length
    });
    
    return municipality || null;
  } catch (error) {
    console.error('❌ [DIAN] Error en getMunicipalityByCode:', error);
    return null;
  }
}
  
  // 🔍 VALIDACIONES
  isValidDepartmentCode(code, countryCode = 'CO') {
    try {
      if (!departments || !Array.isArray(departments)) {
        console.error('❌ [DIAN] departments no está definido para validación');
        return false;
      }
      
      const isValid = departments.some(dept => dept.code === code && dept.country_code === countryCode);
      console.log('✅ [DIAN] Validación departamento:', code, 'país:', countryCode, '-> Válido:', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ [DIAN] Error en isValidDepartmentCode:', error);
      return false;
    }
  }
  
  isValidMunicipalityCode(code, departmentCode = null) {
    try {
      if (!municipalities || !Array.isArray(municipalities)) {
        console.error('❌ [DIAN] municipalities no está definido para validación');
        return false;
      }
      
      const municipality = municipalities.find(muni => muni.code === code);
      
      if (!municipality) {
        console.log('❌ [DIAN] Municipio no encontrado:', code);
        return false;
      }
      
      // Si se especifica departamento, validar que coincida
      if (departmentCode) {
        const isValid = municipality.department_code === departmentCode;
        console.log('✅ [DIAN] Validación municipio:', code, 'departamento:', departmentCode, '-> Válido:', isValid);
        return isValid;
      }
      
      console.log('✅ [DIAN] Municipio válido:', code);
      return true;
    } catch (error) {
      console.error('❌ [DIAN] Error en isValidMunicipalityCode:', error);
      return false;
    }
  }
  
  // 🔗 VALIDACIÓN CRUZADA
 validateLocationConsistency(municipalityCode, departmentCode, countryCode = 'CO') {
  try {
    console.log('🔍 [DIAN] Iniciando validación:', { 
      municipalityCode, 
      departmentCode, 
      countryCode 
    });
    
    const errors = [];
    
    // 🔍 VERIFICAR QUE EL MUNICIPIO EXISTE
    const municipality = this.getMunicipalityByCode(municipalityCode);
    console.log('🏙️ [DIAN] Municipio encontrado:', municipality);
    
    if (!municipality) {
      errors.push('Código de municipio inválido');
      console.log('❌ [DIAN] Municipio no encontrado:', municipalityCode);
    } else {
      // 🔍 VERIFICAR QUE PERTENECE AL DEPARTAMENTO
      if (municipality.department_code !== departmentCode) {
        errors.push('El municipio no pertenece al departamento especificado');
        console.log('❌ [DIAN] Municipio no pertenece al departamento:', {
          municipio_dept: municipality.department_code,
          esperado_dept: departmentCode
        });
      }
    }
    
    // 🔍 VERIFICAR DEPARTAMENTO
    const isValidDept = this.isValidDepartmentCode(departmentCode, countryCode);
    console.log('🏛️ [DIAN] Departamento válido:', isValidDept);
    
    if (!isValidDept) {
      errors.push('Código de departamento inválido');
    }
    
    const result = {
      isValid: errors.length === 0,
      errors,
      details: {
        municipality,
        departmentCode,
        countryCode
      }
    };
    
    console.log('✅ [DIAN] Resultado validación:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [DIAN] Error en validación:', error);
    return {
      isValid: false,
      errors: ['Error interno en validación'],
      details: { error: error.message }
    };
  }
}
  
  // 📊 ESTADÍSTICAS
  getLocationStats() {
    try {
      console.log('📊 [DIAN] Generando estadísticas...');
      
      const stats = {
        totalCountries: countries?.length || 0,
        totalDepartments: departments?.length || 0,
        totalMunicipalities: municipalities?.length || 0,
        municipalitiesByDepartment: departments?.map(dept => ({
          department: dept.name,
          code: dept.code,
          municipalityCount: municipalities?.filter(muni => muni.department_code === dept.code).length || 0
        })) || []
      };
      
      console.log('📈 [DIAN] Estadísticas generadas:', {
        countries: stats.totalCountries,
        departments: stats.totalDepartments,
        municipalities: stats.totalMunicipalities
      });
      
      return stats;
    } catch (error) {
      console.error('❌ [DIAN] Error en getLocationStats:', error);
      return {
        totalCountries: 0,
        totalDepartments: 0,
        totalMunicipalities: 0,
        municipalitiesByDepartment: []
      };
    }
  }
}

module.exports = new DianCatalogService();