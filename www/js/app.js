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
        console.log('🔧 Iniciando inicialización de módulos...');
        
        // Inicializar almacenamiento local
        console.log('📦 Inicializando storage manager...');
        await window.storageManager.initialize();
        console.log('✅ Storage manager inicializado');
        
        window.ui.updateProgress(0.2, 'Inicializando interfaz...');
        console.log('🎨 Inicializando UI...');
        
        // Inicializar UI
        window.ui.initialize();
        console.log('✅ UI inicializada');
        
        console.log('✅ Módulos base inicializados');
    }

    /**
     * Carga la configuración de la aplicación
     */
    async loadConfiguration() {
        window.ui.updateProgress(0.3, 'Cargando configuración...');
        console.log('⚙️ Iniciando carga de configuración...');
        
        try {
            // Cargar configuración de Supabase desde el servidor
            console.log('🔗 Cargando configuración de Supabase...');
            const configLoaded = await window.CONFIG.loadSupabaseConfig();
            
            if (!configLoaded) {
                throw new Error('No se pudo cargar la configuración de Supabase desde el servidor');
            }
            console.log('✅ Configuración de Supabase cargada');
            
            // Cargar configuración local guardada
            console.log('💾 Cargando configuración local...');
            const localConfig = await window.storageManager.getAllConfig();
            console.log('✅ Configuración local cargada');
            
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
            console.log('💾 Guardando configuración localmente...');
            await window.storageManager.saveConfig('supabaseUrl', this.config.supabaseUrl);
            await window.storageManager.saveConfig('supabaseKey', this.config.supabaseKey);
            console.log('✅ Configuración guardada localmente');
            
            console.log('✅ Configuración cargada desde APK y almacenada localmente');
            
            // Inicializar cliente de Supabase
            console.log('🔗 Inicializando cliente de Supabase...');
            await window.supabaseClient.initialize(this.config);
            console.log('✅ Cliente de Supabase inicializado');
            
        } catch (error) {
            console.error('❌ Error al cargar configuración:', error);
            
            // Intentar usar configuración local como fallback
            console.log('⚠️ Intentando usar configuración local como fallback...');
            const localConfig = await window.storageManager.getAllConfig();
            if (localConfig.supabaseUrl && localConfig.supabaseKey) {
                console.log('⚠️ Usando configuración local como fallback');
                this.config = localConfig;
                
                // Inicializar cliente de Supabase con configuración local
                console.log('🔗 Inicializando cliente de Supabase con configuración local...');
                await window.supabaseClient.initialize(this.config);
                console.log('✅ Cliente de Supabase inicializado con configuración local');
            } else {
                throw new Error('No hay configuración de Supabase disponible');
            }
        }
    }

    /**
     * Realiza la sincronización inicial
     */
    async performInitialSync() {
        window.ui.updateProgress(0.4, 'Sincronizando productos...');
        console.log('🔄 Iniciando sincronización inicial...');
        
        try {
            // Verificar si hay datos locales
            console.log('📊 Verificando datos locales...');
            const stats = await window.storageManager.getStats();
            console.log(`📊 Datos locales encontrados: ${stats.totalProducts} productos`);
            
            if (stats.totalProducts === 0) {
                // No hay datos locales, sincronizar desde Supabase
                console.log('📥 No hay datos locales, sincronizando desde Supabase...');
                await this.syncProductsFromSupabase();
                console.log('✅ Sincronización desde Supabase completada');
            } else {
                // Hay datos locales, verificar si necesitan actualización
                console.log('🔍 Verificando si los datos locales necesitan actualización...');
                const needsUpdate = await this.checkIfUpdateNeeded();
                if (needsUpdate) {
                    console.log('📥 Datos locales desactualizados, sincronizando...');
                    await this.syncProductsFromSupabase();
                    console.log('✅ Sincronización de actualización completada');
                } else {
                    console.log('✅ Datos locales actualizados');
                }
            }
            
            // Actualizar estado
            console.log('📝 Actualizando estado de la aplicación...');
            this.state.productsLoaded = true;
            this.state.lastSync = new Date().toISOString();
            
            // Actualizar estadísticas
            console.log('📊 Actualizando estadísticas finales...');
            const finalStats = await window.storageManager.getStats();
            this.state.totalProducts = finalStats.totalProducts;
            
            window.ui.updateProgress(1.0, 'Sincronización completada');
            
            console.log(`✅ Sincronización completada: ${finalStats.totalProducts} productos`);
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            
            // Intentar usar datos locales si están disponibles
            console.log('⚠️ Intentando usar datos locales debido a error...');
            const stats = await window.storageManager.getStats();
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
            // Descargar productos con progreso
            const products = await window.supabaseClient.downloadProducts((progress) => {
                const progressValue = 0.5 + (progress.loaded / (progress.total || progress.loaded)) * 0.3;
                window.ui.updateProgress(progressValue, `Descargando productos: ${progress.loaded.toLocaleString()}`);
            });
            
            if (!products || products.length === 0) {
                throw new Error('No se encontraron productos en la base de datos');
            }
            
            window.ui.updateProgress(0.8, 'Guardando productos...');
            
            // Guardar productos en almacenamiento local
            await window.storageManager.saveProducts(products);
            
            // Actualizar versión local con el hash remoto
            const versionCheck = await window.supabaseClient.verificarActualizacionNecesaria();
            if (versionCheck.versionRemota) {
                await window.supabaseClient.actualizarVersionLocal(versionCheck.versionRemota);
            }
            
            window.ui.updateProgress(0.9, 'Finalizando...');
            
            console.log(`✅ ${products.length} productos sincronizados`);
            
            // Actualizar estado
            this.state.productsLoaded = true;
            this.state.totalProducts = products.length;
            
        } catch (error) {
            console.error('❌ Error al sincronizar productos:', error);
            throw error;
        }
    }

    /**
     * Verifica si necesita actualización usando hash de versión
     */
    async checkIfUpdateNeeded() {
        try {
            console.log('🔍 Verificando si necesita actualización...');
            const versionCheck = await window.supabaseClient.verificarActualizacionNecesaria();
            
            if (versionCheck.necesitaActualizacion) {
                console.log('📥 Actualización necesaria - hash local diferente al remoto');
                return true;
            } else {
                console.log('✅ Datos locales actualizados - hash coincide');
                return false;
            }
            
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
            const stats = await window.storageManager.getStats();
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

// Inicializar aplicación cuando la página esté completamente cargada
window.addEventListener('load', async () => {
    try {
        console.log('🌐 Página completamente cargada, iniciando Labels Reader...');
        console.log('📄 Estado del DOM:', document.readyState);
        
        // Esperar a que el UIManager esté inicializado
        if (!window.ui) {
            console.log('⏳ Esperando inicialización del UIManager...');
            await new Promise(resolve => {
                const checkUI = () => {
                    if (window.ui) {
                        resolve();
                    } else {
                        setTimeout(checkUI, 10);
                    }
                };
                checkUI();
            });
        }
        
        // Verificar que los elementos críticos estén disponibles
        const loadingScreen = document.getElementById('loadingScreen');
        if (!loadingScreen) {
            throw new Error('Elemento loadingScreen no encontrado en el DOM');
        }
        
        console.log('🚀 Iniciando Labels Reader...');
        window.mobileApp = new MobileApp();
        await window.mobileApp.initialize();
        console.log('🎯 Labels Reader iniciado correctamente');
    } catch (error) {
        console.error('❌ Error crítico al iniciar Labels Reader:', error);
    }
});