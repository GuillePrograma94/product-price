-- Script SQL para crear las tablas necesarias para la aplicación móvil
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si las tablas básicas existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'productos') THEN
        RAISE EXCEPTION 'Tabla productos no existe. Ejecuta primero setup_supabase.sql del proyecto principal.';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'codigos_secundarios') THEN
        RAISE EXCEPTION 'Tabla codigos_secundarios no existe. Ejecuta primero setup_supabase.sql del proyecto principal.';
    END IF;
END $$;

-- Tabla para listas temporales (nueva funcionalidad móvil)
CREATE TABLE IF NOT EXISTS listas_temporales (
    id SERIAL PRIMARY KEY,
    codigo_acceso CHAR(6) UNIQUE NOT NULL,
    nombre_lista TEXT NOT NULL,
    usuario_movil TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'descargada', 'expirada')),
    descargas_count INTEGER DEFAULT 0
);

-- Tabla para productos de las listas temporales
CREATE TABLE IF NOT EXISTS productos_lista_temporal (
    id SERIAL PRIMARY KEY,
    lista_id INTEGER REFERENCES listas_temporales(id) ON DELETE CASCADE,
    codigo_producto TEXT NOT NULL,
    cantidad INTEGER DEFAULT 1,
    notas TEXT,
    fecha_agregado TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_listas_codigo ON listas_temporales(codigo_acceso);
CREATE INDEX IF NOT EXISTS idx_listas_estado ON listas_temporales(estado);
CREATE INDEX IF NOT EXISTS idx_listas_expiracion ON listas_temporales(fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_productos_lista ON productos_lista_temporal(lista_id);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos_lista_temporal(codigo_producto);

-- Comentarios para documentación
COMMENT ON TABLE listas_temporales IS 'Listas temporales creadas desde la aplicación móvil';
COMMENT ON TABLE productos_lista_temporal IS 'Productos incluidos en las listas temporales';

COMMENT ON COLUMN listas_temporales.codigo_acceso IS 'Código de 6 dígitos para acceder desde PC';
COMMENT ON COLUMN listas_temporales.estado IS 'Estado de la lista: activa, descargada, expirada';
COMMENT ON COLUMN listas_temporales.fecha_expiracion IS 'Fecha y hora de expiración de la lista';
COMMENT ON COLUMN productos_lista_temporal.codigo_producto IS 'Código del producto (referencia a tabla productos)';

-- Función para limpiar listas expiradas automáticamente
CREATE OR REPLACE FUNCTION limpiar_listas_expiradas()
RETURNS INTEGER AS $$
DECLARE
    listas_limpiadas INTEGER;
BEGIN
    -- Marcar como expiradas las listas que han superado su fecha de expiración
    UPDATE listas_temporales 
    SET estado = 'expirada'
    WHERE estado = 'activa' 
    AND fecha_expiracion < NOW();
    
    GET DIAGNOSTICS listas_limpiadas = ROW_COUNT;
    
    -- Opcional: Eliminar listas expiradas después de 7 días
    -- DELETE FROM listas_temporales 
    -- WHERE estado = 'expirada' 
    -- AND fecha_expiracion < NOW() - INTERVAL '7 days';
    
    RETURN listas_limpiadas;
END;
$$ LANGUAGE plpgsql;

-- Crear evento programado para limpiar listas expiradas (opcional)
-- Nota: Esto requiere la extensión pg_cron en Supabase Pro
-- SELECT cron.schedule('limpiar-listas-expiradas', '0 * * * *', 'SELECT limpiar_listas_expiradas();');

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE 'Verificando tablas creadas...';
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listas_temporales') THEN
        RAISE NOTICE '✓ Tabla listas_temporales creada correctamente';
    ELSE
        RAISE EXCEPTION '✗ Error: Tabla listas_temporales no se creó';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'productos_lista_temporal') THEN
        RAISE NOTICE '✓ Tabla productos_lista_temporal creada correctamente';
    ELSE
        RAISE EXCEPTION '✗ Error: Tabla productos_lista_temporal no se creó';
    END IF;
    
    RAISE NOTICE '✅ Configuración de tablas móviles completada exitosamente';
END $$;
