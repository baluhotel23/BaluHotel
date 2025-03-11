import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from '../Reducer/authReducer';
import passwordReducer from './Reducer/passwordReducer';

const rootReducer = combineReducers({
  auth: authReducer,
 passwordReducer: passwordReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
