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

const rootReducer = combineReducers({
  auth: authReducer,
  password: passwordReducer,
  room: roomReducer, 
  service: serviceReducer,
  report: reportReducer,
  booking: bookingReducer,
  inventory: inventoryReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(toastMiddleware),
});

export default store;