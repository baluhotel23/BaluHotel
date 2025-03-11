const initialState = { loading: false, data: null, error: null };

const passwordReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FORGOT_PASSWORD_REQUEST":
    case "RESET_PASSWORD_REQUEST":
    case "CHANGE_PASSWORD_REQUEST":
      return { 
        ...state, 
        loading: true, 
        error: null };
    case "FORGOT_PASSWORD_SUCCESS":
    case "RESET_PASSWORD_SUCCESS":
    case "CHANGE_PASSWORD_SUCCESS":
      return { 
        ...state, 
        loading: false,
         data: action.payload, 
         error: null };
    case "FORGOT_PASSWORD_FAILURE":
    case "RESET_PASSWORD_FAILURE":
    case "CHANGE_PASSWORD_FAILURE":
      return { ...state, 
        loading: false, 
        error: action.payload };
    default:
      return state;
  }
};

export default passwordReducer;
