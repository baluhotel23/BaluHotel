const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');

const {
    createRegistrationPass,
    getAllRegistrationPasses,
    updateRegistrationPass,
    deleteRegistrationPass,
    getRegistrationPassesByBooking
  } = require("../controllers/registrationPassController");
  


// Middleware de autenticación para todas las rutas siguientes


router.use(verifyToken);

// Middleware de staff para todas las rutas siguientes
router.use(isStaff);

// Rutas para RegistrationPass
router.post("/", allowRoles(['owner', 'admin']), createRegistrationPass); // Crear un nuevo registro
router.get("/", allowRoles(['owner', 'admin']), getAllRegistrationPasses); // Obtener todos los registros
router.get("/:bookingId", allowRoles(['owner', 'admin']), getRegistrationPassesByBooking); // Obtener registros por bookingId
router.put("/:registrationNumber",allowRoles(['owner', 'admin']), updateRegistrationPass); // Actualizar un registro
router.delete("/:registrationNumber",allowRoles(['owner', 'admin']), deleteRegistrationPass); // Eliminar un registro



module.exports = router;