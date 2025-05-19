const initialState = {
  // Estado para gastos
  expenses: [],
  expenseDetail: null,
  expenseCategories: [],
  
  // Estados para reportes
  dashboard: null,
  summary: null,
  revenueByPeriod: null,
  profitLossReport: null,
  
  // Estados de UI
  loading: false,
  error: null
};

export const financialReducer = (state = initialState, action) => {
  switch (action.type) {
    // ===== GASTOS =====
    // Crear gasto
    case 'CREATE_EXPENSE_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'CREATE_EXPENSE_SUCCESS':
      return {
        ...state,
        expenses: [action.payload, ...state.expenses],
        loading: false
      };
    case 'CREATE_EXPENSE_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Obtener todos los gastos
    case 'FETCH_EXPENSES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_EXPENSES_SUCCESS':
      return {
        ...state,
        expenses: action.payload,
        loading: false
      };
    case 'FETCH_EXPENSES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Obtener detalle de un gasto
    case 'FETCH_EXPENSE_DETAIL_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_EXPENSE_DETAIL_SUCCESS':
      return {
        ...state,
        expenseDetail: action.payload,
        loading: false
      };
    case 'FETCH_EXPENSE_DETAIL_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Actualizar gasto
    case 'UPDATE_EXPENSE_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'UPDATE_EXPENSE_SUCCESS':
      return {
        ...state,
        expenses: state.expenses.map(expense => 
          expense.id === action.payload.id ? action.payload : expense
        ),
        expenseDetail: action.payload,
        loading: false
      };
    case 'UPDATE_EXPENSE_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Eliminar gasto
    case 'DELETE_EXPENSE_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'DELETE_EXPENSE_SUCCESS':
      return {
        ...state,
        expenses: state.expenses.filter(expense => expense.id !== action.payload),
        loading: false
      };
    case 'DELETE_EXPENSE_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Obtener categorías de gastos
    case 'FETCH_EXPENSE_CATEGORIES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_EXPENSE_CATEGORIES_SUCCESS':
      return {
        ...state,
        expenseCategories: action.payload,
        loading: false
      };
    case 'FETCH_EXPENSE_CATEGORIES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // ===== REPORTES FINANCIEROS =====
    // Dashboard financiero
    case 'FETCH_FINANCIAL_DASHBOARD_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_FINANCIAL_DASHBOARD_SUCCESS':
      return {
        ...state,
        dashboard: action.payload,
        loading: false
      };
    case 'FETCH_FINANCIAL_DASHBOARD_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Resumen financiero
    case 'FETCH_FINANCIAL_SUMMARY_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_FINANCIAL_SUMMARY_SUCCESS':
      return {
        ...state,
        summary: action.payload,
        loading: false
      };
    case 'FETCH_FINANCIAL_SUMMARY_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Ingresos por período
    case 'FETCH_REVENUE_BY_PERIOD_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_REVENUE_BY_PERIOD_SUCCESS':
      return {
        ...state,
        revenueByPeriod: action.payload,
        loading: false
      };
    case 'FETCH_REVENUE_BY_PERIOD_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    // Reporte de ganancias y pérdidas
    case 'FETCH_PROFIT_LOSS_REPORT_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_PROFIT_LOSS_REPORT_SUCCESS':
      return {
        ...state,
        profitLossReport: action.payload,
        loading: false
      };
    case 'FETCH_PROFIT_LOSS_REPORT_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    default:
      return state;
  }
};

export default financialReducer;