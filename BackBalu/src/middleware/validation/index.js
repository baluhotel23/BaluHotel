const {  validatePasswordReset } = require('./validatePasswordReset');
const { validateBooking } = require('./validateBooking');
//const { validateUser } = require('./userValidation');
const { validateExtraCharge } = require('./validateExtraCharge');


module.exports = {
    
    validatePasswordReset,
    validateBooking,
    validateExtraCharge
    
};