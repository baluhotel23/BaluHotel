const initialState = {
    rooms: [],
    roomTypes: [],
    selectedRoom: null,
    searchedRoom: null,
    amenities: [],
    services: [],
    occupancyReport: null,
    revenueReport: null,
    loading: false,
    error: null,
  };
  
  const roomReducer = (state = initialState, action) => {
    switch (action.type) {
      // Ejemplo para GET_ROOMS
      case 'GET_ROOMS_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_ROOMS_SUCCESS':
        return { ...state, loading: false, rooms: action.payload };
      case 'GET_ROOMS_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_ROOM_TYPES
      case 'GET_ROOM_TYPES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_ROOM_TYPES_SUCCESS':
        return { ...state, loading: false, roomTypes: action.payload };
      case 'GET_ROOM_TYPES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_ROOM
      case 'GET_ROOM_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_ROOM_SUCCESS':
        return { ...state, loading: false, selectedRoom: action.payload };
      case 'GET_ROOM_FAILURE':
        return { ...state, loading: false, error: action.payload };
       
       
        case "SEARCH_ROOM_REQUEST":
          return { ...state, loading: true, error: null };
        case "SEARCH_ROOM_SUCCESS":
          return { ...state, loading: false, searchedRoom: action.payload };
        case "SEARCH_ROOM_FAILURE":
          return { ...state, loading: false, error: action.payload };
          
      // CHECK_AVAILABILITY
      case 'CHECK_AVAILABILITY_REQUEST':
        return { ...state, loading: true, error: null };
      case 'CHECK_AVAILABILITY_SUCCESS':
        return { ...state, loading: false, rooms: action.payload };
      case 'CHECK_AVAILABILITY_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // CREATE_ROOM
      case 'CREATE_ROOM_REQUEST':
        return { ...state, loading: true, error: null };
      case 'CREATE_ROOM_SUCCESS':
        return { ...state, loading: false, rooms: [...state.rooms, action.payload] };
      case 'CREATE_ROOM_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // UPDATE_ROOM
      case 'UPDATE_ROOM_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_ROOM_SUCCESS':
        return {
          ...state,
          loading: false,
          rooms: state.rooms.map((room) =>
            room.roomNumber === action.payload.roomNumber ? action.payload : room
          ),
        };
      case 'UPDATE_ROOM_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // DELETE_ROOM
      case 'DELETE_ROOM_REQUEST':
        return { ...state, loading: true, error: null };
      case 'DELETE_ROOM_SUCCESS':
        return {
          ...state,
          loading: false,
          rooms: state.rooms.filter((room) => room.roomNumber !== action.payload.roomNumber),
        };
      case 'DELETE_ROOM_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // UPDATE_ROOM_STATUS
      case 'UPDATE_ROOM_STATUS_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_ROOM_STATUS_SUCCESS':
        return {
          ...state,
          loading: false,
          rooms: state.rooms.map((room) =>
            room.roomNumber === action.payload.roomNumber ? action.payload : room
          ),
        };
      case 'UPDATE_ROOM_STATUS_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_ROOM_AMENITIES
      case 'GET_ROOM_AMENITIES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_ROOM_AMENITIES_SUCCESS':
        return { ...state, loading: false, amenities: action.payload };
      case 'GET_ROOM_AMENITIES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // UPDATE_ROOM_AMENITIES
      case 'UPDATE_ROOM_AMENITIES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_ROOM_AMENITIES_SUCCESS':
        return { ...state, loading: false, amenities: action.payload };
      case 'UPDATE_ROOM_AMENITIES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_ROOM_SERVICES
      case 'GET_ROOM_SERVICES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_ROOM_SERVICES_SUCCESS':
        return { ...state, loading: false, services: action.payload };
      case 'GET_ROOM_SERVICES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // UPDATE_ROOM_SERVICES
      case 'UPDATE_ROOM_SERVICES_REQUEST':
        return { ...state, loading: true, error: null };
      case 'UPDATE_ROOM_SERVICES_SUCCESS':
        return { ...state, loading: false, services: action.payload };
      case 'UPDATE_ROOM_SERVICES_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_OCCUPANCY_REPORT
      case 'GET_OCCUPANCY_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_OCCUPANCY_REPORT_SUCCESS':
        return { ...state, loading: false, occupancyReport: action.payload };
      case 'GET_OCCUPANCY_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      // GET_REVENUE_REPORT
      case 'GET_REVENUE_REPORT_REQUEST':
        return { ...state, loading: true, error: null };
      case 'GET_REVENUE_REPORT_SUCCESS':
        return { ...state, loading: false, revenueReport: action.payload };
      case 'GET_REVENUE_REPORT_FAILURE':
        return { ...state, loading: false, error: action.payload };
  
      default:
        return state;
    }
  };
  
  export default roomReducer;