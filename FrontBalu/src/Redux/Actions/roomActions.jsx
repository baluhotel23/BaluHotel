import api from '../../utils/axios';

// Obtener todas las habitaciones
export const getAllRooms = () => async (dispatch) => {
  dispatch({ type: 'GET_ROOMS_REQUEST' });
  try {
    const { data } = await api.get('/rooms');
    dispatch({ type: 'GET_ROOMS_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener habitaciones';
    dispatch({ type: 'GET_ROOMS_FAILURE', payload: errorMessage });
  }
};

// Obtener tipos de habitaciones
export const getRoomTypes = () => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_TYPES_REQUEST' });
  try {
    const { data } = await api.get('/rooms/types');
    dispatch({ type: 'GET_ROOM_TYPES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener tipos de habitación';
    dispatch({ type: 'GET_ROOM_TYPES_FAILURE', payload: errorMessage });
  }
};

// Obtener una habitación por roomNumber
export const getRoomById = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}`);
    dispatch({ type: 'GET_ROOM_SUCCESS', payload: data.data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener la habitación';
    dispatch({ type: 'GET_ROOM_FAILURE', payload: errorMessage });
  }
};
// Buscar una habitación por input (query string)
export const searchRoomByInput = (roomNumber) => async (dispatch) => {
  dispatch({ type: "SEARCH_ROOM_REQUEST" });
  try {
    const { data } = await api.get(`/rooms`, {
      params: { roomNumber }, // Enviar como query string
    });

    // Si el backend devuelve un array, selecciona el primer elemento
    const room = Array.isArray(data.data) ? data.data[0] : data.data;

    dispatch({ type: "SEARCH_ROOM_SUCCESS", payload: room });
    return { error: false, data: room }; // Devuelve un objeto con la propiedad `error`
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al buscar la habitación";
    dispatch({ type: "SEARCH_ROOM_FAILURE", payload: errorMessage });
    return { error: true, message: errorMessage }; // Devuelve un objeto con la propiedad `error`
  }
};

// Verificar disponibilidad (se espera que "dates" tenga el formato requerido)
export const checkAvailability = (dates) => async (dispatch) => {
  dispatch({ type: 'CHECK_AVAILABILITY_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/availability/${dates}`);
    dispatch({ type: 'CHECK_AVAILABILITY_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al verificar disponibilidad';
    dispatch({ type: 'CHECK_AVAILABILITY_FAILURE', payload: errorMessage });
  }
};

// Crear una habitación
export const createRoom = (roomData) => async (dispatch) => {
  dispatch({ type: "CREATE_ROOM_REQUEST" });
  try {
    const { data } = await api.post("/rooms/create", roomData); // Enviar roomData con basicInventory
    dispatch({ type: "CREATE_ROOM_SUCCESS", payload: data });
    return { success: true, data: data.data }; // Devolver la habitación creada
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al crear la habitación";
    dispatch({ type: "CREATE_ROOM_FAILURE", payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// Actualizar una habitación
export const updateRoom = (roomNumber, roomData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}`, roomData);
    dispatch({ type: 'UPDATE_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar la habitación';
    dispatch({ type: 'UPDATE_ROOM_FAILURE', payload: errorMessage });
  }
};

// Eliminar una habitación
export const deleteRoom = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'DELETE_ROOM_REQUEST' });
  try {
    const { data } = await api.delete(`/rooms/${roomNumber}`);
    dispatch({ type: 'DELETE_ROOM_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al eliminar la habitación';
    dispatch({ type: 'DELETE_ROOM_FAILURE', payload: errorMessage });
  }
};

// Actualizar el estado de una habitación
export const updateRoomStatus = (roomNumber, statusData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_STATUS_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/status/${roomNumber}`, statusData);
    dispatch({ type: 'UPDATE_ROOM_STATUS_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar el estado de la habitación';
    dispatch({ type: 'UPDATE_ROOM_STATUS_FAILURE', payload: errorMessage });
  }
};

// Obtener amenities de una habitación
export const getRoomAmenities = (roomNumber) => async (dispatch) => {
  dispatch({ type: "GET_ROOM_AMENITIES_REQUEST" });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}/amenities`);
    dispatch({ type: "GET_ROOM_AMENITIES_SUCCESS", payload: data });
    return { error: false, data }; // Devuelve un objeto con la propiedad `error`
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "Error al obtener amenities";
    dispatch({ type: "GET_ROOM_AMENITIES_FAILURE", payload: errorMessage });
    return { error: true, message: errorMessage }; // Devuelve un objeto con la propiedad `error`
  }
};

// Actualizar amenities de una habitación
export const updateRoomAmenities = (roomNumber, amenitiesData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_AMENITIES_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}/amenities`, amenitiesData);
    dispatch({ type: 'UPDATE_ROOM_AMENITIES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar amenities';
    dispatch({ type: 'UPDATE_ROOM_AMENITIES_FAILURE', payload: errorMessage });
  }
};

// Obtener servicios de una habitación
export const getRoomServices = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_SERVICES_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/${roomNumber}/services`);
    dispatch({ type: 'GET_ROOM_SERVICES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener servicios';
    dispatch({ type: 'GET_ROOM_SERVICES_FAILURE', payload: errorMessage });
  }
};

// Actualizar servicios de una habitación
export const updateRoomServices = (roomNumber, servicesData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_ROOM_SERVICES_REQUEST' });
  try {
    const { data } = await api.put(`/rooms/${roomNumber}/services`, servicesData);
    dispatch({ type: 'UPDATE_ROOM_SERVICES_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al actualizar servicios';
    dispatch({ type: 'UPDATE_ROOM_SERVICES_FAILURE', payload: errorMessage });
  }
};

// Obtener reporte de ocupación
export const getOccupancyReport = () => async (dispatch) => {
  dispatch({ type: 'GET_OCCUPANCY_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/rooms/reports/occupancy');
    dispatch({ type: 'GET_OCCUPANCY_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener reporte de ocupación';
    dispatch({ type: 'GET_OCCUPANCY_REPORT_FAILURE', payload: errorMessage });
  }
};

// Obtener reporte de ingresos por tipo de habitación
export const getRevenueByRoomType = () => async (dispatch) => {
  dispatch({ type: 'GET_REVENUE_REPORT_REQUEST' });
  try {
    const { data } = await api.get('/rooms/reports/revenue');
    dispatch({ type: 'GET_REVENUE_REPORT_SUCCESS', payload: data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener reporte de ingresos';
    dispatch({ type: 'GET_REVENUE_REPORT_FAILURE', payload: errorMessage });
  }
};

export const getRoomsToPrepare = (date) => async (dispatch) => {
  dispatch({ type: 'GET_ROOMS_TO_PREPARE_REQUEST' });
  try {
    const { data } = await api.get('/rooms/preparation-list', { params: { date } });
    dispatch({ type: 'GET_ROOMS_TO_PREPARE_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener habitaciones a preparar';
    dispatch({ type: 'GET_ROOMS_TO_PREPARE_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

export const getRoomBasics = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_BASICS_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/basicos/${roomNumber}`);
    
    // ⭐ AGREGAR CONSOLE.LOG PARA DEBUG
    console.log('🔍 Respuesta completa del endpoint:', data);
    console.log('🔍 Data array recibido:', data.data);
    console.log('🔍 Room Number:', roomNumber);
    
    // ⭐ CORREGIR EL PAYLOAD - data.data es un array, no un objeto
    const payload = {
      roomNumber: roomNumber,
      basics: data.data, // ⭐ Guardar el array en una propiedad específica
      message: data.message
    };
    
    console.log('📦 Payload que se enviará al reducer:', payload);
    
    dispatch({ type: 'GET_ROOM_BASICS_SUCCESS', payload });
    return { error: false, data: payload };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener básicos de la habitación';
    console.error('❌ Error en getRoomBasics:', errorMessage);
    dispatch({ type: 'GET_ROOM_BASICS_FAILURE', payload: errorMessage });
    return { error: true, message: errorMessage };
  }
};

