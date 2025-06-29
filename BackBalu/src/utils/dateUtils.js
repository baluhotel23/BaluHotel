const { DateTime } = require('luxon');

// 🇨🇴 ZONA HORARIA DE COLOMBIA
const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtener fecha y hora actual en zona horaria de Colombia
 * @returns {DateTime} DateTime object en zona horaria de Colombia
 */
const getColombiaTime = () => {
  return DateTime.now().setZone(COLOMBIA_TIMEZONE);
};

/**
 * Obtener solo la fecha actual de Colombia (inicio del día)
 * @returns {DateTime} DateTime object con hora 00:00:00 en Colombia
 */
const getColombiaDate = () => {
  return DateTime.now().setZone(COLOMBIA_TIMEZONE).startOf('day');
};

/**
 * Convertir cualquier fecha a zona horaria de Colombia
 * @param {string|Date|DateTime} date - Fecha a convertir
 * @returns {DateTime} DateTime en zona horaria de Colombia
 */
const toColombiaTime = (date) => {
  if (!date) return null;
  
  if (DateTime.isDateTime(date)) {
    return date.setZone(COLOMBIA_TIMEZONE);
  }
  
  return DateTime.fromJSDate(new Date(date)).setZone(COLOMBIA_TIMEZONE);
};

/**
 * Formatear fecha para logs (sin segundos)
 * @param {string|Date|DateTime} date - Fecha a formatear
 * @returns {string} Fecha formateada: "2025-06-27 15:30"
 */
const formatForLogs = (date) => {
  if (!date) return 'Invalid Date';
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.toFormat('yyyy-MM-dd HH:mm');
  } catch (error) {
    console.warn('Error formatting date for logs:', error);
    return 'Invalid Date';
  }
};

/**
 * Formatear fecha para logs detallados (con segundos)
 * @param {string|Date|DateTime} date - Fecha a formatear
 * @returns {string} Fecha formateada: "2025-06-27 15:30:45"
 */
const formatForDetailedLogs = (date) => {
  if (!date) return 'Invalid Date';
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.toFormat('yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.warn('Error formatting date for detailed logs:', error);
    return 'Invalid Date';
  }
};

/**
 * Formatear solo la fecha (sin hora)
 * @param {string|Date|DateTime} date - Fecha a formatear
 * @returns {string} Fecha formateada: "2025-06-27"
 */
const formatColombiaDate = (date) => {
  if (!date) return 'Invalid Date';
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.toFormat('yyyy-MM-dd');
  } catch (error) {
    console.warn('Error formatting Colombia date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formatear fecha para mostrar al usuario
 * @param {string|Date|DateTime} date - Fecha a formatear
 * @returns {string} Fecha formateada: "27 de junio de 2025, 3:30 PM"
 */
const formatForDisplay = (date) => {
  if (!date) return 'Fecha inválida';
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.setLocale('es').toFormat('dd \'de\' MMMM \'de\' yyyy, h:mm a');
  } catch (error) {
    console.warn('Error formatting date for display:', error);
    return 'Fecha inválida';
  }
};

/**
 * Verificar si una fecha es anterior a hoy (en Colombia)
 * @param {string|Date|DateTime} date - Fecha a verificar
 * @returns {boolean} True si la fecha es anterior a hoy
 */
const isBeforeToday = (date) => {
  if (!date) return false;
  
  try {
    const colombiaTime = toColombiaTime(date);
    const today = getColombiaDate();
    
    return colombiaTime.startOf('day') < today;
  } catch (error) {
    console.warn('Error checking if date is before today:', error);
    return false;
  }
};

/**
 * Verificar si una fecha es hoy (en Colombia)
 * @param {string|Date|DateTime} date - Fecha a verificar
 * @returns {boolean} True si la fecha es hoy
 */
const isToday = (date) => {
  if (!date) return false;
  
  try {
    const colombiaTime = toColombiaTime(date);
    const today = getColombiaDate();
    
    return colombiaTime.startOf('day').equals(today);
  } catch (error) {
    console.warn('Error checking if date is today:', error);
    return false;
  }
};

/**
 * Calcular diferencia en días entre dos fechas
 * @param {string|Date|DateTime} startDate - Fecha inicial
 * @param {string|Date|DateTime} endDate - Fecha final
 * @returns {number} Número de días de diferencia
 */
const getDaysDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = toColombiaTime(startDate).startOf('day');
    const end = toColombiaTime(endDate).startOf('day');
    
    return Math.ceil(end.diff(start, 'days').days);
  } catch (error) {
    console.warn('Error calculating days difference:', error);
    return 0;
  }
};

/**
 * Agregar días a una fecha
 * @param {string|Date|DateTime} date - Fecha base
 * @param {number} days - Días a agregar
 * @returns {DateTime} Nueva fecha con días agregados
 */
const addDays = (date, days) => {
  if (!date) return null;
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.plus({ days });
  } catch (error) {
    console.warn('Error adding days to date:', error);
    return null;
  }
};

/**
 * Obtener inicio del día en Colombia
 * @param {string|Date|DateTime} date - Fecha
 * @returns {DateTime} Fecha con hora 00:00:00
 */
