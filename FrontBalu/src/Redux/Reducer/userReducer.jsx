const initialState = {
  users: [],
  loading: false,
  error: null,
  selectedUser: null
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'GET_ALL_USERS_REQUEST':
    case 'CREATE_STAFF_USER_REQUEST':
    case 'UPDATE_USER_REQUEST':
    case 'DEACTIVATE_USER_REQUEST':
    case 'REACTIVATE_USER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };

    case 'GET_ALL_USERS_SUCCESS':
      return {
        ...state,
        loading: false,
        users: action.payload,
        error: null
      };

    case 'CREATE_STAFF_USER_SUCCESS':
      return {
        ...state,
        loading: false,
        users: [action.payload, ...state.users],
        error: null
      };

    case 'UPDATE_USER_SUCCESS':
      return {
        ...state,
        loading: false,
        users: state.users.map(user => 
          user.id === action.payload.id ? action.payload : user
        ),
        error: null
      };

    case 'DEACTIVATE_USER_SUCCESS':
      return {
        ...state,
        loading: false,
        users: state.users.map(user => 
          user.id === action.payload ? { ...user, isActive: false } : user
        ),
        error: null
      };

    case 'REACTIVATE_USER_SUCCESS':
      return {
        ...state,
        loading: false,
        users: state.users.map(user => 
          user.id === action.payload ? { ...user, isActive: true } : user
        ),
        error: null
      };

    case 'GET_ALL_USERS_FAILURE':
    case 'CREATE_STAFF_USER_FAILURE':
    case 'UPDATE_USER_FAILURE':
    case 'DEACTIVATE_USER_FAILURE':
    case 'REACTIVATE_USER_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case 'SET_SELECTED_USER':
      return {
        ...state,
        selectedUser: action.payload
      };

    case 'CLEAR_USER_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

export default userReducer;