const { catchedAsync } = require("../utils/catchedAsync");

// Auth controllers
const { login, register, logout, changePassword } = require("./User/authController");

// Email controllers
const { 
    forgotPassword, 
    resetPassword, 
    sendEmail 
} = require("./nodemailerController");

// Inventory controllers
const {
    getInventory,
    createPurchase,
    updateInventory,
    getLowStockItems
} = require("./inventoryController");

// Admin controllers
const {
    getAllUsers,
    createStaffUser,
    updateUser,
    deactivateUser
} = require("./User/adminController");

const {
  checkAvailability,
  getRoomTypes,
  createBooking,
  getUserBookings,
  getBookingById,
  getAllBookings,
  checkIn,
  checkOut,
  addExtraCharges,
  generateBill,
  updateBookingStatus,
  cancelBooking,
  getOccupancyReport,
  getRevenueReport
} = require("./bookingController");

module.exports = {
    // Auth endpoints
    login,
    register,
    logout,
    changePassword,

    // Email endpoints
    forgotPassword,
    resetPassword,
    sendEmail,

    // Inventory endpoints
    getInventory,
    createPurchase,
    updateInventory,
    getLowStockItems,

    // Admin endpoints
    getAllUsers,
    createStaffUser,
    updateUser,
    deactivateUser,


    // Booking endpoints
    checkAvailability,
    getRoomTypes,
    createBooking,
    getUserBookings,
    getBookingById,
    getAllBookings,
    checkIn,
    checkOut,
    addExtraCharges,
    generateBill,
    updateBookingStatus,
    cancelBooking,
    getOccupancyReport,
    getRevenueReport
};