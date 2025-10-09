import {
  OPEN_SHIFT_REQUEST,
  OPEN_SHIFT_SUCCESS,
  OPEN_SHIFT_FAILURE,
  GET_CURRENT_SHIFT_REQUEST,
  GET_CURRENT_SHIFT_SUCCESS,
  GET_CURRENT_SHIFT_FAILURE,
  CLOSE_SHIFT_REQUEST,
  CLOSE_SHIFT_SUCCESS,
  CLOSE_SHIFT_FAILURE,
  GET_SHIFT_HISTORY_REQUEST,
  GET_SHIFT_HISTORY_SUCCESS,
  GET_SHIFT_HISTORY_FAILURE,
  GET_SHIFT_REPORT_REQUEST,
  GET_SHIFT_REPORT_SUCCESS,
  GET_SHIFT_REPORT_FAILURE,
  CLEAR_SHIFT_ERROR,
} from '../Actions/shiftActions';

const initialState = {
  currentShift: null,
  summary: null, // ⭐ NUEVO: Almacenar summary separado
  shiftHistory: {
    shifts: [],
    pagination: {
      page: 1,
      limit: 10,
      totalShifts: 0,
      totalPages: 0,
    },
  },
  shiftReport: null,
  loading: false,
  error: null,
};

const shiftReducer = (state = initialState, action) => {
  switch (action.type) {
    // ⭐ ABRIR TURNO
    case OPEN_SHIFT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case OPEN_SHIFT_SUCCESS:
      return {
        ...state,
        loading: false,
        currentShift: action.payload,
        error: null,
      };
    case OPEN_SHIFT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ⭐ OBTENER TURNO ACTUAL
    case GET_CURRENT_SHIFT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case GET_CURRENT_SHIFT_SUCCESS:
      return {
        ...state,
        loading: false,
        currentShift: action.payload?.shift || action.payload,
        summary: action.payload?.summary || null, // ⭐ NUEVO
        error: null,
      };
    case GET_CURRENT_SHIFT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ⭐ CERRAR TURNO
    case CLOSE_SHIFT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case CLOSE_SHIFT_SUCCESS:
      return {
        ...state,
        loading: false,
        currentShift: null, // Limpiar turno actual después de cerrar
        error: null,
      };
    case CLOSE_SHIFT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ⭐ HISTORIAL DE TURNOS
    case GET_SHIFT_HISTORY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case GET_SHIFT_HISTORY_SUCCESS:
      return {
        ...state,
        loading: false,
        shiftHistory: action.payload,
        error: null,
      };
    case GET_SHIFT_HISTORY_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ⭐ REPORTE DETALLADO
    case GET_SHIFT_REPORT_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case GET_SHIFT_REPORT_SUCCESS:
      return {
        ...state,
        loading: false,
        shiftReport: action.payload,
        error: null,
      };
    case GET_SHIFT_REPORT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // ⭐ LIMPIAR ERRORES
    case CLEAR_SHIFT_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

export default shiftReducer;
