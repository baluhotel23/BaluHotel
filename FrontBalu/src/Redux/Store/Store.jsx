import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from '../Reducer/authReducer';
import passwordReducer from '../Reducer/passwordReducer';
import roomReducer from '../Reducer/roomReducer'; 
import toastMiddleware from '../../utils/toastMiddleware';  
import serviceReducer from '../Reducer/serviceReducer';
import reportReducer from '../Reducer/reportReducer';
import bookingReducer from '../Reducer/bookingReducer';
import inventoryReducer from '../Reducer/inventoryReducer';
import paymentReducer from '../Reducer/paymentReducer';
import hotelReducer from '../Reducer/hotelReducer';
import taxxaReducer from '../Reducer/taxxaReducer';
import registrationPassReducer from '../Reducer/registrationPassReducer'; // ⭐ Nombre corregido
import purchaseReducer from '../Reducer/purchaseReducer';
import financialReducer from '../Reducer/financialReducer';
import laundryReducer from '../Reducer/laundryReducer'; // ⭐ NUEVO

const rootReducer = combineReducers({
  auth: authReducer,
  password: passwordReducer,
  room: roomReducer, 
  service: serviceReducer,
  report: reportReducer,
  booking: bookingReducer,
  inventory: inventoryReducer,
  laundry: laundryReducer, // ⭐ NUEVO - Agregado el reducer de lavandería
  payment: paymentReducer,
  hotel: hotelReducer,
  taxxa: taxxaReducer,
  registrationPass: registrationPassReducer, // ⭐ Nombre de variable corregido
  purchase: purchaseReducer,
  financial: financialReducer
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(toastMiddleware),
});

export default store;