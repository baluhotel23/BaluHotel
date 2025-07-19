import React, { useMemo } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import BookingCardHeader from './BookingCardHeader';
import BookingCardFinancials from './BookingCardFinancials';
import BookingCardActions from './BookingCardActions';
import BookingCardPassengers from './BookingCardPassengers';
import BookingCardPayments from './BookingCardPayments';

const BookingCard = ({
  booking,
  getDaysUntilCheckOut,
  getCheckOutBadge,
  onPaymentClick,
  onExtraChargesClick,
  onGenerateBill,
  onCheckOut,
  onEarlyCheckOut,
  isLoading,
  loadingBills
}) => {
  // Memoizar cálculos pesados
  const financials = useMemo(() => getRealPaymentSummary(booking), [booking]);
  const daysUntilCheckOut = useMemo(() => getDaysUntilCheckOut(booking.checkOut), [booking.checkOut, getDaysUntilCheckOut]);
  const payments = useMemo(() => booking.payments || [], [booking.payments]);
  const passengers = useMemo(() => booking.registrationPasses || [], [booking.registrationPasses]);

  // Determinar estilo del borde
  const borderStyle = useMemo(() => {
    if (daysUntilCheckOut < 0) return "border-l-red-500";
    if (daysUntilCheckOut === 0) return "border-l-orange-500";
    if (daysUntilCheckOut === 1) return "border-l-yellow-500";
    return "border-l-blue-500";
  }, [daysUntilCheckOut]);

  return (
    <div className={`bg-white rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-shadow duration-300 ${borderStyle}`}>
      <BookingCardHeader 
        booking={booking}
        daysUntilCheckOut={daysUntilCheckOut}
        getCheckOutBadge={getCheckOutBadge}
      />

      {passengers.length > 0 && (
        <BookingCardPassengers passengers={passengers} />
      )}

      {payments.length > 0 && (
        <BookingCardPayments payments={payments} />
      )}

      <BookingCardFinancials 
        financials={financials}
        daysUntilCheckOut={daysUntilCheckOut}
        booking={booking}
      />

      <BookingCardActions
        booking={booking}
        financials={financials}
        daysUntilCheckOut={daysUntilCheckOut}
        onPaymentClick={onPaymentClick}
        onExtraChargesClick={onExtraChargesClick}
        onGenerateBill={onGenerateBill}
        onCheckOut={onCheckOut}
        onEarlyCheckOut={onEarlyCheckOut}
        isLoading={isLoading}
        loadingBills={loadingBills}
      />
    </div>
  );
};

export default React.memo(BookingCard);