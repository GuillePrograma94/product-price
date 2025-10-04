/**
 * Gestor de almacenamiento local para Labels Reader
 * Maneja la persistencia de productos y configuración
 */

class StorageManager {
    constructor() {
        this.dbName = 'LabelsReaderDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Configuración por defecto
        this.defaultConfig = {
            supabaseUrl: '',
            supabaseKey: '',
            lastSync: null,
            autoSync: true,
            offlineMode: false
        };
    }

    /**
     * Inicializa la base de datos IndexedDB
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error al abrir IndexedDB');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB inicializada - Labels Reader');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacén de productos
                if (!db.objectStoreNames.contains('productos')) {
                    const productosStore = db.createObjectStore('productos', { keyPath: 'codigo' });
                    productosStore.createIndex('descripcion', 'descripcion', { unique: false });
                    productosStore.createIndex('pvp', 'pvp', { unique: false });
                    productosStore.createIndex('categoria', 'categoria', { unique: false });
                    productosStore.createIndex('codigo_secundario', 'codigo_secundario', { unique: false });
                }

                // Crear almacén de configuración
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }

                console.log('✅ Esquema de base de datos creado');
            };
        });
    }

    /**
     * Guarda productos en el almacenamiento local
     */
    async saveProducts(products) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readwrite');
            const store = transaction.objectStore('productos');
            
            let completed = 0;
            const total = products.length;
            
            products.forEach(product => {
                const request = store.put(product);
                
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        console.log(`✅ ${total} productos guardados`);
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    console.error('Error al guardar producto:', product.codigo);
                    reject(request.error);
                };
            });
        });
    }

    /**
     * Busca productos por código (puede devolver múltiples resultados)
     */
    async searchProductsByCode(code) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const allProducts = request.result || [];
                
                // Filtrar productos que coincidan con el código (principal o secundario)
                const matchingProducts = allProducts.filter(product => 
                    product.codigo === code || 
                    product.codigo_secundario === code
                );
                
                resolve(matchingProducts);
            };
            
            request.onerror = () => {
                console.error('Error al buscar productos:', code);
                reject(request.error);
            };
        });
    }

    /**
     * Busca un producto por código (devuelve solo el primero encontrado)
     */
    async searchProductByCode(code) {
        const products = await this.searchProductsByCode(code);
        return products.length > 0 ? products[0] : null;
    }

    /**
     * Busca productos por código secundario
     */
    async searchProductBySecondaryCode(secondaryCode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const index = store.index('codigo_secundario');
            const request = index.get(secondaryCode);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('Error al buscar por código secundario:', secondaryCode);
                reject(request.error);
            };
        });
    }

    /**
     * Obtiene estadísticas del almacenamiento
     */
    getStats() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.count();
            
                request.onsuccess = () => {
                resolve({
                    totalProducts: request.result,
                    lastSync: this.getLastSyncTime(),
                    dbSize: this.estimateDBSize()
                });
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Obtiene estadísticas síncronas (para uso inmediato)
     */
    getStats() {
        // Versión síncrona para uso inmediato en UI
        return {
            totalProducts: this._cachedProductCount || 0,
            lastSync: this.getLastSyncTime(),
            dbSize: this.estimateDBSize()
        };
    }

    /**
     * Actualiza el contador de productos en caché
     */
    async updateProductCount() {
        try {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.count();
            
            request.onsuccess = () => {
                this._cachedProductCount = request.result;
            };
        } catch (error) {
            console.error('Error al actualizar contador:', error);
        }
    }

    /**
     * Obtiene la fecha de última sincronización
     */
    getLastSyncTime() {
        try {
            const config = this.getConfig('lastSync');
            return config ? config.value : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Guarda la fecha de última sincronización
     */
    async setLastSyncTime(timestamp) {
        await this.saveConfig('lastSync', timestamp);
    }

    /**
     * Guarda configuración
     */
    async saveConfig(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene configuración
     */
    getConfig(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.get(key);

                request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
                };
            
                request.onerror = () => reject(request.error);
            });
    }

    /**
     * Obtiene toda la configuración
     */
    async getAllConfig() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.getAll();

                request.onsuccess = () => {
                    const config = {};
                request.result.forEach(item => {
                        config[item.key] = item.value;
                    });
                resolve(config);
                };
            
                request.onerror = () => reject(request.error);
            });
    }

    /**
     * Estima el tamaño de la base de datos
     */
    estimateDBSize() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return 'No disponible';
        }
        
        navigator.storage.estimate().then(estimate => {
            const used = estimate.usage || 0;
            const quota = estimate.quota || 0;
            
            if (quota > 0) {
                const percentage = (used / quota) * 100;
                return `${(used / 1024 / 1024).toFixed(2)} MB (${percentage.toFixed(1)}%)`;
            }
            
            return `${(used / 1024 / 1024).toFixed(2)} MB`;
        });
        
        return 'Calculando...';
    }

    /**
     * Limpia todos los datos
     */
    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos', 'config'], 'readwrite');
            
            const clearProductos = transaction.objectStore('productos').clear();
            const clearConfig = transaction.objectStore('config').clear();
            
            transaction.oncomplete = () => {
                this._cachedProductCount = 0;
                console.log('✅ Todos los datos eliminados');
                resolve();
            };
            
            transaction.onerror = () => {
                console.error('Error al limpiar datos');
                reject(transaction.error);
            };
        });
    }

    /**
     * Limpia solo los productos
     */
    async clearProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readwrite');
            const store = transaction.objectStore('productos');
            const request = store.clear();
            
            request.onsuccess = () => {
                this._cachedProductCount = 0;
                console.log('✅ Productos eliminados');
                resolve();
            };
            
            request.onerror = () => {
                console.error('Error al limpiar productos');
                reject(request.error);
            };
        });
    }

    /**
     * Verifica si la base de datos está disponible
     */
    isAvailable() {
        return this.db !== null;
    }

    /**
     * Obtiene información de debug
     */
    getDebugInfo() {
        return {
            dbName: this.dbName,
            dbVersion: this.dbVersion,
            isAvailable: this.isAvailable(),
            stats: this.getStats()
        };
    }
}

// Crear instancia global
window.storageManager = new StorageManager();
console.log('🎯 Storage Manager creado - Labels Reader');