export const updateRoomBasicsStock = (roomNumber, itemId, quantity) => (dispatch) => {
  dispatch({ 
    type: 'UPDATE_ROOM_BASICS_STOCK', 
    payload: { roomNumber, itemId, quantity } 
  });
};

// ⭐ NUEVA ACTION PARA LIMPIAR BÁSICOS DE UNA HABITACIÓN
export const clearRoomBasics = (roomNumber) => (dispatch) => {
  dispatch({ 
    type: 'CLEAR_ROOM_BASICS', 
    payload: { roomNumber } 
  });
};

export const getActivePromotions = () => async (dispatch) => {
  dispatch({ type: 'GET_ACTIVE_PROMOTIONS_REQUEST' });
  try {
    const { data } = await api.get('/rooms/promotions');
    dispatch({ type: 'GET_ACTIVE_PROMOTIONS_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener promociones activas';
    dispatch({ type: 'GET_ACTIVE_PROMOTIONS_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// Obtener ofertas especiales
export const getSpecialOffers = () => async (dispatch) => {
  dispatch({ type: 'GET_SPECIAL_OFFERS_REQUEST' });
  try {
    const { data } = await api.get('/rooms/special-offers');
    dispatch({ type: 'GET_SPECIAL_OFFERS_SUCCESS', payload: data.data });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener ofertas especiales';
    dispatch({ type: 'GET_SPECIAL_OFFERS_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// ⭐ NUEVAS ACTIONS PARA CÁLCULO DE PRECIOS

// Calcular precio de una habitación específica
export const calculateRoomPrice = (priceData) => async (dispatch) => {
  dispatch({ type: 'CALCULATE_ROOM_PRICE_REQUEST' });
  try {
    const { data } = await api.post('/rooms/pricing/calculate', priceData);
    dispatch({ 
      type: 'CALCULATE_ROOM_PRICE_SUCCESS', 
      payload: {
        roomNumber: priceData.roomNumber,
        calculation: data.data
      }
    });
    return { 
      success: true, 
      data: data.data,
      message: data.message 
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al calcular precio de la habitación';
    dispatch({ type: 'CALCULATE_ROOM_PRICE_FAILURE', payload: errorMessage });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// Calcular precios de múltiples habitaciones
export const calculateMultipleRoomPrices = (priceData) => async (dispatch) => {
  dispatch({ type: 'CALCULATE_MULTIPLE_ROOM_PRICES_REQUEST' });
  try {
    const { data } = await api.post('/rooms/pricing/calculate-multiple', priceData);
    dispatch({ 
      type: 'CALCULATE_MULTIPLE_ROOM_PRICES_SUCCESS', 
      payload: data.data
    });
    return { 
      success: true, 
      data: data.data,
      message: data.message 
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al calcular precios de habitaciones';
    dispatch({ type: 'CALCULATE_MULTIPLE_ROOM_PRICES_FAILURE', payload: errorMessage });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// ⭐ ACTION MEJORADA PARA ESTADO DE PREPARACIÓN

// Obtener estado de preparación de una habitación
export const getRoomPreparationStatus = (roomNumber) => async (dispatch) => {
  dispatch({ type: 'GET_ROOM_PREPARATION_STATUS_REQUEST' });
  try {
    const { data } = await api.get(`/rooms/reports/preparation-status/${roomNumber}`);
    dispatch({ 
      type: 'GET_ROOM_PREPARATION_STATUS_SUCCESS', 
      payload: {
        roomNumber,
        status: data.data
      }
    });
    return { success: true, data: data.data };
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al obtener estado de preparación';
    dispatch({ type: 'GET_ROOM_PREPARATION_STATUS_FAILURE', payload: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// ⭐ ACTIONS AUXILIARES PARA MANEJO DE PRECIOS

// Limpiar cálculos de precios
export const clearPriceCalculations = () => (dispatch) => {
  dispatch({ type: 'CLEAR_PRICE_CALCULATIONS' });
};

// Guardar precio calculado temporalmente (para el proceso de reserva)
export const saveTempPriceCalculation = (calculation) => (dispatch) => {
  dispatch({ 
    type: 'SAVE_TEMP_PRICE_CALCULATION', 
    payload: calculation 
  });
};

// Obtener precio guardado
export const getTempPriceCalculation = () => (dispatch, getState) => {
  const { room } = getState();
  return room.tempPriceCalculation || null;
};

// ⭐ ACTION COMPUESTA PARA COTIZACIÓN COMPLETA

// Cotizar habitación con toda la información necesaria
export const getFullRoomQuote = (quoteData) => async (dispatch) => {
  dispatch({ type: 'GET_FULL_ROOM_QUOTE_REQUEST' });
  
  try {
    const { roomNumber, guestCount, checkIn, checkOut, promoCode } = quoteData;
    
    // 1. Obtener información de la habitación
    const roomResult = await dispatch(getRoomById(roomNumber));
    if (roomResult && roomResult.error) {
      throw new Error(roomResult.message);
    }
    
    // 2. Calcular el precio
    const priceResult = await dispatch(calculateRoomPrice({
      roomNumber,
      guestCount,
      checkIn,
      checkOut,
      promoCode
    }));
    
    if (!priceResult.success) {
      throw new Error(priceResult.error);
    }
    
    // 3. Combinar información
    const fullQuote = {
      room: roomResult?.data || null,
      pricing: priceResult.data,
      quoteParams: { guestCount, checkIn, checkOut, promoCode }
    };
    
    dispatch({ 
      type: 'GET_FULL_ROOM_QUOTE_SUCCESS', 
      payload: fullQuote 
    });
    
    return { 
      success: true, 
      data: fullQuote 
    };
    
  } catch (error) {
    const errorMessage = error.message || 'Error al obtener cotización completa';
    dispatch({ 
      type: 'GET_FULL_ROOM_QUOTE_FAILURE', 
      payload: errorMessage 
    });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// ⭐ ACTIONS PARA VALIDACIÓN DE DISPONIBILIDAD CON PRECIOS

// Verificar disponibilidad y calcular precios en una sola llamada
export const checkAvailabilityWithPricing = (searchData) => async (dispatch) => {
  dispatch({ type: 'CHECK_AVAILABILITY_WITH_PRICING_REQUEST' });
  
  try {
    const { checkIn, checkOut, guestCount, roomNumbers = [] } = searchData;
    
    // 1. Verificar disponibilidad general
    const dates = `${checkIn},${checkOut}`;
    const availabilityResult = await dispatch(checkAvailability(dates));
    
    // 2. Si hay habitaciones específicas, calcular precios
    let pricingResults = null;
    if (roomNumbers.length > 0) {
      const pricingResult = await dispatch(calculateMultipleRoomPrices({
        roomNumbers,
        guestCount,
        checkIn,
        checkOut
      }));
      
      if (pricingResult.success) {
        pricingResults = pricingResult.data;
      }
    }
    
    const combinedResult = {
      availability: availabilityResult,
      pricing: pricingResults,
      searchParams: { checkIn, checkOut, guestCount }
    };
    
    dispatch({ 
      type: 'CHECK_AVAILABILITY_WITH_PRICING_SUCCESS', 
      payload: combinedResult 
    });
    
    return { 
      success: true, 
      data: combinedResult 
    };
    
  } catch (error) {
    const errorMessage = error.message || 'Error al verificar disponibilidad con precios';
    dispatch({ 
      type: 'CHECK_AVAILABILITY_WITH_PRICING_FAILURE', 
      payload: errorMessage 
    });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// ⭐ ACTIONS PARA MANEJO DE PROMOCIONES

// Validar código promocional
export const validatePromoCode = (promoCode, roomNumber) => async (dispatch) => {
  dispatch({ type: 'VALIDATE_PROMO_CODE_REQUEST' });
  
  try {
    // Obtener información de la habitación para verificar si tiene promoción
    const roomResult = await dispatch(getRoomById(roomNumber));
    
    if (roomResult && !roomResult.error) {
      const room = roomResult.data || roomResult;
      
      // Lógica de validación de código promocional
      let isValid = false;
      let discount = 0;
      let message = '';
      
      if (room.isPromo && room.promotionPrice) {
        // Aquí puedes agregar lógica más compleja para validar códigos
        const validCodes = ['SUMMER2024', 'WINTER2024', 'PROMO10', 'DESCUENTO20'];
        
        if (validCodes.includes(promoCode.toUpperCase())) {
          isValid = true;
          const originalPrice = room.priceDouble || room.price || 0;
          discount = ((originalPrice - room.promotionPrice) / originalPrice) * 100;
          message = `Código válido. Descuento del ${discount.toFixed(0)}%`;
        } else {
          message = 'Código promocional no válido';
        }
      } else {
        message = 'Esta habitación no tiene promociones activas';
      }
      
      const validationResult = {
        isValid,
        discount,
        message,
        promoCode,
        roomNumber
      };
      
      dispatch({ 
        type: 'VALIDATE_PROMO_CODE_SUCCESS', 
        payload: validationResult 
      });
      
      return { 
        success: true, 
        data: validationResult 
      };
    } else {
      throw new Error('No se pudo verificar la habitación');
    }
    
  } catch (error) {
    const errorMessage = error.message || 'Error al validar código promocional';
    dispatch({ 
      type: 'VALIDATE_PROMO_CODE_FAILURE', 
      payload: errorMessage 
    });
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};