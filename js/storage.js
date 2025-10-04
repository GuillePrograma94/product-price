/**
 * Gestor de almacenamiento local para la aplicación móvil
 * Maneja la persistencia de datos y configuración
 */

class StorageManager {
    constructor() {
        this.dbName = 'LabelsProductosDB';
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
                console.log('✅ IndexedDB inicializada');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacén de productos
                if (!db.objectStoreNames.contains('productos')) {
                    const productosStore = db.createObjectStore('productos', { keyPath: 'codigo' });
                    productosStore.createIndex('descripcion', 'descripcion', { unique: false });
                    productosStore.createIndex('pvp', 'pvp', { unique: false });
                }

                // Crear almacén de códigos secundarios
                if (!db.objectStoreNames.contains('codigos_secundarios')) {
                    const codigosStore = db.createObjectStore('codigos_secundarios', { keyPath: 'codigo_secundario' });
                    codigosStore.createIndex('codigo_principal', 'codigo_principal', { unique: false });
                    codigosStore.createIndex('descripcion', 'descripcion', { unique: false });
                }

                // Crear almacén de configuración
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }

                // Crear almacén de listas locales
                if (!db.objectStoreNames.contains('listas_locales')) {
                    const listasStore = db.createObjectStore('listas_locales', { keyPath: 'id', autoIncrement: true });
                    listasStore.createIndex('fecha_creacion', 'fecha_creacion', { unique: false });
                    listasStore.createIndex('nombre', 'nombre', { unique: false });
                }