const startOfDay = (date) => {
  if (!date) return null;
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.startOf('day');
  } catch (error) {
    console.warn('Error getting start of day:', error);
    return null;
  }
};

/**
 * Obtener fin del día en Colombia
 * @param {string|Date|DateTime} date - Fecha
 * @returns {DateTime} Fecha con hora 23:59:59
 */
const endOfDay = (date) => {
  if (!date) return null;
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.endOf('day');
  } catch (error) {
    console.warn('Error getting end of day:', error);
    return null;
  }
};

/**
 * Validar si una fecha está en formato válido
 * @param {string|Date|DateTime} date - Fecha a validar
 * @returns {boolean} True si la fecha es válida
 */
const isValidDate = (date) => {
  if (!date) return false;
  
  try {
    const colombiaTime = toColombiaTime(date);
    return colombiaTime.isValid;
  } catch (error) {
    return false;
  }
};

/**
 * Convertir DateTime a Date de JavaScript para Sequelize
 * @param {DateTime} dateTime - DateTime de Luxon
 * @returns {Date} Objeto Date de JavaScript
 */
const toJSDate = (dateTime) => {
  if (!dateTime) return null;
  
  try {
    if (DateTime.isDateTime(dateTime)) {
      return dateTime.toJSDate();
    }
    return new Date(dateTime);
  } catch (error) {
    console.warn('Error converting to JS Date:', error);
    return null;
  }
};

/**
 * Parsear fecha desde string con formato específico
 * @param {string} dateString - String de fecha
 * @param {string} format - Formato de entrada (opcional)
 * @returns {DateTime} DateTime parseado
 */
const parseDate = (dateString, format = 'yyyy-MM-dd') => {
  if (!dateString) return null;
  
  try {
    if (format) {
      return DateTime.fromFormat(dateString, format, { zone: COLOMBIA_TIMEZONE });
    } else {
      return DateTime.fromISO(dateString, { zone: COLOMBIA_TIMEZONE });
    }
  } catch (error) {
    console.warn('Error parsing date:', error);
    return null;
  }
};

/**
 * Obtener información de horarios del hotel
 * @returns {Object} Configuración de horarios
 */
const getHotelSchedule = () => {
  const now = getColombiaTime();
  
  return {
    checkIn: {
      hour: 15,
      minute: 30,
      time: '3:30 PM',
      datetime: now.startOf('day').set({ hour: 15, minute: 30 })
    },
    checkOut: {
      hour: 12,
      minute: 0,
      time: '12:00 PM',
      datetime: now.startOf('day').set({ hour: 12, minute: 0 })
    },
    currentTime: now,
    timezone: COLOMBIA_TIMEZONE
  };
};

/**
 * Validar horario de check-in
 * @param {string|Date|DateTime} checkInDate - Fecha de check-in
 * @returns {Object} Resultado de validación
 */
const validateCheckInTime = (checkInDate) => {
  try {
    const checkIn = toColombiaTime(checkInDate);
    const now = getColombiaTime();
    const schedule = getHotelSchedule();
    
    // Si es hoy, verificar horario
    if (checkIn.hasSame(now, 'day')) {
      const checkInTime = schedule.checkIn.datetime;
      
      if (now < checkInTime) {
        return {
          valid: false,
          message: `El check-in para hoy solo está disponible después de las ${schedule.checkIn.time}`,
          earliestTime: schedule.checkIn.time,
          currentTime: formatForLogs(now)
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.warn('Error validating check-in time:', error);
    return { valid: false, message: 'Error validando horario de check-in' };
  }
};

/**
 * Validar horario de check-out
 * @param {string|Date|DateTime} checkOutDate - Fecha de check-out
 * @returns {Object} Resultado de validación
 */
const validateCheckOutTime = (checkOutDate) => {
  try {
    const checkOut = toColombiaTime(checkOutDate);
    const now = getColombiaTime();
    const schedule = getHotelSchedule();
    
    // Si es hoy, verificar horario
    if (checkOut.hasSame(now, 'day')) {
      const checkOutTime = schedule.checkOut.datetime;
      
      if (now > checkOutTime) {
        return {
          valid: false,
          message: `El check-out debe realizarse antes de las ${schedule.checkOut.time}`,
          latestTime: schedule.checkOut.time,
          currentTime: formatForLogs(now),
          isLate: true
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.warn('Error validating check-out time:', error);
    return { valid: false, message: 'Error validando horario de check-out' };
  }
};

module.exports = {
  // Funciones principales
  getColombiaTime,
  getColombiaDate,
  toColombiaTime,
  
  // Formateo
  formatForLogs,
  formatForDetailedLogs,
  formatColombiaDate,
  formatForDisplay,
  
  // Validaciones
  isBeforeToday,
  isToday,
  isValidDate,
  
  // Cálculos
  getDaysDifference,
  addDays,
  startOfDay,
  endOfDay,
  
  // Parseo y conversión
  parseDate,
  toJSDate,
  
  // Hotel específico
  getHotelSchedule,
  validateCheckInTime,
  validateCheckOutTime,
  
  // Constantes
  COLOMBIA_TIMEZONE
};