const { DateTime } = require('luxon');

// 🇨🇴 ZONA HORARIA DE COLOMBIA
const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * 📅 UTILIDADES ESPECÍFICAS PARA MANEJO DE FECHAS EN RESERVAS DE HOTEL
 * 
 * REGLAS CRÍTICAS:
 * 1. Las fechas de check-in/check-out son SOLO FECHAS (sin hora específica)
 * 2. Siempre usar zona horaria de Colombia
 * 3. Check-in conceptual: 3:00 PM del día seleccionado
 * 4. Check-out conceptual: 12:00 PM del día seleccionado
 * 5. Comparaciones de fechas deben ser "día completo" no hora exacta
 */

/**
 * Parsear fecha string (YYYY-MM-DD) a DateTime de Colombia
 * Asume que la fecha string viene sin información de zona horaria
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {DateTime} DateTime al inicio del día en Colombia
 */
function parseCheckInOutDate(dateString) {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  // 🔧 CRÍTICO: Parsear como fecha local de Colombia, no UTC
  // Si usamos fromISO() con una fecha YYYY-MM-DD, Luxon la interpreta como medianoche UTC
  // Debemos forzar la zona horaria de Colombia desde el inicio
  const dt = DateTime.fromISO(dateString, { zone: COLOMBIA_TIMEZONE }).startOf('day');

  if (!dt.isValid) {
    throw new Error(`Invalid date string: ${dateString}. Error: ${dt.invalidReason}`);
  }

  console.log(`📅 [BOOKING-DATE] Parsed "${dateString}" as:`, {
    iso: dt.toISO(),
    formatted: dt.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ'),
    timezone: dt.zoneName,
    offset: dt.offset
  });

  return dt;
}

/**
 * Obtener la fecha de hoy en Colombia (inicio del día)
 * @returns {DateTime} Hoy a las 00:00:00 en Colombia
 */
function getTodayInColombia() {
  return DateTime.now().setZone(COLOMBIA_TIMEZONE).startOf('day');
}

/**
 * Verificar si una fecha de check-in es válida (no en el pasado)
 * @param {string|DateTime} checkIn - Fecha de check-in
 * @returns {boolean} true si es hoy o futuro, false si es pasado
 */
function isValidCheckInDate(checkIn) {
  const checkInDT = typeof checkIn === 'string' 
    ? parseCheckInOutDate(checkIn) 
    : checkIn;
  
  const today = getTodayInColombia();

  // Comparar solo las fechas (ignorando horas)
  const isValid = checkInDT >= today;

  console.log(`🔍 [BOOKING-DATE] Check-in validation:`, {
    checkIn: checkInDT.toFormat('yyyy-MM-dd'),
    today: today.toFormat('yyyy-MM-dd'),
    isValid,
    daysDifference: Math.floor(checkInDT.diff(today, 'days').days)
  });

  return isValid;
}

/**
 * Verificar si el rango de fechas es válido
 * @param {string|DateTime} checkIn - Fecha de check-in
 * @param {string|DateTime} checkOut - Fecha de check-out
 * @returns {Object} { valid: boolean, error: string|null, nights: number }
 */
function validateDateRange(checkIn, checkOut) {
  const checkInDT = typeof checkIn === 'string' 
    ? parseCheckInOutDate(checkIn) 
    : checkIn;
  
  const checkOutDT = typeof checkOut === 'string' 
    ? parseCheckInOutDate(checkOut) 
    : checkOut;

  // Calcular noches
  const nights = Math.floor(checkOutDT.diff(checkInDT, 'days').days);

  console.log(`📊 [BOOKING-DATE] Date range validation:`, {
    checkIn: checkInDT.toFormat('yyyy-MM-dd'),
    checkOut: checkOutDT.toFormat('yyyy-MM-dd'),
    nights,
    checkOutAfterCheckIn: checkOutDT > checkInDT
  });

  if (checkOutDT <= checkInDT) {
    return {
      valid: false,
      error: 'La fecha de check-out debe ser posterior al check-in',
      nights: 0
    };
  }

  if (nights < 1) {
    return {
      valid: false,
      error: 'La reserva debe ser de al menos 1 noche',
      nights: 0
    };
  }

  return {
    valid: true,
    error: null,
    nights
  };
}

/**
 * Calcular el número de noches entre dos fechas
 * @param {string|DateTime} checkIn - Fecha de check-in
 * @param {string|DateTime} checkOut - Fecha de check-out
 * @returns {number} Número de noches
 */
function calculateNights(checkIn, checkOut) {
  const checkInDT = typeof checkIn === 'string' 
    ? parseCheckInOutDate(checkIn) 
    : checkIn;
  
  const checkOutDT = typeof checkOut === 'string' 
    ? parseCheckInOutDate(checkOut) 
    : checkOut;

  const nights = Math.floor(checkOutDT.diff(checkInDT, 'days').days);
  return Math.max(nights, 0);
}

/**
 * Verificar si hay solapamiento entre dos reservas
 * @param {Object} booking1 - { checkIn, checkOut }
 * @param {Object} booking2 - { checkIn, checkOut }
 * @returns {boolean} true si hay solapamiento
 */
function hasDateOverlap(booking1, booking2) {
  const start1 = typeof booking1.checkIn === 'string' 
    ? parseCheckInOutDate(booking1.checkIn) 
    : booking1.checkIn;
  
  const end1 = typeof booking1.checkOut === 'string' 
    ? parseCheckInOutDate(booking1.checkOut) 
    : booking1.checkOut;

  const start2 = typeof booking2.checkIn === 'string' 
    ? parseCheckInOutDate(booking2.checkIn) 
    : booking2.checkIn;
  
  const end2 = typeof booking2.checkOut === 'string' 
    ? parseCheckInOutDate(booking2.checkOut) 
    : booking2.checkOut;

  // Hay solapamiento si:
  // - El inicio de booking1 está entre booking2
  // - El fin de booking1 está entre booking2
  // - booking1 contiene completamente a booking2
  const overlaps = (
    (start1 >= start2 && start1 < end2) || // Inicio de 1 dentro de 2
    (end1 > start2 && end1 <= end2) ||     // Fin de 1 dentro de 2
    (start1 <= start2 && end1 >= end2)     // 1 contiene a 2
  );

  console.log(`🔍 [BOOKING-DATE] Overlap check:`, {
    booking1: `${start1.toFormat('yyyy-MM-dd')} to ${end1.toFormat('yyyy-MM-dd')}`,
    booking2: `${start2.toFormat('yyyy-MM-dd')} to ${end2.toFormat('yyyy-MM-dd')}`,
    overlaps
  });

  return overlaps;
}

/**
 * Convertir DateTime a formato para la base de datos
 * PostgreSQL espera DATEONLY en formato YYYY-MM-DD
 * @param {string|DateTime} date - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function toDBFormat(date) {
  const dt = typeof date === 'string' 
    ? parseCheckInOutDate(date) 
    : date;
  
  return dt.toFormat('yyyy-MM-dd');
}

/**
 * Convertir DateTime a ISO string para respuestas JSON
 * @param {string|DateTime} date - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
function toISOString(date) {
  const dt = typeof date === 'string' 
    ? parseCheckInOutDate(date) 
    : date;
  
  return dt.toISO();
}

module.exports = {
  COLOMBIA_TIMEZONE,
  parseCheckInOutDate,
  getTodayInColombia,
  isValidCheckInDate,
  validateDateRange,
  calculateNights,
  hasDateOverlap,
  toDBFormat,
  toISOString
};
