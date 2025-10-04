/**
 * Aplicación principal Labels Reader
 * Aplicación de consulta de precios - Solo búsqueda por código
 */

class MobileApp {
    constructor() {
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.config = null;
        
        // Estado de la aplicación
        this.state = {
            productsLoaded: false,
            lastSync: null,
            totalProducts: 0
        };
    }

    /**
     * Inicializa la aplicación
     */
    async initialize() {
        try {
            console.log('🚀 Iniciando Labels Reader...');
            
            // Mostrar pantalla de carga
            window.ui.showLoading('Iniciando aplicación...');
            window.ui.updateSyncStatus('connecting', 'Iniciando...');
            
            // Inicializar módulos base
            await this.initializeModules();
            
            // Cargar configuración
            await this.loadConfiguration();
            
            // Sincronizar datos
            await this.performInitialSync();
            
            // Inicializar UI
            this.initializeUI();
            
            // Configurar eventos de conectividad
            this.setupConnectivityHandlers();
            
            // Marcar como inicializada
            this.isInitialized = true;
            
            // Ocultar pantalla de carga
            window.ui.hideLoading();
            window.ui.updateSyncStatus('connected', 'Listo');
            
            console.log('✅ Labels Reader inicializado correctamente');
            window.ui.showToast('Aplicación lista para consultar precios', 'success');

        } catch (error) {
            console.error('❌ Error al inicializar aplicación:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Inicializa los módulos base
     */
    async initializeModules() {
        window.ui.updateProgress(0.1, 'Inicializando almacenamiento...');
        
        // Inicializar almacenamiento local
        await window.storageManager.initialize();
        
        window.ui.updateProgress(0.2, 'Inicializando interfaz...');
        
        // Inicializar UI
        window.ui.initialize();
        
        console.log('✅ Módulos base inicializados');
    }

    /**
     * Carga la configuración de la aplicación
     */
    async loadConfiguration() {
        window.ui.updateProgress(0.3, 'Cargando configuración...');
        
        try {
            // Cargar configuración de Supabase desde el servidor
            const configLoaded = await window.CONFIG.loadSupabaseConfig();
            
            if (!configLoaded) {
                throw new Error('No se pudo cargar la configuración de Supabase desde el servidor');
            }
            
            // Cargar configuración local guardada
            const localConfig = await window.storageManager.getAllConfig();
            
            // Combinar configuraciones
            this.config = {
                ...localConfig,
                supabase: window.CONFIG.supabase
            };
            
            console.log('✅ Configuración cargada');
            
        } catch (error) {
            console.error('❌ Error al cargar configuración:', error);
            throw error;
        }
    }

    /**
     * Realiza la sincronización inicial
     */
    async performInitialSync() {
        window.ui.updateProgress(0.4, 'Sincronizando productos...');
        
        try {
            // Verificar si hay datos locales
            const stats = window.storageManager.getStats();
            
            if (stats.totalProducts === 0) {
                // No hay datos locales, sincronizar desde Supabase
                await this.syncProductsFromSupabase();
            } else {
                // Hay datos locales, verificar si necesitan actualización
                const needsUpdate = await this.checkIfUpdateNeeded();
                if (needsUpdate) {
                    await this.syncProductsFromSupabase();
                } else {
                    console.log('✅ Datos locales actualizados');
                }
            }
            
            // Actualizar estado
            this.state.productsLoaded = true;
            this.state.lastSync = new Date().toISOString();
            
            // Actualizar estadísticas
            const finalStats = window.storageManager.getStats();
            this.state.totalProducts = finalStats.totalProducts;
            
            window.ui.updateProgress(1.0, 'Sincronización completada');
            
            console.log(`✅ Sincronización completada: ${finalStats.totalProducts} productos`);
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            
            // Intentar usar datos locales si están disponibles
            const stats = window.storageManager.getStats();
            if (stats.totalProducts > 0) {
                console.log('⚠️ Usando datos locales debido a error de sincronización');
                this.state.productsLoaded = true;
                this.state.totalProducts = stats.totalProducts;
            } else {
                throw error;
            }
        }
    }

    /**
     * Sincroniza productos desde Supabase
     */
    async syncProductsFromSupabase() {
        window.ui.updateProgress(0.5, 'Descargando productos...');
        
        try {
            // Obtener productos desde Supabase
            const products = await window.supabaseClient.getAllProducts();
            
            if (!products || products.length === 0) {
                throw new Error('No se encontraron productos en la base de datos');
            }
            
            window.ui.updateProgress(0.7, 'Guardando productos...');
            
            // Guardar productos en almacenamiento local
            await window.storageManager.saveProducts(products);
            
            window.ui.updateProgress(0.9, 'Finalizando...');
            
            console.log(`✅ ${products.length} productos sincronizados`);
            
        } catch (error) {
            console.error('❌ Error al sincronizar productos:', error);
            throw error;
        }
    }

    /**
     * Verifica si necesita actualización
     */
    async checkIfUpdateNeeded() {
        try {
            // Verificar última actualización en Supabase
            const lastUpdate = await window.supabaseClient.getLastUpdateTime();
            const localLastSync = await window.storageManager.getLastSyncTime();
            
            if (!localLastSync || new Date(lastUpdate) > new Date(localLastSync)) {
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.warn('⚠️ No se pudo verificar actualizaciones:', error);
            return false; // En caso de error, no forzar actualización
        }
    }

    /**
     * Inicializa la interfaz de usuario
     */
    initializeUI() {
        window.ui.updateProgress(0.8, 'Configurando interfaz...');
        
        // La UI ya fue inicializada en initializeModules
        // Aquí se pueden hacer configuraciones adicionales
        
        console.log('✅ Interfaz inicializada');
    }

    /**
     * Configura los manejadores de conectividad
     */
    setupConnectivityHandlers() {
        // Manejador de cambio de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            window.ui.updateSyncStatus('connected', 'Conectado');
            console.log('🌐 Conexión restaurada');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            window.ui.updateSyncStatus('error', 'Sin conexión');
            console.log('🌐 Conexión perdida');
        });
        
        console.log('✅ Manejadores de conectividad configurados');
    }

    /**
     * Maneja errores de inicialización
     */
    handleInitializationError(error) {
        window.ui.hideLoading();
        window.ui.updateSyncStatus('error', 'Error de inicialización');
        
        let errorMessage = 'Error al inicializar la aplicación';
        
        if (error.message.includes('configuración')) {
            errorMessage = 'Error de configuración. Verifica la conexión.';
        } else if (error.message.includes('sincronización')) {
            errorMessage = 'Error de sincronización. Verifica la conexión.';
        }
        
        window.ui.showToast(errorMessage, 'error', 5000);
        
        console.error('❌ Error de inicialización:', error);
    }

    /**
     * Obtiene estadísticas de la aplicación
     */
    getAppStats() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            state: this.state,
            config: this.config ? 'Cargada' : 'No cargada'
        };
    }

    /**
     * Fuerza una nueva sincronización
     */
    async forceSync() {
        if (!this.isOnline) {
            window.ui.showToast('Sin conexión a internet', 'error');
            return false;
        }
        
        try {
            window.ui.showToast('Sincronizando...', 'info');
            await this.syncProductsFromSupabase();
            
            // Actualizar estado
            this.state.lastSync = new Date().toISOString();
            const stats = window.storageManager.getStats();
            this.state.totalProducts = stats.totalProducts;
            
            window.ui.updateSearchStats();
            window.ui.showToast('Sincronización completada', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error en sincronización forzada:', error);
            window.ui.showToast('Error en sincronización', 'error');
            return false;
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.mobileApp = new MobileApp();
        await window.mobileApp.initialize();
        console.log('🎯 Labels Reader iniciado correctamente');
    } catch (error) {
        console.error('❌ Error crítico al iniciar Labels Reader:', error);
    }
});