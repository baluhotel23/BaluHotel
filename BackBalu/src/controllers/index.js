
const { catchedAsync } = require("../utils");
const {login, register} = require("./User/authController");
const { forgotPassword } = require("./nodemailerController/forgotPassword.js");
const { resetPassword } = require("./nodemailerController/resetPassword.js");
const { sendEmail } = require("./nodemailerController/index.js");
const checkPermissions = require("../middleware/checkPermissions");

module.exports = {
  //createProduct: catchedAsync(require("./Products/createProduct")),
 login: catchedAsync(login),
 register: catchedAsync(register),
 forgotPassword: catchedAsync(forgotPassword),
  resetPassword: catchedAsync(resetPassword),
  sendEmail: catchedAsync(sendEmail),
  checkPermissions: catchedAsync(checkPermissions),
 

};