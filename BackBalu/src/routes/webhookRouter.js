const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook");

// ⭐ RUTA SIMPLIFICADA - EL CONTROLADOR MANEJA TODA LA LÓGICA
// Wompi enviará eventos POST a esta ruta: /api/webhooks/wompi
router.post('/wompi', express.json(), webhookController);

// ⭐ RUTA ALTERNATIVA POR SI WOMPI USA /events
router.post('/events', express.json(), webhookController);

module.exports = router;