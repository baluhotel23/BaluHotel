import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from '../Reducer/authReducer';
import passwordReducer from '../Reducer/passwordReducer';
import roomReducer from '../Reducer/roomReducer'; // nueva importación
import toastMiddleware from '../../utils/toastMiddleware';  
import serviceReducer from '../Reducer/serviceReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  password: passwordReducer,
  room: roomReducer, 
  service: serviceReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(toastMiddleware),
});

export default store;