                console.log('🔧 Base de datos actualizada');
            };
        });
    }

    /**
     * Guarda productos en el almacenamiento local
     */
    async saveProducts(productos) {
        try {
            const transaction = this.db.transaction(['productos'], 'readwrite');
            const store = transaction.objectStore('productos');

            // Limpiar productos existentes
            await store.clear();

            // Insertar nuevos productos
            for (const producto of productos) {
                await store.add(producto);
            }

            await this.waitForTransaction(transaction);
            console.log(`✅ Guardados ${productos.length} productos localmente`);
        } catch (error) {
            console.error('❌ Error al guardar productos:', error);
            throw error;
        }
    }

    /**
     * Guarda códigos secundarios en el almacenamiento local
     */
    async saveSecondaryCodes(codigos) {
        try {
            const transaction = this.db.transaction(['codigos_secundarios'], 'readwrite');
            const store = transaction.objectStore('codigos_secundarios');

            // Limpiar códigos existentes
            await store.clear();

            // Insertar nuevos códigos
            for (const codigo of codigos) {
                await store.add(codigo);
            }

            await this.waitForTransaction(transaction);
            console.log(`✅ Guardados ${codigos.length} códigos secundarios localmente`);
        } catch (error) {
            console.error('❌ Error al guardar códigos secundarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los productos del almacenamiento local
     */
    async getProducts() {
        try {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al obtener productos:', error);
            return [];
        }
    }

    /**
     * Obtiene todos los códigos secundarios del almacenamiento local
     */
    async getSecondaryCodes() {
        try {
            const transaction = this.db.transaction(['codigos_secundarios'], 'readonly');
            const store = transaction.objectStore('codigos_secundarios');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al obtener códigos secundarios:', error);
            return [];
        }
    }

    /**
     * Busca productos localmente
     */
    async searchProducts(query, limit = 50) {
        try {
            const productos = await this.getProducts();
            const codigos = await this.getSecondaryCodes();
            
            const queryLower = query.toLowerCase().trim();
            const results = [];

            // Buscar en productos principales
            for (const producto of productos) {
                if (results.length >= limit) break;

                const matchesCodigo = producto.codigo.toLowerCase().includes(queryLower);
                const matchesDescripcion = producto.descripcion.toLowerCase().includes(queryLower);

                if (matchesCodigo || matchesDescripcion) {
                    results.push({
                        ...producto,
                        matchType: matchesCodigo ? 'codigo' : 'descripcion'
                    });
                }
            }

            // Buscar en códigos secundarios
            for (const codigo of codigos) {
                if (results.length >= limit) break;

                const matchesCodigoSec = codigo.codigo_secundario.toLowerCase().includes(queryLower);
                const matchesDescripcionSec = codigo.descripcion.toLowerCase().includes(queryLower);

                if (matchesCodigoSec || matchesDescripcionSec) {
                    // Buscar el producto principal correspondiente
                    const productoPrincipal = productos.find(p => p.codigo === codigo.codigo_principal);
                    if (productoPrincipal) {
                        // Evitar duplicados
                        const yaExiste = results.some(r => r.codigo === productoPrincipal.codigo);
                        if (!yaExiste) {
                            results.push({
                                ...productoPrincipal,
                                matchType: 'codigo_secundario',
                                codigoSecundario: codigo.codigo_secundario
                            });
                        }
                    }
                }
            }

            // Ordenar resultados por relevancia
            results.sort((a, b) => {
                // Priorizar coincidencias exactas de código
                if (a.matchType === 'codigo' && b.matchType !== 'codigo') return -1;
                if (b.matchType === 'codigo' && a.matchType !== 'codigo') return 1;
                
                // Luego códigos secundarios
                if (a.matchType === 'codigo_secundario' && b.matchType === 'descripcion') return -1;
                if (b.matchType === 'codigo_secundario' && a.matchType === 'descripcion') return 1;
                
                return 0;
            });

            return results;
        } catch (error) {
            console.error('❌ Error en búsqueda local:', error);
            return [];
        }
    }

    /**
     * Guarda una lista local
     */
    async saveLocalList(lista) {
        try {
            const transaction = this.db.transaction(['listas_locales'], 'readwrite');
            const store = transaction.objectStore('listas_locales');

            const listaConFecha = {
                ...lista,
                fecha_creacion: new Date().toISOString(),
                fecha_modificacion: new Date().toISOString()
            };

            const request = store.add(listaConFecha);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ Lista guardada localmente');
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al guardar lista local:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las listas locales
     */
    async getLocalLists() {
        try {
            const transaction = this.db.transaction(['listas_locales'], 'readonly');
            const store = transaction.objectStore('listas_locales');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al obtener listas locales:', error);
            return [];
        }
    }

    /**
     * Guarda configuración
     */
    async saveConfig(key, value) {
        try {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');

            const configItem = { key, value, timestamp: new Date().toISOString() };
            await store.put(configItem);

            await this.waitForTransaction(transaction);
            console.log(`✅ Configuración guardada: ${key}`);
        } catch (error) {
            console.error('❌ Error al guardar configuración:', error);
            throw error;
        }
    }

    /**
     * Obtiene configuración
     */
    async getConfig(key) {
        try {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.get(key);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al obtener configuración:', error);
            return null;
        }
    }

    /**
     * Obtiene toda la configuración
     */
    async getAllConfig() {
        try {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const items = request.result;
                    const config = {};
                    items.forEach(item => {
                        config[item.key] = item.value;
                    });
                    resolve({ ...this.defaultConfig, ...config });
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Error al obtener configuración completa:', error);
            return this.defaultConfig;
        }
    }

    /**
     * Limpia todos los datos locales
     */
    async clearAllData() {
        try {
            const stores = ['productos', 'codigos_secundarios', 'listas_locales'];
            const transaction = this.db.transaction(stores, 'readwrite');

            for (const storeName of stores) {
                const store = transaction.objectStore(storeName);
                await store.clear();
            }

            await this.waitForTransaction(transaction);
            console.log('🧹 Datos locales limpiados');
        } catch (error) {
            console.error('❌ Error al limpiar datos:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de almacenamiento
     */
    async getStorageStats() {
        try {
            const productos = await this.getProducts();
            const codigos = await this.getSecondaryCodes();
            const listas = await this.getLocalLists();
            const config = await this.getAllConfig();

            return {
                productos: productos.length,
                codigos_secundarios: codigos.length,
                listas_locales: listas.length,
                ultima_sincronizacion: config.lastSync,
                modo_offline: config.offlineMode
            };
        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            return {
                productos: 0,
                codigos_secundarios: 0,
                listas_locales: 0,
                ultima_sincronizacion: null,
                modo_offline: false
            };
        }
    }

    /**
     * Espera a que una transacción se complete
     */
    waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Instancia global del gestor de almacenamiento
window.storageManager = new StorageManager();
