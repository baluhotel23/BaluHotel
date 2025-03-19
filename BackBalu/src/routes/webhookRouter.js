const express = require("express");
const router = express.Router();
const webhook = require("../controller/webhook");

router.post('/eventos', (req, res) => {
    const event = req.body.event;
    const transaction = req.body.data.transaction;
  
    // Aquí puedes hacer algo con los datos recibidos
    console.log(`Evento: ${event}`);
    console.log(`ID de Transacción: ${transaction.id}`);
    console.log(`Referencia: ${transaction.reference}`);
    console.log(`Estado: ${transaction.status}`);
  
    // Responder a Wompi para confirmar que recibiste el webhook
    res.status(200).send('Webhook recibido');
  });

module.exports = router;