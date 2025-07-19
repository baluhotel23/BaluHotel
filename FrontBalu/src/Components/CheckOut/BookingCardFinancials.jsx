import React, { useState } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import { formatCurrency, formatDate } from '../../utils/checkOutUtils';

const BookingCardFinancials = ({ booking, showDetailed = false, onEditPayment, onAddPayment }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Obtener resumen financiero completo
  const financials = getRealPaymentSummary(booking);

  if (!booking) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">No hay información financiera disponible</p>
      </div>
    );
  }

  // Componente para mostrar línea de desglose
  const BreakdownLine = ({ label, amount, isSubtotal = false, isTotal = false, color = "gray" }) => {
    const colorClasses = {
      gray: "text-gray-700",
      green: "text-green-600",
      red: "text-red-600",
      blue: "text-blue-600",
      purple: "text-purple-600"
    };

    return (
      <div className={`flex justify-between items-center py-1 ${isTotal ? 'border-t pt-2 font-bold' : ''} ${isSubtotal ? 'font-medium' : ''}`}>
        <span className={colorClasses[color]}>{label}</span>
        <span className={`${colorClasses[color]} ${isTotal || isSubtotal ? 'font-bold' : ''}`}>
          {typeof amount === 'number' ? formatCurrency(amount) : amount}
        </span>
      </div>
    );
  };

  // Componente para mostrar barra de progreso de pago
  const PaymentProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${
          financials.isFullyPaid 
            ? 'bg-green-500' 
            : financials.paymentPercentage > 50 
              ? 'bg-blue-500' 
              : 'bg-yellow-500'
        }`}
        style={{ width: `${financials.paymentPercentage}%` }}
      ></div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumen financiero principal */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            💰 Resumen Financiero
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showBreakdown ? '👁️ Ocultar detalles' : '🔍 Ver detalles'}
            </button>
            {onAddPayment && !financials.isFullyPaid && (
              <button
                onClick={() => onAddPayment(booking)}
                className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
              >
                💳 Agregar pago
              </button>
            )}
          </div>
        </div>

        {/* Barra de progreso de pago */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progreso de pago</span>
            <span className="font-medium">{financials.paymentPercentage}%</span>
          </div>
          <PaymentProgressBar />
        </div>

        {/* Totales principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(financials.totalFinal)}
            </div>
            <div className="text-sm text-gray-600">Total Final</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className={`text-2xl font-bold ${financials.isFullyPaid ? 'text-green-600' : 'text-blue-600'}`}>
              {formatCurrency(financials.totalPagado)}
            </div>
            <div className="text-sm text-gray-600">Total Pagado</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className={`text-2xl font-bold ${financials.totalPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(financials.totalPendiente)}
            </div>
            <div className="text-sm text-gray-600">
              {financials.totalPendiente > 0 ? 'Pendiente' : 'Saldado ✅'}
            </div>
          </div>
        </div>

        {/* Estado de pago */}
        <div className="mt-3 text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            financials.isFullyPaid 
              ? 'bg-green-100 text-green-800' 
              : financials.paymentPercentage === 0
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {financials.isFullyPaid 
              ? '✅ Pagado Completo' 
              : financials.paymentPercentage === 0
                ? '❌ Sin Pagos'
                : `⏳ Pago Parcial (${financials.paymentPercentage}%)`
            }
          </span>
        </div>
      </div>

      {/* Desglose detallado */}
      {showBreakdown && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            📊 Desglose Detallado
          </h5>
          
          <div className="space-y-2">
            {/* Costo base */}
            <BreakdownLine 
              label={`💎 Habitación (${financials.breakdown.habitacion?.nights || 0} noches)`}
              amount={financials.totalOriginal}
              color="blue"
            />

            {/* Consumos extras */}
            {financials.hasExtras && (
              <>
                <BreakdownLine 
                  label="🍽️ Consumos Extras"
                  amount={financials.totalExtras}
                  color="purple"
                />
                {showDetailed && financials.breakdown.extras?.map((extra, index) => (
                  <div key={index} className="ml-4 text-sm">
                    <BreakdownLine 
                      label={`  • ${extra.description}`}
                      amount={extra.amount}
                      color="purple"
                    />
                  </div>
                ))}
              </>
            )}

            {/* Descuentos */}
            {financials.hasDiscounts && (
              <>
                <BreakdownLine 
                  label="💸 Descuentos Aplicados"
                  amount={-financials.totalDescuentos}
                  color="green"
                />
                {showDetailed && financials.breakdown.descuentos?.map((discount, index) => (
                  <div key={index} className="ml-4 text-sm">
                    <BreakdownLine 
                      label={`  • ${discount.description}`}
                      amount={-discount.amount}
                      color="green"
                    />
                  </div>
                ))}
              </>
            )}

            {/* Impuestos */}
            {financials.totalImpuestos > 0 && (
              <BreakdownLine 
                label="🏛️ Impuestos"
                amount={financials.totalImpuestos}
                color="gray"
              />
            )}

            {/* Subtotal */}
            <BreakdownLine 
              label="Subtotal"
              amount={financials.totalFinal}
              isSubtotal={true}
              color="gray"
            />

            {/* Pagos realizados */}
            <BreakdownLine 
              label="💳 Total Pagado"
              amount={-financials.totalPagado}
              color="green"
            />

            {/* Total final */}
            <BreakdownLine 
              label="SALDO PENDIENTE"
              amount={financials.totalPendiente}
              isTotal={true}
              color={financials.totalPendiente > 0 ? "red" : "green"}
            />
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      {financials.hasPayments && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-medium text-gray-800 flex items-center gap-2">
              💳 Historial de Pagos
            </h5>
            <button
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showPaymentHistory ? 'Ocultar' : 'Mostrar'} ({financials.breakdown.pagos?.length || 0})
            </button>
          </div>

          {showPaymentHistory && (
            <div className="space-y-2">
              {financials.breakdown.pagos?.map((payment, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      <span className="text-sm text-gray-600">
                        • {payment.description}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status === 'completed' ? 'Completado' : payment.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(payment.date, { includeTime: true })}
                      {payment.reference && ` • Ref: ${payment.reference}`}
                    </div>
                  </div>
                  {onEditPayment && (
                    <button
                      onClick={() => onEditPayment(booking, payment)}
                      className="text-blue-600 hover:text-blue-800 text-sm ml-2"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consumos extras detallados */}
      {financials.hasExtras && showDetailed && (
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <h5 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
            🍽️ Detalle de Consumos Extras
          </h5>
          <div className="space-y-2">
            {financials.breakdown.extras?.map((extra, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{extra.description}</div>
                  <div className="text-sm text-gray-600">
                    {extra.date && formatDate(extra.date)} • 
                    <span className="ml-1 capitalize">{extra.category}</span>
                  </div>
                </div>
                <div className="font-bold text-purple-700">
                  {formatCurrency(extra.amount)}
                </div>
              </div>
            ))}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-purple-800">
                <span>Total Consumos Extras:</span>
                <span>{formatCurrency(financials.totalExtras)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas financieras */}
      <div className="space-y-2">
        {/* Alerta de pagos pendientes */}
        {financials.totalPendiente > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">⚠️</span>
              <div className="flex-1">
                <div className="font-medium text-yellow-800">
                  Pago Pendiente: {formatCurrency(financials.totalPendiente)}
                </div>
                <div className="text-sm text-yellow-700">
                  Se requiere completar el pago antes del check-out
                </div>
              </div>
              {onAddPayment && (
                <button
                  onClick={() => onAddPayment(booking)}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                >
                  Pagar Ahora
                </button>
              )}
            </div>
          </div>
        )}

        {/* Alerta de sobrepago */}
        {financials.totalPagado > financials.totalFinal && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div className="flex-1">
                <div className="font-medium text-blue-800">
                  Sobrepago: {formatCurrency(financials.totalPagado - financials.totalFinal)}
                </div>
                <div className="text-sm text-blue-700">
                  El cliente ha pagado más del total requerido
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmación de pago completo */}
        {financials.isFullyPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <div className="flex-1">
                <div className="font-medium text-green-800">
                  Pago Completado
                </div>
                <div className="text-sm text-green-700">
                  La reserva está completamente pagada y lista para check-out
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Variante compacta para mostrar solo lo esencial
export const BookingCardFinancialsCompact = ({ booking }) => {
  const financials = getRealPaymentSummary(booking);

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="font-medium">Total: </span>
          <span className="text-gray-800">{formatCurrency(financials.totalFinal)}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">Pagado: </span>
          <span className={financials.isFullyPaid ? 'text-green-600' : 'text-blue-600'}>
            {formatCurrency(financials.totalPagado)} ({financials.paymentPercentage}%)
          </span>
        </div>
        {financials.totalPendiente > 0 && (
          <div className="text-sm">
            <span className="font-medium">Pendiente: </span>
            <span className="text-red-600">{formatCurrency(financials.totalPendiente)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCardFinancials;