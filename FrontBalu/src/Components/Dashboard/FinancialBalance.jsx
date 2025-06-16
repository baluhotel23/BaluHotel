import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getFinancialDashboard, 
  getFinancialSummary,
  getRevenueByPeriod,
  getProfitLossReport 
} from '../../Redux/Actions/financialActions';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { FaDownload, FaFilter, FaChartLine } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';
import { CSVLink } from 'react-csv';

const FinancialBalance = () => {
  const dispatch = useDispatch();
  const { 
    dashboard, 
    summary, 
    revenueByPeriod, 
    profitLossReport,
    loading 
  } = useSelector(state => state.financial || {});

  // Estados para filtros
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd')
  });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'revenue', 'expenses'

  useEffect(() => {
    // Cargar datos iniciales
    dispatch(getFinancialDashboard());
    dispatch(getFinancialSummary(period));
    
    const { startDate, endDate } = dateRange;
    dispatch(getRevenueByPeriod(startDate, endDate));
    dispatch(getProfitLossReport(period));
  }, [dispatch, period, dateRange]);

  // Formateo de datos para gráficos
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  };

  // Preparación de datos para gráficos de ingresos
  const prepareRevenueData = () => {
    if (!summary || !summary.revenue) return [];
    
    return [
      { name: 'Online', value: summary.revenue.online || 0 },
      { name: 'Local', value: summary.revenue.local || 0 }
    ];
  };

  // Datos para el gráfico de pagos por método
  const preparePaymentMethodData = () => {
    if (!summary || !summary.paymentMethods) return [];
    
    // Transformar el objeto a array para Recharts
    return Object.entries(summary.paymentMethods || {}).map(([method, amount]) => ({
      name: formatPaymentMethod(method),
      value: amount
    }));
  };

  // Preparación de datos para gráficos de gastos
  const prepareExpensesData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Gastos', value: summary.expenses?.total || 0 },
      { name: 'Compras', value: summary.purchases?.total || 0 }
    ];
  };

  // Datos para el gráfico de gastos por categoría
  const prepareExpensesByCategoryData = () => {
    if (!summary || !summary.expensesByCategory) return [];
    
    return Object.entries(summary.expensesByCategory || {}).map(([category, amount]) => ({
      name: formatExpenseCategory(category),
      value: amount
    }));
  };

  // Datos para la tendencia mensual
  const prepareMonthlyTrendData = () => {
  if (!revenueByPeriod || !revenueByPeriod.length) {
    console.warn('⚠️ [FINANCIAL] No hay datos de revenue por período');
    return [];
  }
  
  console.log('📊 [FINANCIAL] Procesando datos mensuales:', revenueByPeriod);
  
  return revenueByPeriod
    .map((item, index) => {
      // 🔧 VALIDAR Y LIMPIAR LA FECHA
      let validDate = null;
      
      try {
        if (!item.date) {
          console.warn(`⚠️ [FINANCIAL] Item ${index} sin fecha:`, item);
          return null;
        }
        
        // 🎯 INTENTAR DIFERENTES FORMATOS DE FECHA
        if (typeof item.date === 'string') {
          // Formato ISO: "2025-06-01"
          validDate = parseISO(item.date);
        } else if (item.date instanceof Date) {
          validDate = item.date;
        } else {
          // Intentar conversión directa
          validDate = new Date(item.date);
        }
        
        // ✅ VERIFICAR QUE LA FECHA SEA VÁLIDA
        if (!isValid(validDate)) {
          console.warn(`⚠️ [FINANCIAL] Fecha inválida en item ${index}:`, {
            originalDate: item.date,
            parsedDate: validDate,
            item
          });
          return null;
        }
        
        const formattedMonth = format(validDate, 'MMM', { locale: es });
        
        console.log(`✅ [FINANCIAL] Item ${index} procesado:`, {
          originalDate: item.date,
          validDate,
          formattedMonth,
          revenue: item.revenue,
          expenses: item.expenses
        });
        
        return {
          name: formattedMonth,
          ingresos: parseFloat(item.revenue || 0),
          gastos: parseFloat(item.expenses || 0),
          balance: parseFloat(item.revenue || 0) - parseFloat(item.expenses || 0)
        };
        
      } catch (error) {
        console.error(`❌ [FINANCIAL] Error procesando item ${index}:`, {
          error: error.message,
          item,
          originalDate: item.date
        });
        return null;
      }
    })
    .filter(item => item !== null); // 🗑️ REMOVER ITEMS INVÁLIDOS
};

  // Formateadores para nombres más amigables
  const formatPaymentMethod = (method) => {
    const methods = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta',
      'transfer': 'Transferencia',
      'credit': 'Crédito',
      'online': 'Online',
      'paypal': 'PayPal'
    };
    
    return methods[method] || method;
  };

  const formatExpenseCategory = (category) => {
    const categories = {
      'maintenance': 'Mantenimiento',
      'utilities': 'Servicios',
      'salaries': 'Salarios',
      'marketing': 'Marketing',
      'supplies': 'Insumos',
      'other': 'Otros'
    };
    
    return categories[category] || category;
  };

  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Manejo de cambios en filtros
  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Datos para exportar a CSV
  const getCSVData = () => {
    const data = [];
    
    // Añadir encabezados
    data.push(['Período', 'Ingresos Totales', 'Gastos Totales', 'Balance']);
    
    // Añadir datos de resumen
    const totalRevenue = summary?.revenue?.total || 0;
    const totalExpenses = (summary?.expenses?.total || 0) + (summary?.purchases?.total || 0);
    const balance = totalRevenue - totalExpenses;
    
    data.push([
      `${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`,
      totalRevenue,
      totalExpenses,
      balance
    ]);
    
    // Añadir datos de ingresos por tipo
    data.push(['', '', '', '']);
    data.push(['Ingresos por Tipo', 'Monto', '', '']);
    data.push(['Online', summary?.revenue?.online || 0, '', '']);
    data.push(['Local', summary?.revenue?.local || 0, '', '']);
    
    // Añadir datos de ingresos por método de pago
    data.push(['', '', '', '']);
    data.push(['Ingresos por Método de Pago', 'Monto', '', '']);
    if (summary?.paymentMethods) {
      Object.entries(summary.paymentMethods).forEach(([method, amount]) => {
        data.push([formatPaymentMethod(method), amount, '', '']);
      });
    }
    
    // Añadir datos de gastos
    data.push(['', '', '', '']);
    data.push(['Egresos por Tipo', 'Monto', '', '']);
    data.push(['Gastos', summary?.expenses?.total || 0, '', '']);
    data.push(['Compras', summary?.purchases?.total || 0, '', '']);
    
    // Añadir datos de gastos por categoría
    data.push(['', '', '', '']);
    data.push(['Gastos por Categoría', 'Monto', '', '']);
    if (summary?.expensesByCategory) {
      Object.entries(summary.expensesByCategory).forEach(([category, amount]) => {
        data.push([formatExpenseCategory(category), amount, '', '']);
      });
    }
    
    return data;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Balance Financiero</h1>
          <div className="flex space-x-2">
            <CSVLink
              data={getCSVData()}
              filename={`balance-financiero-${format(new Date(), 'yyyy-MM-dd')}.csv`}
              className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-600"
            >
              <FaDownload className="mr-2" /> Exportar
            </CSVLink>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select 
                value={period}
                onChange={handlePeriodChange}
                className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input 
                    type="date" 
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input 
                    type="date" 
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                    className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="bg-white p-10 rounded-lg shadow-md flex justify-center items-center">
            <div className="spinner"></div>
            <p className="ml-2">Cargando datos financieros...</p>
          </div>
        )}
        
        {/* Resumen */}
        {!loading && summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Ingresos Totales</h2>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.revenue?.total || 0)}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Online: {formatCurrency(summary.revenue?.online || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Local: {formatCurrency(summary.revenue?.local || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Gastos Totales</h2>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency((summary.expenses?.total || 0) + (summary.purchases?.total || 0))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Gastos: {formatCurrency(summary.expenses?.total || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Compras: {formatCurrency(summary.purchases?.total || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Balance</h2>
              <div className={`text-3xl font-bold ${(summary.revenue?.total || 0) - ((summary.expenses?.total || 0) + (summary.purchases?.total || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((summary.revenue?.total || 0) - ((summary.expenses?.total || 0) + (summary.purchases?.total || 0)))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Margen: {(((summary.revenue?.total || 0) / Math.max(1, (summary.expenses?.total || 0) + (summary.purchases?.total || 0))) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Pestañas para navegar entre secciones */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen General
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'revenue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'expenses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setActiveTab('trend')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'trend'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tendencias
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de pestañas */}
        {!loading && (
          <>
            {/* Resumen General */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareRevenueData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareRevenueData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Gastos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareExpensesData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareExpensesData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Tendencia del Período</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="gastos" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                      <Area type="monotone" dataKey="balance" stackId="2" stroke="#ffc658" fill="#ffc658" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ingresos */}
            {activeTab === 'revenue' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos: Online vs Local</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={prepareRevenueData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value" name="Monto" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos por Método de Pago</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={preparePaymentMethodData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {preparePaymentMethodData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolución de Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Gastos */}
            {activeTab === 'expenses' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Gastos vs Compras</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={prepareExpensesData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value" name="Monto" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Gastos por Categoría</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareExpensesByCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareExpensesByCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolución de Gastos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="gastos" stroke="#82ca9d" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tendencias */}
            {activeTab === 'trend' && (
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Tendencia de Ingresos vs Gastos</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="gastos" stroke="#82ca9d" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="balance" stroke="#ffc658" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Balance Mensual</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="balance" name="Balance" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinancialBalance;