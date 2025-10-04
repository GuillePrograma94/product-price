/**
 * Aplicación principal móvil para Labels Productos
 * Coordina la inicialización y funcionamiento de todos los módulos
 */

class MobileApp {
    constructor() {
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.config = null;
        
        // Estado de la aplicación
        this.state = {
            productsLoaded: false,
            codesLoaded: false,
            lastSync: null,
            totalProducts: 0,
            totalCodes: 0
        };
    }

    /**
     * Inicializa la aplicación
     */
    async initialize() {
        try {
            console.log('🚀 Iniciando aplicación móvil...');
            
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
            
            console.log('✅ Aplicación inicializada correctamente');
            window.ui.showToast('Aplicación lista para usar', 'success');

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
                supabaseUrl: window.CONFIG.SUPABASE.url,
                supabaseKey: window.CONFIG.SUPABASE.anonKey
            };
            
            console.log('🔍 Configuración final:', {
                supabaseUrl: this.config.supabaseUrl ? 'Configurada ✅' : 'Faltante ❌',
                supabaseKey: this.config.supabaseKey ? 'Configurada ✅' : 'Faltante ❌'
            });
            
            // Guardar configuración actualizada localmente
            await window.storageManager.saveConfig('supabaseUrl', this.config.supabaseUrl);
            await window.storageManager.saveConfig('supabaseKey', this.config.supabaseKey);
            
            console.log('✅ Configuración cargada desde servidor y almacenada localmente');
        } catch (error) {
            console.error('❌ Error al cargar configuración:', error);
            
            // Intentar usar configuración local como fallback
            const localConfig = await window.storageManager.getAllConfig();
            if (localConfig.supabaseUrl && localConfig.supabaseKey) {
                console.log('⚠️ Usando configuración local como fallback');
                this.config = localConfig;
            } else {
                throw new Error('No hay configuración de Supabase disponible');
            }
        }
    }

    /**
     * Realiza la sincronización inicial de datos
     */
    async performInitialSync() {
        try {
            // Verificar si hay datos locales
            const stats = await window.storageManager.getStorageStats();
            
            if (stats.productos > 0 && stats.codigos_secundarios > 0) {
                // Hay datos locales, verificar si necesita actualización
                console.log(`📊 Datos locales: ${stats.productos} productos, ${stats.codigos_secundarios} códigos`);
                
                this.state.productsLoaded = true;
                this.state.codesLoaded = true;
                this.state.totalProducts = stats.productos;
                this.state.totalCodes = stats.codigos_secundarios;
                this.state.lastSync = stats.ultima_sincronizacion;
                
                window.ui.updateProductsCount(stats.productos);
                window.ui.updateProgress(0.9, 'Datos locales cargados');
                
                // Verificar si necesita actualización
                if (this.isOnline) {
                    try {
                        await window.supabaseClient.initialize(this.config);
                        const versionCheck = await window.supabaseClient.verificarActualizacionNecesaria();
                        
                        if (versionCheck.necesitaActualizacion) {
                            console.log('📊 Actualización disponible, sincronizando en segundo plano...');
                            window.ui.updateSyncStatus('syncing', 'Actualizando datos...');
                            this.performBackgroundSync();
                        } else {
                            console.log('✅ Datos actualizados');
                            window.ui.updateSyncStatus('connected', 'Actualizado');
                        }
                    } catch (error) {
                        console.log('⚠️ Error verificando versión, usando datos locales');
                        window.ui.updateSyncStatus('offline', 'Modo offline');
                    }
                } else {
                    window.ui.updateSyncStatus('offline', 'Sin conexión');
                }
            } else {
                // No hay datos locales, necesita descarga inicial
                await this.performFullSync();
            }
            
        } catch (error) {
            console.error('❌ Error en sincronización inicial:', error);
            
            // Si hay datos locales, continuar sin sincronización
            const stats = await window.storageManager.getStorageStats();
            if (stats.productos > 0) {
                console.log('⚠️ Continuando con datos locales');
                this.state.productsLoaded = true;
                this.state.totalProducts = stats.productos;
                window.ui.updateProductsCount(stats.productos);
                window.ui.updateSyncStatus('offline', 'Modo offline');
            } else {
                throw new Error('No hay datos disponibles y no se puede sincronizar');
            }
        }
    }

    /**
     * Realiza una sincronización completa
     */
    async performFullSync() {
        window.ui.updateProgress(0.4, 'Conectando con servidor...');
        
        try {
            // Inicializar cliente Supabase
            await window.supabaseClient.initialize(this.config);
            
            window.ui.updateProgress(0.5, 'Descargando productos...');
            
            // Descargar productos
            const productos = await window.supabaseClient.downloadProducts((progress) => {
                const progressValue = 0.5 + (progress.loaded / (progress.total || progress.loaded)) * 0.2;
                window.ui.updateProgress(progressValue, `Descargando productos: ${progress.loaded.toLocaleString()}`);
            });
            
            window.ui.updateProgress(0.7, 'Descargando códigos secundarios...');
            
            // Descargar códigos secundarios
            const codigos = await window.supabaseClient.downloadSecondaryCodes((progress) => {
                const progressValue = 0.7 + (progress.loaded / (progress.total || progress.loaded)) * 0.15;
                window.ui.updateProgress(progressValue, `Descargando códigos: ${progress.loaded.toLocaleString()}`);
            });
            
            window.ui.updateProgress(0.85, 'Guardando datos localmente...');
            
            // Guardar datos localmente
            await window.storageManager.saveProducts(productos);
            await window.storageManager.saveSecondaryCodes(codigos);
            
            // Actualizar estado
            this.state.productsLoaded = true;
            this.state.codesLoaded = true;
            this.state.totalProducts = productos.length;
            this.state.totalCodes = codigos.length;
            this.state.lastSync = new Date().toISOString();
            
            // Guardar timestamp de sincronización
            await window.storageManager.saveConfig('lastSync', this.state.lastSync);
            
            // Actualizar versión local
            const versionCheck = await window.supabaseClient.verificarActualizacionNecesaria();
            if (versionCheck.versionRemota) {
                await window.supabaseClient.actualizarVersionLocal(versionCheck.versionRemota);
            }
            
            window.ui.updateProductsCount(productos.length);
            window.ui.updateProgress(1.0, 'Sincronización completada');
            
            console.log(`✅ Sincronización completa: ${productos.length} productos, ${codigos.length} códigos`);
            
        } catch (error) {
            console.error('❌ Error en sincronización completa:', error);
            throw error;
        }
    }

    /**
     * Realiza sincronización en segundo plano
     */
    async performBackgroundSync() {
        try {
            console.log('🔄 Iniciando sincronización en segundo plano...');
            
            // Inicializar cliente Supabase si no está inicializado
            if (!window.supabaseClient.isConnected) {
                await window.supabaseClient.initialize(this.config);
            }
            
            // Limpiar listas expiradas
            await window.supabaseClient.cleanupExpiredLists();
            
            // Aquí se podría implementar verificación de actualizaciones
            // Por ahora solo limpiamos listas expiradas
            
            console.log('✅ Sincronización en segundo plano completada');
            
        } catch (error) {
            console.error('⚠️ Error en sincronización en segundo plano:', error);
            // No es crítico, continuar normalmente
        }
    }

    /**
     * Inicializa la interfaz de usuario
     */
    initializeUI() {
        // La UI ya está inicializada, solo actualizar estado
        window.ui.updateProductsCount(this.state.totalProducts);
        
        if (this.state.lastSync) {
            const lastSyncDate = new Date(this.state.lastSync);
            const timeAgo = this.getTimeAgo(lastSyncDate);
            window.ui.updateSyncStatus('connected', `Última sync: ${timeAgo}`);
        }
    }

    /**
     * Configura manejadores de conectividad
     */
    setupConnectivityHandlers() {
        // Detectar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Conexión restaurada');
            window.ui.updateSyncStatus('connected', 'Conectado');
            window.ui.showToast('Conexión restaurada', 'success');
            
            // Intentar sincronización automática
            this.performBackgroundSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Conexión perdida');
            window.ui.updateSyncStatus('offline', 'Sin conexión');
            window.ui.showToast('Trabajando sin conexión', 'warning');
        });

        // Detectar cuando la app vuelve a estar visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                // App visible y online, verificar si necesita sync
                this.checkForUpdates();
            }
        });
    }

    /**
     * Verifica si hay actualizaciones disponibles
     */
    async checkForUpdates() {
        try {
            if (!this.state.lastSync) return;
            
            const lastSync = new Date(this.state.lastSync);
            const now = new Date();
            const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
            
            // Si han pasado más de 4 horas, sugerir actualización
            if (hoursSinceSync > 4) {
                console.log('⏰ Verificando actualizaciones...');
                // Aquí se podría implementar verificación de versión remota
                // Por ahora solo mostrar notificación
                window.ui.showToast('Datos pueden estar desactualizados', 'warning');
            }
            
        } catch (error) {
            console.error('Error al verificar actualizaciones:', error);
        }
    }

    /**
     * Maneja errores de inicialización
     */
    handleInitializationError(error) {
        window.ui.hideLoading();
        window.ui.updateSyncStatus('error', 'Error de inicialización');
        
        let message = 'Error al inicializar la aplicación';
        let canContinue = false;
        
        if (error.message.includes('configuración')) {
            message = 'Error en la configuración. Verifique los datos de conexión.';
        } else if (error.message.includes('datos disponibles')) {
            message = 'No hay datos disponibles. Verifique su conexión a internet.';
        } else if (error.message.includes('Supabase')) {
            message = 'Error de conexión con el servidor. Intente más tarde.';
            canContinue = true; // Podría tener datos locales
        }
        
        // Mostrar error
        window.ui.showToast(message, 'error', 10000);
        
        // Si puede continuar, intentar cargar datos locales
        if (canContinue) {
            this.tryLoadLocalData();
        } else {
            // Mostrar pantalla de error
            this.showErrorScreen(message);
        }
    }

    /**
     * Intenta cargar datos locales como fallback
     */
    async tryLoadLocalData() {
        try {
            const stats = await window.storageManager.getStorageStats();
            
            if (stats.productos > 0) {
                console.log('📱 Cargando datos locales como fallback');
                
                this.state.productsLoaded = true;
                this.state.totalProducts = stats.productos;
                this.state.lastSync = stats.ultima_sincronizacion;
                
                window.ui.updateProductsCount(stats.productos);
                window.ui.updateSyncStatus('offline', 'Modo offline');
                window.ui.showToast('Trabajando con datos locales', 'warning');
                
                this.isInitialized = true;
            } else {
                this.showErrorScreen('No hay datos disponibles para trabajar offline');
            }
            
        } catch (error) {
            console.error('Error al cargar datos locales:', error);
            this.showErrorScreen('Error al acceder a los datos locales');
        }
    }

    /**
     * Muestra pantalla de error
     */
    showErrorScreen(message) {
        document.getElementById('mainContent').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2>❌ Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="action-btn primary" style="margin-top: 1rem;">
                    🔄 Reintentar
                </button>
            </div>
        `;
        
        document.getElementById('mainContent').style.display = 'block';
    }

    /**
     * Obtiene tiempo transcurrido en formato legible
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `hace ${days} día${days !== 1 ? 's' : ''}`;
        if (hours > 0) return `hace ${hours} hora${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) return `hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        return 'hace un momento';
    }

    /**
     * Fuerza una sincronización manual
     */
    async forceSyncronization() {
        if (!this.isOnline) {
            window.ui.showToast('No hay conexión a internet', 'error');
            return;
        }

        try {
            window.ui.updateSyncStatus('syncing', 'Sincronizando...');
            window.ui.showToast('Iniciando sincronización...', 'info');
            
            await this.performFullSync();
            
            window.ui.updateSyncStatus('connected', 'Sincronizado');
            window.ui.showToast('Sincronización completada', 'success');
            
        } catch (error) {
            console.error('Error en sincronización manual:', error);
            window.ui.updateSyncStatus('error', 'Error en sync');
            window.ui.showToast('Error al sincronizar: ' + error.message, 'error');
        }
    }

    /**
     * Obtiene estadísticas de la aplicación
     */
    getAppStats() {
        return {
            initialized: this.isInitialized,
            online: this.isOnline,
            productsLoaded: this.state.productsLoaded,
            totalProducts: this.state.totalProducts,
            totalCodes: this.state.totalCodes,
            lastSync: this.state.lastSync
        };
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Crear instancia global de la aplicación
    window.mobileApp = new MobileApp();
    
    try {
        // Inicializar aplicación
        await window.mobileApp.initialize();
    } catch (error) {
        console.error('Error fatal al inicializar:', error);
    }
});

// Registrar Service Worker para PWA (opcional)
// Deshabilitado por ahora ya que no tenemos sw.js
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registrado');
            })
            .catch(error => {
                console.log('❌ Error al registrar Service Worker:', error);
            });
    });
}
*/
