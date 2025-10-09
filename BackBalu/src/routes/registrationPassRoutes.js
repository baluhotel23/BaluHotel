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
router.post("/", allowRoles(['owner', 'admin', 'receptionist']), createRegistrationPass); // Crear un nuevo registro - ⭐ Recepcionista puede crear
router.get("/", allowRoles(['owner', 'admin', 'receptionist']), getAllRegistrationPasses); // Obtener todos los registros - ⭐ Recepcionista puede ver
router.get("/:bookingId", allowRoles(['owner', 'admin', 'receptionist']), getRegistrationPassesByBooking); // Obtener registros por bookingId - ⭐ Recepcionista puede ver
router.put("/:registrationNumber", allowRoles(['owner', 'admin', 'receptionist']), updateRegistrationPass); // Actualizar un registro - ⭐ Recepcionista puede actualizar
router.delete("/:registrationNumber", allowRoles(['owner', 'admin']), deleteRegistrationPass); // Eliminar un registro - Solo admin/owner



module.exports = router;