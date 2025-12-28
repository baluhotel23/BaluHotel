-- Script SQL para agregar las columnas necesarias a la tabla Expenses
-- Ejecutar solo si las columnas no existen

-- Agregar columna receiptUrl si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Expenses' AND column_name = 'receiptUrl'
  ) THEN
    ALTER TABLE "Expenses" ADD COLUMN "receiptUrl" VARCHAR(500);
    COMMENT ON COLUMN "Expenses"."receiptUrl" IS 'URL del comprobante del gasto en Cloudinary';
    RAISE NOTICE '✅ Columna receiptUrl agregada';
  ELSE
    RAISE NOTICE '⚠️ Columna receiptUrl ya existe';
  END IF;
END $$;

-- Agregar columna notes si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Expenses' AND column_name = 'notes'
  ) THEN
    ALTER TABLE "Expenses" ADD COLUMN "notes" TEXT;
    COMMENT ON COLUMN "Expenses"."notes" IS 'Notas adicionales sobre el gasto';
    RAISE NOTICE '✅ Columna notes agregada';
  ELSE
    RAISE NOTICE '⚠️ Columna notes ya existe';
  END IF;
END $$;

-- Agregar columna createdBy si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Expenses' AND column_name = 'createdBy'
  ) THEN
    ALTER TABLE "Expenses" ADD COLUMN "createdBy" VARCHAR(255);
    COMMENT ON COLUMN "Expenses"."createdBy" IS 'Documento del usuario que creó el gasto';
    RAISE NOTICE '✅ Columna createdBy agregada';
  ELSE
    RAISE NOTICE '⚠️ Columna createdBy ya existe';
  END IF;
END $$;

-- Verificar las columnas agregadas
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'Expenses' 
  AND column_name IN ('receiptUrl', 'notes', 'createdBy')
ORDER BY ordinal_position;
