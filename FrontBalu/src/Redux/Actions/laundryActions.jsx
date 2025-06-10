import api from '../../utils/axios';
import { toast } from 'react-toastify';

// ⭐ OBTENER ESTADO GENERAL DE LAVANDERÍA
export const getLaundryStatus = () => async (dispatch) => {
  dispatch({ type: 'GET_LAUNDRY_STATUS_REQUEST' });
  try {
    const { data } = await api.get('/laundry/status');
    dispatch({ 
      type: 'GET_LAUNDRY_STATUS_SUCCESS', 
      payload: data.data 
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener estado de lavandería';
    dispatch({ 
      type: 'GET_LAUNDRY_STATUS_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER ITEMS PENDIENTES EN LAVANDERÍA
export const getPendingLaundry = () => async (dispatch) => {
  dispatch({ type: 'GET_PENDING_LAUNDRY_REQUEST' });
  try {
    const { data } = await api.get('/laundry/pending');
    dispatch({ 
      type: 'GET_PENDING_LAUNDRY_SUCCESS', 
      payload: data.data 
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener items pendientes';
    dispatch({ 
      type: 'GET_PENDING_LAUNDRY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ENVIAR ITEMS A LAVANDERÍA
export const sendToLaundry = (laundryData) => async (dispatch) => {
  dispatch({ type: 'SEND_TO_LAUNDRY_REQUEST' });
  try {
    const { data } = await api.post('/laundry/send', laundryData);
    dispatch({ 
      type: 'SEND_TO_LAUNDRY_SUCCESS', 
      payload: data.data 
    });
    toast.success(data.message || 'Items enviados a lavandería exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al enviar items a lavandería';
    dispatch({ 
      type: 'SEND_TO_LAUNDRY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ RECIBIR ITEMS DE LAVANDERÍA
export const receiveFromLaundry = (receiveData) => async (dispatch) => {
  dispatch({ type: 'RECEIVE_FROM_LAUNDRY_REQUEST' });
  try {
    const { data } = await api.post('/laundry/receive', receiveData);
    dispatch({ 
      type: 'RECEIVE_FROM_LAUNDRY_SUCCESS', 
      payload: data.data 
    });
    toast.success(data.message || 'Items recibidos de lavandería exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al recibir items de lavandería';
    dispatch({ 
      type: 'RECEIVE_FROM_LAUNDRY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ MARCAR ITEMS COMO SUCIOS
export const markAsDirty = (dirtyData) => async (dispatch) => {
  dispatch({ type: 'MARK_AS_DIRTY_REQUEST' });
  try {
    const { data } = await api.post('/laundry/mark-dirty', dirtyData);
    dispatch({ 
      type: 'MARK_AS_DIRTY_SUCCESS', 
      payload: data.data 
    });
    toast.success(data.message || 'Items marcados como sucios exitosamente');
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al marcar items como sucios';
    dispatch({ 
      type: 'MARK_AS_DIRTY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ OBTENER HISTORIAL DE LAVANDERÍA
export const getLaundryHistory = (queryParams = {}) => async (dispatch) => {
  dispatch({ type: 'GET_LAUNDRY_HISTORY_REQUEST' });
  try {
    const { data } = await api.get('/laundry/history', { params: queryParams });
    dispatch({ 
      type: 'GET_LAUNDRY_HISTORY_SUCCESS', 
      payload: data.data 
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener historial de lavandería';
    dispatch({ 
      type: 'GET_LAUNDRY_HISTORY_FAILURE', 
      payload: errorMessage 
    });
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTIONS AUXILIARES PARA MANEJO LOCAL

// Limpiar estado de lavandería
export const clearLaundryState = () => (dispatch) => {
  dispatch({ type: 'CLEAR_LAUNDRY_STATE' });
};

// Actualizar item local después de movimiento
export const updateLaundryItemLocal = (itemId, updates) => (dispatch) => {
  dispatch({ 
    type: 'UPDATE_LAUNDRY_ITEM_LOCAL', 
    payload: { itemId, updates } 
  });
};

// ⭐ ACTION COMPUESTA PARA FLUJO COMPLETO DE CHECK-OUT
export const processCheckoutLaundry = (checkoutData) => async (dispatch) => {
  dispatch({ type: 'PROCESS_CHECKOUT_LAUNDRY_REQUEST' });
  
  try {
    const { bookingId, roomNumber, dirtyItems } = checkoutData;
    
    // Marcar items como sucios cuando salen de la habitación
    const result = await dispatch(markAsDirty({
      bookingId,
      roomNumber,
      items: dirtyItems
    }));
    
    if (result.success) {
      dispatch({ 
        type: 'PROCESS_CHECKOUT_LAUNDRY_SUCCESS', 
        payload: {
          bookingId,
          roomNumber,
          processedItems: result.data
        }
      });
      
      // Actualizar también el estado de la lavandería
      dispatch(getLaundryStatus());
      
      return { success: true, data: result.data };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    const errorMessage = error.message || 'Error al procesar lavandería de check-out';
    dispatch({ 
      type: 'PROCESS_CHECKOUT_LAUNDRY_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION PARA OBTENER RESUMEN DE LAVANDERÍA POR HABITACIÓN
export const getLaundryByRoom = (roomNumber, dateRange = {}) => async (dispatch) => {
  dispatch({ type: 'GET_LAUNDRY_BY_ROOM_REQUEST' });
  try {
    const queryParams = {
      roomNumber,
      ...dateRange
    };
    
    const { data } = await api.get('/laundry/history', { params: queryParams });
    
    dispatch({ 
      type: 'GET_LAUNDRY_BY_ROOM_SUCCESS', 
      payload: {
        roomNumber,
        laundryData: data.data
      }
    });
    
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener lavandería por habitación';
    dispatch({ 
      type: 'GET_LAUNDRY_BY_ROOM_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTION PARA ESTADÍSTICAS DE LAVANDERÍA
export const getLaundryStats = (period = 'week') => async (dispatch) => {
  dispatch({ type: 'GET_LAUNDRY_STATS_REQUEST' });
  try {
    // Calcular fechas según el período
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    const { data } = await api.get('/laundry/history', {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
    
    // Procesar estadísticas en el frontend
    const stats = processLaundryStats(data.data, period);
    
    dispatch({ 
      type: 'GET_LAUNDRY_STATS_SUCCESS', 
      payload: {
        period,
        stats,
        rawData: data.data
      }
    });
    
    return { success: true, data: stats };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener estadísticas de lavandería';
    dispatch({ 
      type: 'GET_LAUNDRY_STATS_FAILURE', 
      payload: errorMessage 
    });
    return { success: false, error: errorMessage };
  }
};

// ⭐ FUNCIÓN AUXILIAR PARA PROCESAR ESTADÍSTICAS
const processLaundryStats = (movements, period) => {
  const stats = {
    period, // ⭐ USAR EL PARÁMETRO PERIOD
    totalMovements: movements.length,
    itemsSentToLaundry: 0,
    itemsReceivedFromLaundry: 0,
    itemsMarkedDirty: 0,
    averageWashingTime: 0,
    mostUsedItems: {},
    dailyMovements: {},
    // ⭐ NUEVAS ESTADÍSTICAS BASADAS EN EL PERÍODO
    periodSummary: {
      totalDays: 0,
      averageMovementsPerDay: 0,
      peakDay: null,
      quietestDay: null
    },
    efficiencyMetrics: {
      turnaroundTime: 0,
      washingCycles: 0,
      lossRate: 0
    }
  };
  
  // ⭐ CALCULAR DÍAS TOTALES SEGÚN EL PERÍODO
  switch (period) {
    case 'week':
      stats.periodSummary.totalDays = 7;
      break;
    case 'month':
      stats.periodSummary.totalDays = 30;
      break;
    case 'year':
      stats.periodSummary.totalDays = 365;
      break;
    default:
      stats.periodSummary.totalDays = 7;
  }
  
  // Contadores para métricas de eficiencia
  let totalWashingTime = 0;
  let washingCycles = 0;
  let lostItems = 0;
  
  movements.forEach(movement => {
    // Contar por tipo de movimiento
    switch (movement.movementType) {
      case 'dirty_to_washing':
        stats.itemsSentToLaundry += movement.quantity;
        washingCycles++;
        break;
      case 'washing_to_clean':
        stats.itemsReceivedFromLaundry += movement.quantity;
        // ⭐ CALCULAR TIEMPO DE LAVADO SI ESTÁ DISPONIBLE
        if (movement.washingTime) {
          totalWashingTime += movement.washingTime;
        }
        break;
      case 'clean_to_dirty':
        stats.itemsMarkedDirty += movement.quantity;
        break;
      case 'lost':
        lostItems += movement.quantity;
        break;
    }
    
    // Contar items más usados
    const itemName = movement.inventory?.name || 'Desconocido';
    if (!stats.mostUsedItems[itemName]) {
      stats.mostUsedItems[itemName] = {
        name: itemName,
        totalQuantity: 0,
        movements: 0,
        averagePerMovement: 0
      };
    }
    stats.mostUsedItems[itemName].totalQuantity += movement.quantity;
    stats.mostUsedItems[itemName].movements += 1;
    stats.mostUsedItems[itemName].averagePerMovement = 
      stats.mostUsedItems[itemName].totalQuantity / stats.mostUsedItems[itemName].movements;
    
    // Contar por día
    const day = movement.createdAt ? movement.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
    if (!stats.dailyMovements[day]) {
      stats.dailyMovements[day] = {
        date: day,
        totalMovements: 0,
        totalQuantity: 0,
        types: {}
      };
    }
    stats.dailyMovements[day].totalMovements += 1;
    stats.dailyMovements[day].totalQuantity += movement.quantity;
    
    if (!stats.dailyMovements[day].types[movement.movementType]) {
      stats.dailyMovements[day].types[movement.movementType] = 0;
    }
    stats.dailyMovements[day].types[movement.movementType] += movement.quantity;
  });
  
  // ⭐ CALCULAR MÉTRICAS DE EFICIENCIA
  stats.averageWashingTime = washingCycles > 0 ? totalWashingTime / washingCycles : 0;
  stats.efficiencyMetrics.washingCycles = washingCycles;
  stats.efficiencyMetrics.turnaroundTime = stats.averageWashingTime;
  stats.efficiencyMetrics.lossRate = stats.itemsSentToLaundry > 0 
    ? (lostItems / stats.itemsSentToLaundry) * 100 
    : 0;
  
  // ⭐ CALCULAR ESTADÍSTICAS DEL PERÍODO
  const dailyValues = Object.values(stats.dailyMovements);
  if (dailyValues.length > 0) {
    stats.periodSummary.averageMovementsPerDay = 
      dailyValues.reduce((sum, day) => sum + day.totalMovements, 0) / dailyValues.length;
    
    // Encontrar día más activo y más tranquilo
    const peakDay = dailyValues.reduce((peak, day) => 
      day.totalMovements > peak.totalMovements ? day : peak, dailyValues[0]);
    const quietestDay = dailyValues.reduce((quiet, day) => 
      day.totalMovements < quiet.totalMovements ? day : quiet, dailyValues[0]);
    
    stats.periodSummary.peakDay = {
      date: peakDay.date,
      movements: peakDay.totalMovements,
      quantity: peakDay.totalQuantity
    };
    
    stats.periodSummary.quietestDay = {
      date: quietestDay.date,
      movements: quietestDay.totalMovements,
      quantity: quietestDay.totalQuantity
    };
  }
  
  // ⭐ CONVERTIR OBJETOS A ARRAYS PARA FACILITAR EL USO EN COMPONENTES
  stats.mostUsedItems = Object.values(stats.mostUsedItems)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10); // Top 10 items más usados
  
  stats.dailyMovements = Object.values(stats.dailyMovements)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // ⭐ AGREGAR TENDENCIAS BASADAS EN EL PERÍODO
  if (period === 'week') {
    stats.trends = calculateWeeklyTrends(stats.dailyMovements);
  } else if (period === 'month') {
    stats.trends = calculateMonthlyTrends(stats.dailyMovements);
  } else if (period === 'year') {
    stats.trends = calculateYearlyTrends(stats.dailyMovements);
  }
  
  return stats;
};

// ⭐ FUNCIONES AUXILIARES PARA CALCULAR TENDENCIAS
const calculateWeeklyTrends = (dailyData) => {
  // Agrupar por día de la semana
  const weekdayStats = {};
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  dailyData.forEach(day => {
    const weekday = weekdays[new Date(day.date).getDay()];
    if (!weekdayStats[weekday]) {
      weekdayStats[weekday] = { totalMovements: 0, count: 0 };
    }
    weekdayStats[weekday].totalMovements += day.totalMovements;
    weekdayStats[weekday].count += 1;
  });
  
  return {
    busiestWeekday: Object.keys(weekdayStats).reduce((a, b) => 
      weekdayStats[a].totalMovements > weekdayStats[b].totalMovements ? a : b),
    quietestWeekday: Object.keys(weekdayStats).reduce((a, b) => 
      weekdayStats[a].totalMovements < weekdayStats[b].totalMovements ? a : b),
    weekdayAverages: Object.keys(weekdayStats).map(day => ({
      day,
      average: weekdayStats[day].count > 0 ? weekdayStats[day].totalMovements / weekdayStats[day].count : 0
    }))
  };
};

const calculateMonthlyTrends = (dailyData) => {
  // Agrupar por semanas del mes
  const weeklyStats = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const weekOfMonth = Math.ceil(date.getDate() / 7);
    
    if (!weeklyStats[weekOfMonth]) {
      weeklyStats[weekOfMonth] = { totalMovements: 0, count: 0 };
    }
    weeklyStats[weekOfMonth].totalMovements += day.totalMovements;
    weeklyStats[weekOfMonth].count += 1;
  });
  
  return {
    busiestWeek: Object.keys(weeklyStats).reduce((a, b) => 
      weeklyStats[a].totalMovements > weeklyStats[b].totalMovements ? a : b),
    weeklyAverages: Object.keys(weeklyStats).map(week => ({
      week: `Semana ${week}`,
      average: weeklyStats[week].count > 0 ? weeklyStats[week].totalMovements / weeklyStats[week].count : 0
    }))
  };
};

const calculateYearlyTrends = (dailyData) => {
  // Agrupar por meses
  const monthlyStats = {};
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  dailyData.forEach(day => {
    const month = months[new Date(day.date).getMonth()];
    
    if (!monthlyStats[month]) {
      monthlyStats[month] = { totalMovements: 0, count: 0 };
    }
    monthlyStats[month].totalMovements += day.totalMovements;
    monthlyStats[month].count += 1;
  });
  
  return {
    busiestMonth: Object.keys(monthlyStats).reduce((a, b) => 
      monthlyStats[a].totalMovements > monthlyStats[b].totalMovements ? a : b),
    monthlyAverages: Object.keys(monthlyStats).map(month => ({
      month,
      average: monthlyStats[month].count > 0 ? monthlyStats[month].totalMovements / monthlyStats[month].count : 0
    }))
  };
};