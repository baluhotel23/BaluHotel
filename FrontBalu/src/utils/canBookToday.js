/**
 * Devuelve true si se puede reservar para hoy según la hora de Colombia.
 * @returns {boolean}
 */
export function canBookToday() {
  // Colombia es UTC-5
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaNow = new Date(utc - (5 * 60 * 60000));
  const hour = colombiaNow.getHours();
  const minute = colombiaNow.getMinutes();
  console.log("🇨🇴 ColombiaNow:", colombiaNow, "Hour:", hour, "Minute:", minute);

  return hour < 15 || (hour === 15 && minute < 30);
}