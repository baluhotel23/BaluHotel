-- ============================================================================
-- SCRIPT: Forzar check-out de reservas 92, 93 y 94
-- FECHA: 2025-11-21
-- DESCRIPCIÓN: Cambiar estado a checked-out y liberar habitaciones
-- ============================================================================

-- ⭐ VERIFICAR ESTADO ACTUAL DE LAS RESERVAS
SELECT 
  b."bookingId",
  b."roomNumber",
  b.status as booking_status,
  b."checkIn",
  b."checkOut",
  b."actualCheckIn",
  b."actualCheckOut",
  r.status as room_status
FROM "Bookings" b
LEFT JOIN "Rooms" r ON r."roomNumber" = b."roomNumber"
WHERE b."bookingId" IN (92, 93, 94)
ORDER BY b."bookingId";

-- ============================================================================
-- ⚠️ EJECUTAR SOLO SI LAS RESERVAS EXISTEN Y NECESITAN SER CERRADAS
-- ============================================================================

-- ⭐ FORZAR CHECK-OUT DE LAS RESERVAS
UPDATE "Bookings"
SET 
  status = 'checked-out',
  "actualCheckOut" = NOW(),
  "updatedAt" = NOW()
WHERE "bookingId" IN (92, 93, 94)
AND status != 'checked-out'; -- Solo actualizar si no están ya cerradas

-- ⭐ VERIFICAR CUÁNTAS RESERVAS FUERON ACTUALIZADAS
-- (Debería mostrar el número de filas afectadas)

-- ⭐ LIBERAR LAS HABITACIONES (cambiar a NULL = Disponible)
UPDATE "Rooms"
SET 
  status = NULL,
  "updatedAt" = NOW()
WHERE "roomNumber" IN (
  SELECT "roomNumber" 
  FROM "Bookings" 
  WHERE "bookingId" IN (92, 93, 94)
  AND "roomNumber" IS NOT NULL
);

-- ============================================================================
-- ⭐ VERIFICAR RESULTADOS FINALES
-- ============================================================================

SELECT 
  b."bookingId",
  b."roomNumber",
  b.status as booking_status,
  b."actualCheckOut",
  r.status as room_status,
  CASE 
    WHEN r.status IS NULL THEN 'Disponible'
    ELSE r.status
  END as room_status_description
FROM "Bookings" b
LEFT JOIN "Rooms" r ON r."roomNumber" = b."roomNumber"
WHERE b."bookingId" IN (92, 93, 94)
ORDER BY b."bookingId";

-- ============================================================================
-- RESULTADO ESPERADO:
-- - booking_status = 'checked-out'
-- - actualCheckOut = fecha/hora actual
-- - room_status = NULL (que significa Disponible)
-- ============================================================================
