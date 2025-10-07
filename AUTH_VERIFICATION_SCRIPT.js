// 🔍 SCRIPT PARA VERIFICAR AUTENTICACIÓN OWNER
// Copia y pega esto en la consola del navegador

console.log('🔍 [AUTH-CHECK] Verificando autenticación...');

// 1. Verificar token en localStorage
const token = localStorage.getItem('token');
console.log('🔑 [TOKEN]', token ? 'Token encontrado' : '❌ NO HAY TOKEN');

if (token) {
  // 2. Decodificar JWT (solo payload, sin verificar firma)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('👤 [USER-DATA]', {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      exp: new Date(payload.exp * 1000).toLocaleString('es-CO'),
      isExpired: Date.now() >= payload.exp * 1000
    });
    
    // 3. Verificar si es owner
    if (payload.role === 'owner') {
      console.log('✅ [OWNER] Usuario es owner - puede crear staff');
    } else {
      console.log('❌ [NOT-OWNER] Usuario NO es owner:', payload.role);
      console.log('🚫 Solo usuarios con role "owner" pueden crear staff');
    }
  } catch (error) {
    console.error('❌ [TOKEN-ERROR] Error decodificando token:', error);
  }
}

// 4. Verificar datos del Redux store
const reduxState = window.__REDUX_DEVTOOLS_EXTENSION__ ? 
  window.__REDUX_DEVTOOLS_EXTENSION__.getActionsLog() : null;

if (window.store) {
  const authState = window.store.getState().auth;
  console.log('🏪 [REDUX-AUTH]', authState);
}