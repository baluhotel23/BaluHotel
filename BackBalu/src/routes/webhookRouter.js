const express = require("express");
const crypto = require("crypto");
const router = express.Router();
// Asegúrate de que el controlador webhook se use si es necesario para procesar el evento después de la verificación.
// const webhookController = require("../controller/webhook");

// Middleware para parsear JSON y capturar el rawBody para la verificación de la firma
router.post('/eventos', express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString(); // Guardar el cuerpo crudo como string
    }
}), (req, res) => {
    const wompiSignature = req.headers['x-wompi-signature']; // Wompi suele usar 'x-wompi-signature' para el hash de eventos
    const timestamp = req.headers['x-wompi-timestamp']; // Timestamp enviado por Wompi

    if (!wompiSignature || !timestamp) {
        console.error('Faltan cabeceras de Wompi para la verificación.');
        return res.status(400).send('Faltan cabeceras de Wompi.');
    }

    // El secreto de integridad debe estar en las variables de entorno de tu backend
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!integritySecret) {
        console.error('El secreto de integridad de Wompi no está configurado en el backend.');
        return res.status(500).send('Error de configuración del servidor.');
    }

    // Construir el string para el hash según la documentación de Wompi (concatenación de evento + timestamp + secreto)
    // O el método que Wompi especifique para el "events signature" que es diferente al "integrity signature" de transacciones.
    // Para la firma de eventos de Wompi, la estructura suele ser: `idDelEvento.timestamp.secretoDeEventos`
    // Revisa la documentación de Wompi para la firma de eventos específicamente.
    // El ejemplo de 'x-integrity-token' que di antes es para la firma de *transacciones* en el redirect.
    // Para webhooks de *eventos*, Wompi usa un 'events secret' y una cabecera como 'X-Wompi-Signature'.

    // Ejemplo de cómo Wompi podría generar la firma de eventos (VERIFICAR DOCUMENTACIÓN DE WOMPI):
    // Supongamos que el cuerpo del request (req.rawBody) es el JSON del evento.
    // Y Wompi firma: `JSON.stringify(req.body.data) + req.body.timestamp + eventsSecret`
    // O más comúnmente para eventos: `req.body.id + req.body.timestamp + process.env.WOMPI_EVENTS_KEY`

    // **Importante**: La verificación de la firma para *eventos* de webhook de Wompi
    // es diferente a la firma de *integridad de transacción*.
    // Wompi proporciona un "Secreto de eventos" en su dashboard.
    // La cadena a firmar suele ser: `id_del_evento + timestamp_del_evento + secreto_de_eventos`
    // Y la cabecera es `X-Wompi-Signature` que contiene `t=timestamp,v1=hash`

    const signatureHeader = req.headers['x-wompi-signature']; // Ejemplo: "t=1678886400,v1=abcdef12345..."
    if (!signatureHeader) {
        return res.status(400).send('Falta la cabecera de firma de Wompi.');
    }

    const parts = signatureHeader.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
    }, {});

    const eventTimestamp = parts.t;
    const receivedHash = parts.v1;

    if (!eventTimestamp || !receivedHash) {
        return res.status(400).send('Formato de firma de Wompi inválido.');
    }

    // El "Events Secret" lo obtienes del dashboard de Wompi
    const eventsSecret = process.env.WOMPI_EVENTS_KEY; // Debes agregar esta variable a tu .env del backend

    if (!eventsSecret) {
        console.error('El WOMPI_EVENTS_KEY no está configurado.');
        return res.status(500).send('Error de configuración del servidor.');
    }

    const stringToSign = `${req.rawBody}${eventTimestamp}${eventsSecret}`;

    const calculatedHash = crypto
        .createHmac('sha256', eventsSecret) // No, esto no es así para la firma de eventos.
                                            // Wompi firma el cuerpo del evento + timestamp + secreto de eventos.
                                            // La cadena a firmar es `cuerpoDelEventoConcatenadoConTimestamp + secretoDeEventos`
                                            // O como lo especifique Wompi.
                                            // Para la firma de eventos v2 de Wompi:
                                            // stringToSign = req.rawBody + "." + eventTimestamp + "." + eventsSecret;
                                            // Y el hash es SHA256 de eso.

    // **CORRECCIÓN SEGÚN LA DOCUMENTACIÓN MÁS COMÚN DE WOMPI PARA FIRMA DE EVENTOS V2**
    // La cadena a firmar es: `cuerpo_del_request_como_string.timestamp_de_la_cabecera.secreto_de_eventos`
    const stringToSignForEventsV2 = `${req.rawBody}.${eventTimestamp}.${eventsSecret}`;
    const calculatedSignatureForEventsV2 = crypto
        .createHmac('sha256', eventsSecret) // El secreto de eventos se usa como clave HMAC
        .update(stringToSignForEventsV2)
        .digest('hex');

    if (calculatedSignatureForEventsV2 !== receivedHash) {
        console.error('Firma digital de evento Wompi inválida.');
        console.log('Recibido:', receivedHash);
        console.log('Calculado:', calculatedSignatureForEventsV2);
        console.log('String Firmado:', stringToSignForEventsV2);
        console.log('Raw Body:', req.rawBody);
        console.log('Timestamp Cabecera:', eventTimestamp);
        return res.status(401).send('Firma digital de evento Wompi inválida.');
    }

    // Si la firma es válida, procesa el evento
    console.log('Firma de evento Wompi verificada correctamente.');
    const event = req.body.event; // ej: "transaction.updated"
    const transaction = req.body.data.transaction; // Datos de la transacción

    console.log(`Evento: ${event}`);
    console.log(`ID de Transacción: ${transaction.id}`);
    console.log(`Referencia: ${transaction.reference}`);
    console.log(`Estado: ${transaction.status}`);
    console.log(`Monto en centavos: ${transaction.amount_in_cents}`);
    console.log(`Método de pago: ${transaction.payment_method_type}`);

    // Aquí llamarías a tu controlador para actualizar el estado del pago en tu DB, etc.
    // Ejemplo: webhookController.handleWompiEvent(event, transaction);

    res.status(200).send('Webhook de evento Wompi recibido y verificado.');
});

module.exports = router;