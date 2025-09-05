/**
 * Utilidades de fecha para el frontend que son consistentes con el backend
 */

/**
 * Obtener fecha actual en formato YYYY-MM-DD (zona horaria local)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getCurrentDate = () => {
  const now = new Date();
  // Ajustar a zona horaria local para evitar problemas de UTC
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Formatear fecha para envío al backend
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada para el backend
 */
export const formatDateForBackend = (dateString) => {
  if (!dateString) return null;
  
  // Si ya está en formato YYYY-MM-DD, devolverla tal como está
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Si es una fecha JavaScript, convertirla
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Fecha inválida:', dateString);
    return null;
  }
  
  // Ajustar a zona horaria local para evitar problemas de UTC
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Validar que una fecha no sea futura
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {boolean} True si la fecha es válida (no futura)
 */
export const isValidPastDate = (dateString) => {
  if (!dateString) return false;
  
  const selectedDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  return selectedDate <= today;
};

/**
 * Formatear fecha para mostrar al usuario
 * @param {string} dateString - Fecha en formato YYYY-MM-DD o ISO
 * @returns {string} Fecha formateada para mostrar
 */
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return 'Fecha inválida';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date for display:', error);
    return 'Fecha inválida';
  }
};

/**
 * Obtener fecha máxima permitida (hoy)
 * @returns {string} Fecha máxima en formato YYYY-MM-DD
 */
export const getMaxDate = () => {
  return getCurrentDate();
};

/**
 * Obtener fecha mínima permitida (ejemplo: hace 1 año)
 * @returns {string} Fecha mínima en formato YYYY-MM-DD
 */
export const getMinDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};
