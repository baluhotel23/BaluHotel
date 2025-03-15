import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from '../Reducer/authReducer';
import passwordReducer from './Reducer/passwordReducer';
import taxxaReducer from './Reducer/taxxaReducer';
import bookingReducer from './Reducer/bookingReducer';
import inventoryReducer from './Reducer/inventoryReducer';
import reportReducer from './Reducer/reportReducer';
import roomReducer from './Reducer/roomReducer';
import serviceReducer from './Reducer/serviceReducer';





const rootReducer = combineReducers({
  auth: authReducer,
 passwordReducer: passwordReducer,
 taxxa: taxxaReducer,
 booking: bookingReducer,
 service: serviceReducer,
 report: reportReducer,
 inventory: inventoryReducer,
 room: roomReducer

});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
