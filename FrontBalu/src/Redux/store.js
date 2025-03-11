import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Reducer/authReducer';
// ...existing code...

const store = configureStore({
  reducer: {
    auth: authReducer,
    // ...existing reducers...
  },
  // ...existing code...
});

export default store;