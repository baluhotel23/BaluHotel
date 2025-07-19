import React from "react";
import { useCheckOutLogic } from "../../hooks/useCheckOutLogic";
import CheckOutHeader from "./CheckOutHeader";
import CheckOutFilters from "./CheckOutFilters";
import BookingCard from "./BookingCard";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import ExtraCharges from "./ExtraCharge";
import BillModal from "../Taxxa/BillModal";
import EarlyCheckOutModal from "./EarlyCheckOutModal";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { getCheckOutBadge } from "../../utils/checkOutUtils";

const CheckOut = () => {
  const {
    // Estados
    selectedBooking,
    setSelectedBooking,
    showExtraCharges,
    setShowExtraCharges,
    selectedBookingForExtras,
    setSelectedBookingForExtras,
    showEarlyCheckOutModal,
    setShowEarlyCheckOutModal,
    earlyCheckOutDate,
    setEarlyCheckOutDate,
    bookingForEarlyCheckOut,
    setBookingForEarlyCheckOut,
    isLoading,
    showBillModal,
    setShowBillModal,
    generatedBill,
    setGeneratedBill,
    filters,
    sortBy,
    setSortBy,
    
    // Datos
    bookings,
    statistics,
    loading,
    taxxaStatus,
    
    // Funciones
    getDaysUntilCheckOut,
    handleCheckOut,
    handleEarlyCheckOutWithDiscount,
    handleGenerateBill,
    handlePaymentSuccess,
    handleFilterChange,
    applyFilters,
    clearFilters,
    handleOpenExtraCharges,
    handleExtraChargeSuccess,
  } = useCheckOutLogic();

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckOutHeader statistics={statistics} />
      
      <CheckOutFilters
        filters={filters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        handleFilterChange={handleFilterChange}
        applyFilters={applyFilters}
        clearFilters={clearFilters}
        isLoading={isLoading}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading && !loading.bills ? (
          <LoadingSpinner />
        ) : bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                getDaysUntilCheckOut={getDaysUntilCheckOut}
                getCheckOutBadge={getCheckOutBadge}
                onPaymentClick={setSelectedBooking}
                onExtraChargesClick={handleOpenExtraCharges}
                onGenerateBill={handleGenerateBill}
                onCheckOut={handleCheckOut}
                onEarlyCheckOut={(booking) => {
                  setBookingForEarlyCheckOut(booking);
                  setEarlyCheckOutDate(new Date().toISOString().slice(0, 16));
                  setShowEarlyCheckOutModal(true);
                }}
                isLoading={isLoading}
                loadingBills={loading.bills}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {selectedBooking && (
        <PaymentAndReceipt
          bookingData={selectedBooking}
          amountToPay={getRealPaymentSummary(selectedBooking).totalPendiente}
          currentBuyerData={selectedBooking.guest}
          selectedRoom={selectedBooking.room}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {showExtraCharges && selectedBookingForExtras && (
        <ExtraCharges
          bookingId={selectedBookingForExtras.bookingId}
          isLoading={isLoading}
          onSuccess={handleExtraChargeSuccess}
          onClose={() => {
            setShowExtraCharges(false);
            setSelectedBookingForExtras(null);
          }}
        />
      )}

      {showBillModal && generatedBill && (
        <BillModal
          bill={generatedBill}
          taxxaStatus={taxxaStatus}
          onClose={() => {
            setShowBillModal(false);
            setGeneratedBill(null);
          }}
        />
      )}

      {showEarlyCheckOutModal && bookingForEarlyCheckOut && (
        <EarlyCheckOutModal
          booking={bookingForEarlyCheckOut}
          earlyCheckOutDate={earlyCheckOutDate}
          setEarlyCheckOutDate={setEarlyCheckOutDate}
          onConfirm={handleEarlyCheckOutWithDiscount}
          onClose={() => {
            setShowEarlyCheckOutModal(false);
            setBookingForEarlyCheckOut(null);
            setEarlyCheckOutDate("");
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default CheckOut;