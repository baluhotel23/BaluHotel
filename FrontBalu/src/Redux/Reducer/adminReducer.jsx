const initialState = {
    users: [], // Lista de usuarios
    currentUser: null, // Usuario actual seleccionado
    usersStats: null, // Estadísticas de usuarios
    searchResults: [], // Resultados de búsqueda
    loading: false, // Estado de carga
    error: null, // Mensaje de error
};

const adminReducer = (state = initialState, action) => {
    switch (action.type) {
        // ⭐ REQUEST CASES (LOADING)
        case 'GET_ALL_USERS_REQUEST':
        case 'CREATE_STAFF_USER_REQUEST':
        case 'UPDATE_USER_REQUEST':
        case 'DEACTIVATE_USER_REQUEST':
        case 'GET_USER_BY_ID_REQUEST':
        case 'SEARCH_USERS_REQUEST':
        case 'REACTIVATE_USER_REQUEST':
        case 'GET_USERS_STATS_REQUEST':
        case 'BULK_UPDATE_USERS_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };

        // ⭐ GET ALL USERS SUCCESS
        case 'GET_ALL_USERS_SUCCESS':
            return {
                ...state,
                loading: false,
                users: action.payload,
                error: null,
            };

        // ⭐ CREATE STAFF USER SUCCESS
        case 'CREATE_STAFF_USER_SUCCESS':
            return {
                ...state,
                loading: false,
                users: [...state.users, action.payload],
                error: null,
            };

        // ⭐ UPDATE USER SUCCESS
        case 'UPDATE_USER_SUCCESS':
        case 'REACTIVATE_USER_SUCCESS':
            return {
                ...state,
                loading: false,
                users: state.users.map(user => 
                    user.id === action.payload.id ? action.payload : user
                ),
                currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser,
                error: null,
            };

        // ⭐ DEACTIVATE USER SUCCESS
        case 'DEACTIVATE_USER_SUCCESS':
            return {
                ...state,
                loading: false,
                users: state.users.map(user => 
                    user.id === action.payload ? { ...user, isActive: false } : user
                ),
                error: null,
            };

        // ⭐ GET USER BY ID SUCCESS
        case 'GET_USER_BY_ID_SUCCESS':
            return {
                ...state,
                loading: false,
                currentUser: action.payload,
                error: null,
            };

        // ⭐ SEARCH USERS SUCCESS
        case 'SEARCH_USERS_SUCCESS':
            return {
                ...state,
                loading: false,
                searchResults: action.payload,
                error: null,
            };

        // ⭐ GET USERS STATS SUCCESS
        case 'GET_USERS_STATS_SUCCESS':
            return {
                ...state,
                loading: false,
                usersStats: action.payload,
                error: null,
            };

        // ⭐ BULK UPDATE USERS SUCCESS
        case 'BULK_UPDATE_USERS_SUCCESS':
            return {
                ...state,
                loading: false,
                // Actualizar usuarios afectados en la lista
                users: state.users.map(user => {
                    const updatedUser = action.payload.users?.find(u => u.id === user.id);
                    return updatedUser || user;
                }),
                error: null,
            };

        // ⭐ FAILURE CASES
        case 'GET_ALL_USERS_FAILURE':
        case 'CREATE_STAFF_USER_FAILURE':
        case 'UPDATE_USER_FAILURE':
        case 'DEACTIVATE_USER_FAILURE':
        case 'GET_USER_BY_ID_FAILURE':
        case 'SEARCH_USERS_FAILURE':
        case 'REACTIVATE_USER_FAILURE':
        case 'GET_USERS_STATS_FAILURE':
        case 'BULK_UPDATE_USERS_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };

        // ⭐ CLEAR ADMIN STATE
        case 'CLEAR_ADMIN_STATE':
            return {
                ...initialState,
            };

        // ⭐ CLEAR CURRENT USER
        case 'CLEAR_CURRENT_USER':
            return {
                ...state,
                currentUser: null,
                error: null,
            };

        // ⭐ CLEAR SEARCH RESULTS
        case 'CLEAR_SEARCH_RESULTS':
            return {
                ...state,
                searchResults: [],
                error: null,
            };

        default:
            return state;
    }
};

export default adminReducer;