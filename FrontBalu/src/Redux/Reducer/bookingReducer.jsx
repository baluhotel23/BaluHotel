const initialState = {
    loading: false,
    availability: [],
    roomTypes: [],
    booking: null,
    bookingDetails: null,
    bookings: [],
    extraCharge: null,
    bill: null,
    occupancyReport: null,
    revenueReport: null,
    error: null,
};

const bookingReducer = (state = initialState, action) => {
    switch (action.type) {
        // CHECK AVAILABILITY
        case 'CHECK_AVAILABILITY_REQUEST':
            return { ...state, loading: true, error: null };
        case 'CHECK_AVAILABILITY_SUCCESS':
            return { ...state, loading: false, availability: action.payload };
        case 'CHECK_AVAILABILITY_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GET ROOM TYPES
        case 'GET_ROOM_TYPES_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GET_ROOM_TYPES_SUCCESS':
            return { ...state, loading: false, roomTypes: action.payload };
        case 'GET_ROOM_TYPES_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // CREATE BOOKING
        case 'CREATE_BOOKING_REQUEST':
            return { ...state, loading: true, error: null };
        case 'CREATE_BOOKING_SUCCESS':
            return { ...state, loading: false, booking: action.payload };
        case 'CREATE_BOOKING_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GET USER BOOKINGS
        case 'GET_USER_BOOKINGS_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GET_USER_BOOKINGS_SUCCESS':
            return { ...state, loading: false, bookings: action.payload };
        case 'GET_USER_BOOKINGS_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GET BOOKING DETAILS
        case 'GET_BOOKING_DETAILS_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GET_BOOKING_DETAILS_SUCCESS':
            return { ...state, loading: false, bookingDetails: action.payload };
        case 'GET_BOOKING_DETAILS_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // STAFF: GET ALL BOOKINGS
        case 'GET_ALL_BOOKINGS_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GET_ALL_BOOKINGS_SUCCESS':
            return { ...state, loading: false, bookings: action.payload };
        case 'GET_ALL_BOOKINGS_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // CHECK-IN
        case 'CHECKIN_BOOKING_REQUEST':
            return { ...state, loading: true, error: null };
        case 'CHECKIN_BOOKING_SUCCESS':
            return { ...state, loading: false, bookingDetails: action.payload };
        case 'CHECKIN_BOOKING_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // CHECK-OUT
        case 'CHECKOUT_BOOKING_REQUEST':
            return { ...state, loading: true, error: null };
        case 'CHECKOUT_BOOKING_SUCCESS':
            return { ...state, loading: false, bookingDetails: action.payload, bill: action.payload.bill };
        case 'CHECKOUT_BOOKING_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // ADD EXTRA CHARGES
        case 'ADD_EXTRA_CHARGE_REQUEST':
            return { ...state, loading: true, error: null };
        case 'ADD_EXTRA_CHARGE_SUCCESS':
            return { ...state, loading: false, extraCharge: action.payload };
        case 'ADD_EXTRA_CHARGE_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GENERATE BILL
        case 'GENERATE_BILL_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GENERATE_BILL_SUCCESS':
            return { ...state, loading: false, bill: action.payload };
        case 'GENERATE_BILL_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // UPDATE BOOKING STATUS
        case 'UPDATE_BOOKING_STATUS_REQUEST':
            return { ...state, loading: true, error: null };
        case 'UPDATE_BOOKING_STATUS_SUCCESS':
            return { ...state, loading: false, bookingDetails: action.payload };
        case 'UPDATE_BOOKING_STATUS_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // CANCEL BOOKING
        case 'CANCEL_BOOKING_REQUEST':
            return { ...state, loading: true, error: null };
        case 'CANCEL_BOOKING_SUCCESS':
            return { ...state, loading: false, bookingDetails: action.payload };
        case 'CANCEL_BOOKING_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GET OCCUPANCY REPORT
        case 'GET_OCCUPANCY_REPORT_REQUEST':
            return { ...state, loading: true, error: null };
        case 'GET_OCCUPANCY_REPORT_SUCCESS':
            return { ...state, loading: false, occupancyReport: action.payload };
        case 'GET_OCCUPANCY_REPORT_FAILURE':
            return { ...state, loading: false, error: action.payload };

        // GET REVENUE REPORT
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

export default bookingReducer;