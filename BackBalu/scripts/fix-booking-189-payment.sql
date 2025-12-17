-- ============================================================
-- SCRIPT PARA SIMULAR PAGO EXITOSO DE RESERVA 189
-- Fecha: 2025-12-16
-- ============================================================

-- 1. GENERAR TRACKING TOKEN PARA LA RESERVA
-- (Esto normalmente lo hace createBooking, pero esta reserva ya existe)
UPDATE "Bookings" 
SET "trackingToken" = 'simulated-token-' || "bookingId" || '-' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE "bookingId" = 189 
  AND "trackingToken" IS NULL;

-- 2. CREAR REGISTRO DE PAGO SIMULANDO WOMPI
INSERT INTO "Payments" (
    "bookingId",
    "amount",
    "paymentMethod",
    "paymentType",
    "paymentStatus",
    "paymentDate",
    "transactionId",
    "paymentReference",
    "processedBy",
    "includesExtras",
    "isReservationPayment",
    "isCheckoutPayment",
    "wompiTransactionId",
    "wompiStatus",
    "createdAt",
    "updatedAt"
) VALUES (
    189,                                    -- bookingId
    900000.00,                              -- amount (total de la reserva)
    'wompi',                                -- paymentMethod
    'online',                               -- paymentType
    'completed',                            -- paymentStatus
    NOW(),                                  -- paymentDate
    'SIMULATED-TEST-' || EXTRACT(EPOCH FROM NOW())::bigint,  -- transactionId
    'BALU-189-' || EXTRACT(EPOCH FROM NOW())::bigint,        -- paymentReference
    'manual_script',                        -- processedBy
    false,                                  -- includesExtras
    true,                                   -- isReservationPayment
    false,                                  -- isCheckoutPayment
    'SIMULATED-WOMPI-' || EXTRACT(EPOCH FROM NOW())::bigint, -- wompiTransactionId
    'APPROVED',                             -- wompiStatus
    NOW(),                                  -- createdAt
    NOW()                                   -- updatedAt
);

-- 3. ACTUALIZAR ESTADO DE LA RESERVA A 'paid'
UPDATE "Bookings" 
SET 
    "status" = 'paid',
    "paymentCompletedAt" = NOW(),
    "updatedAt" = NOW()
WHERE "bookingId" = 189;

-- 4. ACTUALIZAR HABITACIÓN 201 A 'Reservada'
UPDATE "Rooms"
SET 
    "status" = 'Reservada',
    "available" = false,
    "updatedAt" = NOW()
WHERE "roomNumber" = '201';

-- 5. VERIFICAR LOS CAMBIOS
SELECT 
    b."bookingId",
    b."status",
    b."trackingToken",
    b."paymentCompletedAt",
    b."pointOfSale",
    r."roomNumber",
    r."status" as "roomStatus",
    r."available" as "roomAvailable"
FROM "Bookings" b
LEFT JOIN "Rooms" r ON b."roomNumber" = r."roomNumber"
WHERE b."bookingId" = 189;

-- 6. VERIFICAR PAGOS
SELECT 
    "paymentId",
    "bookingId",
    "amount",
    "paymentMethod",
    "paymentStatus",
    "transactionId",
    "wompiStatus",
    "createdAt"
FROM "Payments"
WHERE "bookingId" = 189
ORDER BY "createdAt" DESC;

-- 7. VERIFICAR VOUCHER (SI EXISTE)
SELECT 
    "voucherCode",
    "bookingId",
    "isUsed",
    "validFrom",
    "validUntil",
    "createdAt"
FROM "Vouchers"
WHERE "bookingId" = 189;

-- ============================================================
-- RESULTADO ESPERADO:
-- - Booking status: 'paid'
-- - Booking trackingToken: generado
-- - Payment creado con status 'completed'
-- - Room 201 status: 'Reservada', available: false
-- - Voucher creado (si no existe, se debe crear manualmente)
-- ============================================================

-- 8. SI NO EXISTE VOUCHER, CREAR UNO:
INSERT INTO "Vouchers" (
    "voucherCode",
    "bookingId",
    "guestId",
    "validFrom",
    "validUntil",
    "isUsed",
    "createdAt",
    "updatedAt"
)
SELECT 
    'BLU' || LPAD(CAST(EXTRACT(EPOCH FROM NOW())::bigint AS TEXT), 6, '0') || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4)),
    189,
    b."guestId",
    b."checkIn",
    b."checkOut",
    false,
    NOW(),
    NOW()
FROM "Bookings" b
WHERE b."bookingId" = 189
  AND NOT EXISTS (
    SELECT 1 FROM "Vouchers" v WHERE v."bookingId" = 189
  );

-- 9. VERIFICACIÓN FINAL COMPLETA
SELECT 
    '✅ RESERVA ACTUALIZADA' as "Resultado",
    b."bookingId",
    b."status",
    b."pointOfSale",
    b."totalAmount",
    b."trackingToken" IS NOT NULL as "TieneTrackingToken",
    b."paymentCompletedAt" IS NOT NULL as "PagoCompletado",
    COUNT(p."paymentId") as "NumPagos",
    SUM(p."amount") as "TotalPagado",
    r."status" as "EstadoHabitacion",
    r."available" as "HabitacionDisponible",
    v."voucherCode"
FROM "Bookings" b
LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" AND p."paymentStatus" = 'completed'
LEFT JOIN "Rooms" r ON b."roomNumber" = r."roomNumber"
LEFT JOIN "Vouchers" v ON b."bookingId" = v."bookingId"
WHERE b."bookingId" = 189
GROUP BY 
    b."bookingId",
    b."status",
    b."pointOfSale",
    b."totalAmount",
    b."trackingToken",
    b."paymentCompletedAt",
    r."status",
    r."available",
    v."voucherCode";
