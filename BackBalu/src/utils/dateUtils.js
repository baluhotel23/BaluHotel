/**
 * Utilidades para manejo de fechas en zona horaria de Colombia
 */

/**
 * Obtiene la fecha actual en zona horaria de Colombia
 * @returns {Date} Fecha actual en Colombia
 */
const getColombiaTime = () => {
  const today = new Date();
  return new Date(today.toLocaleString("en-US", { timeZone: "America/Bogota" }));
};

/**
 * Obtiene solo la fecha (sin hora) en zona horaria de Colombia
 * @returns {Date} Fecha actual sin hora en Colombia
 */
const getColombiaDate = () => {
  const colombiaTime = getColombiaTime();
  return new Date(colombiaTime.getFullYear(), colombiaTime.getMonth(), colombiaTime.getDate());
};

/**
 * Convierte cualquier fecha a zona horaria de Colombia
 * @param {Date|string} date - Fecha a convertir
 * @returns {Date} Fecha en zona horaria de Colombia
 */
const toColombiaTime = (date) => {
  const inputDate = new Date(date);
  return new Date(inputDate.toLocaleString("en-US", { timeZone: "America/Bogota" }));
};

/**
 * Formatea fecha para mostrar en Colombia
 * @param {Date|string} date - Fecha a formatear
 * @param {boolean} includeTime - Si incluir hora o solo fecha
 * @param {boolean} includeSeconds - Si incluir segundos (solo si includeTime es true)
 * @returns {string} Fecha formateada
 */
const formatColombiaDate = (date, includeTime = false, includeSeconds = false) => {
  const inputDate = new Date(date);
  const options = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false; // ⭐ Formato 24 horas
    
    // ⭐ SOLO AGREGAR SEGUNDOS SI SE SOLICITA
    if (includeSeconds) {
      options.second = '2-digit';
    }
  }

  return inputDate.toLocaleString('es-CO', options);
};

/**
 * Compara si una fecha es anterior a hoy (solo fecha, sin hora)
 * @param {Date|string} date - Fecha a comparar
 * @returns {boolean} True si es anterior a hoy
 */
const isBeforeToday = (date) => {
  const inputDate = new Date(date);
  const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  const today = getColombiaDate();
  
  return inputDateOnly < today;
};

/**
 * Compara si una fecha es hoy
 * @param {Date|string} date - Fecha a comparar
 * @returns {boolean} True si es hoy
 */
const isToday = (date) => {
  const inputDate = new Date(date);
  const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  const today = getColombiaDate();
  
  return inputDateOnly.getTime() === today.getTime();
};

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {Date|string} startDate - Fecha inicial
 * @param {Date|string} endDate - Fecha final
 * @returns {number} Número de días
 */
const getDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * Verifica si una fecha está dentro de un rango
 * @param {Date|string} date - Fecha a verificar
 * @param {Date|string} startDate - Fecha inicial del rango
 * @param {Date|string} endDate - Fecha final del rango
 * @returns {boolean} True si está en el rango
 */
const isDateInRange = (date, startDate, endDate) => {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return checkDate >= start && checkDate <= end;
};

// ⭐ FUNCIONES DE CONVENIENCIA PARA LOGS
/**
 * Formatea fecha para logs (con hora, sin segundos)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada para logs
 */
const formatForLogs = (date) => {
  return formatColombiaDate(date, true, false); // Con hora, sin segundos
};

/**
 * Formatea fecha para logs detallados (con hora y segundos)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada para logs detallados
 */
const formatForDetailedLogs = (date) => {
  return formatColombiaDate(date, true, true); // Con hora y segundos
};

module.exports = {
  getColombiaTime,
  getColombiaDate,
  toColombiaTime,
  formatColombiaDate,
  isBeforeToday,
  isToday,
  getDaysDifference,
  isDateInRange,
  // ⭐ EXPORTAR LAS FUNCIONES DE CONVENIENCIA
  formatForLogs,
  formatForDetailedLogs
};