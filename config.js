/**
 * Configuración de la aplicación móvil
 * Obtiene las credenciales desde el servidor (variables de entorno)
 */

// Las credenciales de Supabase se cargarán dinámicamente desde el servidor
let SUPABASE_CONFIG = {
    url: '',
    anonKey: ''
};

// Configuración de la aplicación
const APP_CONFIG = {
    // Nombre de la aplicación
    name: 'Labels Productos - Móvil',
    
    // Versión de la aplicación
    version: '1.0.0',
    
    // Configuración de sincronización
    sync: {
        // Intervalo de sincronización automática en minutos
        autoSyncInterval: 240, // 4 horas
        
        // Tamaño de lote para descargas
        batchSize: 1000,
        
        // Timeout para operaciones de red en milisegundos
        networkTimeout: 30000, // 30 segundos
        
        // Reintentos automáticos
        maxRetries: 3
    },
    
    // Configuración de búsqueda
    search: {
        // Mínimo de caracteres para búsqueda
        minSearchLength: 2,
        
        // Máximo de resultados por búsqueda
        maxResults: 50,
        
        // Delay para búsqueda en tiempo real (ms)
        debounceDelay: 300
    },
    
    // Configuración de listas temporales
    temporaryLists: {
        // Tiempo de expiración en horas
        expirationHours: 24,
        
        // Máximo de productos por lista
        maxProductsPerList: 100,
        
        // Longitud del código de acceso
        codeLength: 6
    },
    
    // Configuración de UI
    ui: {
        // Duración de notificaciones toast en ms
        toastDuration: 3000,
        
        // Animaciones habilitadas
        animationsEnabled: true,
        
        // Tema por defecto
        defaultTheme: 'light'
    },
    
    // Configuración de almacenamiento local
    storage: {
        // Nombre de la base de datos IndexedDB
        dbName: 'LabelsProductosDB',
        
        // Versión de la base de datos
        dbVersion: 1,
        
        // Tiempo de caché en milisegundos
        cacheTimeout: 86400000 // 24 horas
    }
};

// Configuración de desarrollo/producción
const ENV_CONFIG = {
    // Modo de desarrollo
    development: {
        debug: true,
        logLevel: 'debug',
        mockData: false
    },
    
    // Modo de producción
    production: {
        debug: false,
        logLevel: 'error',
        mockData: false
    }
};

// Detectar entorno actual
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('192.168.');

const currentEnv = isDevelopment ? 'development' : 'production';

/**
 * Carga la configuración de Supabase desde el servidor
 */
async function loadSupabaseConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            SUPABASE_CONFIG.url = config.SUPABASE_URL;
            SUPABASE_CONFIG.anonKey = config.SUPABASE_ANON_KEY;
            
            console.log('✅ Configuración de Supabase cargada desde servidor:', {
                url: config.SUPABASE_URL ? 'Configurada ✅' : 'Faltante ❌',
                key: config.SUPABASE_ANON_KEY ? 'Configurada ✅' : 'Faltante ❌'
            });
            return true;
        } else {
            throw new Error('No se pudo obtener configuración del servidor');
        }
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        return false;
    }
}

// Exportar configuración
window.CONFIG = {
    SUPABASE: SUPABASE_CONFIG,
    APP: APP_CONFIG,
    ENV: ENV_CONFIG[currentEnv],
    IS_DEVELOPMENT: isDevelopment,
    loadSupabaseConfig: loadSupabaseConfig
};

// Logging condicional
if (window.CONFIG.ENV.debug) {
    console.log('🔧 Configuración base cargada:', window.CONFIG);
}
