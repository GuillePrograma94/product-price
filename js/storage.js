/**
 * Gestor de almacenamiento local para Labels Reader
 * Maneja la persistencia de productos y configuración
 */

class StorageManager {
    constructor() {
        this.dbName = 'LabelsReaderDB';
        this.dbVersion = 2; // Incrementado para agregar codigos_secundarios
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
                        // Actualizar caché de estadísticas
                        this._cachedProductCount = total;
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
     * Búsqueda EXACTA para escáner - solo códigos que coincidan exactamente
     * OPTIMIZADA: Usa índices de IndexedDB en lugar de getAll()
     */
    async searchProductsExact(scannedCode) {
        try {
            if (!scannedCode || !scannedCode.trim()) return [];
            const normalized = this.normalizeText(scannedCode.trim());
            const originalCode = scannedCode.trim();

            console.time('⏱️ searchProductsExact TOTAL');
            console.log('🔍 Buscando código:', originalCode, '| Normalizado:', normalized);

            const results = [];
            const seen = new Set();

            // 1. Búsqueda directa en productos (código principal) - INSTANTÁNEA
            console.time('⏱️ Búsqueda directa productos');
            const productoPrincipal = await new Promise((resolve) => {
                const tx = this.db.transaction(['productos'], 'readonly');
                const store = tx.objectStore('productos');
                const req = store.get(originalCode);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });

            console.timeEnd('⏱️ Búsqueda directa productos');
            if (productoPrincipal) {
                console.log('✅ Encontrado en productos:', productoPrincipal.codigo);
                results.push(productoPrincipal);
                seen.add(productoPrincipal.codigo);
            } else {
                console.log('❌ No encontrado en productos con código exacto');
            }

            // 2. Búsqueda directa en códigos secundarios (EAN) - INSTANTÁNEA
            console.time('⏱️ Búsqueda códigos secundarios');
            const codigoSecundario = await new Promise((resolve) => {
                const tx = this.db.transaction(['codigos_secundarios'], 'readonly');
                const store = tx.objectStore('codigos_secundarios');
                const req = store.get(originalCode);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });

            if (codigoSecundario && !seen.has(codigoSecundario.codigo_principal)) {
                // Obtener el producto principal
                const productoPrincipal = await new Promise((resolve) => {
                    const tx = this.db.transaction(['productos'], 'readonly');
                    const store = tx.objectStore('productos');
                    const req = store.get(codigoSecundario.codigo_principal);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                });

                if (productoPrincipal) {
                    results.push(productoPrincipal);
                    seen.add(productoPrincipal.codigo);
                }
            }
            console.timeEnd('⏱️ Búsqueda códigos secundarios');

            // 3. Si no encontró con código original, intentar con código normalizado (solo si es diferente)
            console.log(`📊 Resultados hasta ahora: ${results.length}`);
            if (results.length === 0 && normalized !== originalCode.toLowerCase()) {
                console.log('⚠️ Código no encontrado exacto, usando cursor (LENTO)...');
                console.time('⏱️ Búsqueda con cursor');
                // Búsqueda con cursor solo si la búsqueda exacta falló
                const cursorResults = await new Promise((resolve) => {
                    const tx = this.db.transaction(['productos', 'codigos_secundarios'], 'readonly');
                    const productosStore = tx.objectStore('productos');
                    const matches = [];
                    
                    const cursorReq = productosStore.openCursor();
                    cursorReq.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            if (this.normalizeText(cursor.value.codigo) === normalized) {
                                matches.push(cursor.value);
                            }
                            cursor.continue();
                        } else {
                            resolve(matches);
                        }
                    };
                    cursorReq.onerror = () => resolve([]);
                });

                console.timeEnd('⏱️ Búsqueda con cursor');
                cursorResults.forEach(product => {
                    if (!seen.has(product.codigo)) {
                        results.push(product);
                        seen.add(product.codigo);
                    }
                });
            }

            console.timeEnd('⏱️ searchProductsExact TOTAL');
            console.log(`✅ Búsqueda exacta completada: ${results.length} resultado(s)`);
            return results;
        } catch (e) {
            console.error('❌ Error en searchProductsExact:', e);
            return [];
        }
    }

    /**
     * Búsqueda para escáner: exacta primero; si no, por prefijo.
     */
    async searchProductsForScan(scannedCode) {
        try {
            if (!scannedCode || !scannedCode.trim()) return [];
            const normalized = this.normalizeText(scannedCode.trim());

            const productos = await new Promise((resolve) => {
                const tx = this.db.transaction(['productos'], 'readonly');
                const store = tx.objectStore('productos');
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });

            const codigosSec = await new Promise((resolve) => {
                const tx = this.db.transaction(['codigos_secundarios'], 'readonly');
                const store = tx.objectStore('codigos_secundarios');
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });

            const normalizedPrimaryMap = new Map();
            for (const p of productos) {
                normalizedPrimaryMap.set(this.normalizeText(p.codigo), p);
            }

            const exact = [];
            const seen = new Set();
            const pExact = normalizedPrimaryMap.get(normalized);
            if (pExact) {
                exact.push(pExact);
                seen.add(pExact.codigo);
            }

            for (const sec of codigosSec) {
                if (this.normalizeText(sec.codigo_secundario) === normalized) {
                    const principal = productos.find(p => p.codigo === sec.codigo_principal);
                    if (principal && !seen.has(principal.codigo)) {
                        exact.push(principal);
                        seen.add(principal.codigo);
                    }
                }
            }

            if (exact.length > 0) return exact;

            const prefix = [];
            for (const p of productos) {
                if (this.normalizeText(p.codigo).startsWith(normalized) && !seen.has(p.codigo)) {
                    prefix.push(p);
                    seen.add(p.codigo);
                }
            }

            for (const sec of codigosSec) {
                if (this.normalizeText(sec.codigo_secundario).startsWith(normalized)) {
                    const principal = productos.find(p => p.codigo === sec.codigo_principal);
                    if (principal && !seen.has(principal.codigo)) {
                        prefix.push(principal);
                        seen.add(principal.codigo);
                    }
                }
            }

            return prefix;
        } catch (e) {
            console.error('❌ Error en searchProductsForScan (reader):', e);
            return [];
        }
    }

    /**
     * Normaliza texto para búsqueda (elimina acentos, espacios extra, etc.)
     */
    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
    }

    /**
     * Búsqueda ultra-optimizada por código usando índices de IndexedDB
     */
    async searchProductsByCode(codeQuery) {
        try {
            if (!codeQuery || codeQuery.trim() === '') {
                return [];
            }

            console.log('🔍 Iniciando búsqueda optimizada por código:', codeQuery);
            
            const results = new Set();
            const processedCodes = new Set();
            
            // Normalizar código de búsqueda
            const normalizedCode = this.normalizeText(codeQuery);
            
            // Detectar si es código EAN (13 dígitos numéricos)
            const isEAN = /^\d{13}$/.test(codeQuery.trim());
            
            if (isEAN) {
                console.log('🍯 Código EAN detectado (13 dígitos), buscando solo en códigos secundarios');
                
                // Buscar directamente en códigos secundarios
                const codigosSecundarios = await this.searchInCodigosSecundariosOptimized(normalizedCode);
                for (const codigoSec of codigosSecundarios) {
                    if (!processedCodes.has(codigoSec.codigo_principal)) {
                        results.add(codigoSec.codigo_principal);
                        processedCodes.add(codigoSec.codigo_principal);
                    }
                }
                console.log(`📊 Encontrados ${results.size} productos por código EAN`);
            } else {
                console.log('🔍 Código SKU detectado, búsqueda normal');
                
                // Buscar en códigos principales (SKU) usando índices
                const productos = await this.searchInProductosOptimized(normalizedCode);
                productos.forEach(producto => {
                    results.add(producto.codigo);
                    processedCodes.add(producto.codigo);
                });
                
                console.log(`📊 Encontrados ${results.size} productos por código principal`);
                
                // Buscar en códigos secundarios (EAN) solo si no hay muchos resultados
                if (results.size < 10) {
                    const codigosSecundarios = await this.searchInCodigosSecundariosOptimized(normalizedCode);
                    for (const codigoSec of codigosSecundarios) {
                        if (!processedCodes.has(codigoSec.codigo_principal)) {
                            results.add(codigoSec.codigo_principal);
                            processedCodes.add(codigoSec.codigo_principal);
                        }
                    }
                    console.log(`📊 Total después de códigos secundarios: ${results.size} productos`);
                }
            }
            
            // Obtener productos completos
            const productosCompletos = await this.getProductsByCodes(Array.from(results));
            console.log(`✅ Búsqueda completada: ${productosCompletos.length} resultados finales`);
            return productosCompletos;
            
        } catch (error) {
            console.error('❌ Error en búsqueda por código:', error);
            return [];
        }
    }

    /**
     * Busca en la tabla productos usando índices optimizados
     */
    async searchInProductosOptimized(codeQuery) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            
            // Intentar búsqueda exacta primero (más rápida)
            const exactRequest = store.get(codeQuery);
            
            exactRequest.onsuccess = () => {
                if (exactRequest.result) {
                    // Encontrado exactamente
                    resolve([exactRequest.result]);
                } else {
                    // Búsqueda parcial solo si no hay coincidencia exacta
                    const cursorRequest = store.openCursor();
                    const matches = [];
                    
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const normalizedCodigo = this.normalizeText(cursor.value.codigo);
                            if (normalizedCodigo.includes(codeQuery)) {
                                matches.push(cursor.value);
                            }
                            cursor.continue();
                        } else {
                            resolve(matches);
                        }
                    };
                    
                    cursorRequest.onerror = () => {
                        console.error('Error al buscar en productos:', cursorRequest.error);
                        reject(cursorRequest.error);
                    };
                }
            };
            
            exactRequest.onerror = () => {
                console.error('Error al buscar en productos:', exactRequest.error);
                reject(exactRequest.error);
            };
        });
    }

    /**
     * Busca en códigos secundarios usando índices optimizados
     */
    async searchInCodigosSecundariosOptimized(codeQuery) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['codigos_secundarios'], 'readonly');
            const store = transaction.objectStore('codigos_secundarios');
            
            // Intentar búsqueda exacta primero
            const exactRequest = store.get(codeQuery);
            
            exactRequest.onsuccess = () => {
                if (exactRequest.result) {
                    // Encontrado exactamente
                    resolve([exactRequest.result]);
                } else {
                    // Búsqueda parcial con cursor (más eficiente que getAll)
                    const cursorRequest = store.openCursor();
                    const matches = [];
                    
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const normalizedCodigo = this.normalizeText(cursor.value.codigo_secundario);
                            if (normalizedCodigo.includes(codeQuery)) {
                                matches.push(cursor.value);
                            }
                            cursor.continue();
                        } else {
                            resolve(matches);
                        }
                    };
                    
                    cursorRequest.onerror = () => {
                        console.error('Error al buscar en códigos secundarios:', cursorRequest.error);
                        reject(cursorRequest.error);
                    };
                }
            };
            
            exactRequest.onerror = () => {
                console.error('Error al buscar en códigos secundarios:', exactRequest.error);
                reject(exactRequest.error);
            };
        });
    }

    /**
     * Busca en la tabla productos usando índices (método original para compatibilidad)
     */
    async searchInProductos(codeQuery) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const productos = request.result;
                const matches = productos.filter(producto => 
                    this.normalizeText(producto.codigo).includes(codeQuery)
                );
                resolve(matches);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Busca en la tabla codigos_secundarios usando índices
     */
    async searchInCodigosSecundarios(codeQuery) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction(['codigos_secundarios'], 'readonly');
            const store = transaction.objectStore('codigos_secundarios');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const codigos = request.result;
                const matches = codigos.filter(codigo => 
                    this.normalizeText(codigo.codigo_secundario).includes(codeQuery)
                );
                resolve(matches);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene productos específicos por sus códigos
     */
    async getProductsByCodes(codes) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const productos = [];
            let completed = 0;
            
            if (codes.length === 0) {
                resolve([]);
                return;
            }
            
            codes.forEach(codigo => {
                const request = store.get(codigo);
                request.onsuccess = () => {
                    if (request.result) {
                        productos.push(request.result);
                    }
                    completed++;
                    if (completed === codes.length) {
                        resolve(productos);
                    }
                };
                request.onerror = () => {
                    completed++;
                    if (completed === codes.length) {
                        resolve(productos);
                    }
                };
            });
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
     * Obtiene estadísticas del almacenamiento (versión asíncrona)
     */
    async getStorageStats() {
        try {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');
            const request = store.count();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    resolve({
                        productos: request.result,
                        codigos_secundarios: request.result, // Simplificado para mobile_reader
                        lastSync: this.getLastSyncTime(),
                        dbSize: this.estimateDBSize()
                    });
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return {
                productos: 0,
                codigos_secundarios: 0,
                lastSync: null,
                dbSize: 'Error'
            };
        }
    }

    /**
     * Obtiene estadísticas del almacenamiento
     */
    getStats() {
        return new Promise((resolve, reject) => {
            // Verificar que la base de datos esté disponible
            if (!this.db) {
                console.log('⚠️ Base de datos no inicializada, usando estadísticas en caché');
                resolve({
                    totalProducts: this._cachedProductCount || 0,
                    lastSync: this.getLastSyncTime(),
                    dbSize: this.estimateDBSize()
                });
                return;
            }
            
            try {
                const transaction = this.db.transaction(['productos'], 'readonly');
                const store = transaction.objectStore('productos');
                const request = store.count();
                
                request.onsuccess = () => {
                    const stats = {
                        totalProducts: request.result,
                        lastSync: this.getLastSyncTime(),
                        dbSize: this.estimateDBSize()
                    };
                    // Actualizar caché
                    this._cachedProductCount = request.result;
                    resolve(stats);
                };
                
                request.onerror = () => {
                    console.log('⚠️ Error al obtener estadísticas, usando caché');
                    resolve({
                        totalProducts: this._cachedProductCount || 0,
                        lastSync: this.getLastSyncTime(),
                        dbSize: this.estimateDBSize()
                    });
                };
        } catch (error) {
                console.log('⚠️ Error al acceder a la base de datos:', error);
                resolve({
                    totalProducts: this._cachedProductCount || 0,
                    lastSync: this.getLastSyncTime(),
                    dbSize: this.estimateDBSize()
                });
            }
        });
    }

    /**
     * Obtiene estadísticas síncronas (para uso inmediato en UI)
     */
    getStatsSync() {
        // Versión síncrona para uso inmediato en UI
        return {
            totalProducts: this._cachedProductCount || 0,
            lastSync: this.getLastSyncTime(),
            dbSize: this.estimateDBSize()
        };
    }

    /**
     * Guarda configuración
     */
    async saveConfig(key, value) {
        try {
            if (!this.db) {
                console.log('⚠️ Base de datos no inicializada, guardando en localStorage');
                localStorage.setItem(`config_${key}`, JSON.stringify(value));
                return;
            }

            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');

            const configItem = { key, value, timestamp: new Date().toISOString() };
            await store.put(configItem);

            await this.waitForTransaction(transaction);
            console.log(`✅ Configuración guardada: ${key}`);
        } catch (error) {
            console.error('❌ Error al guardar configuración:', error);
            // Fallback a localStorage
            localStorage.setItem(`config_${key}`, JSON.stringify(value));
        }
    }

    /**
     * Obtiene configuración
     */
    async getConfig(key) {
        try {
            if (!this.db) {
                console.log('⚠️ Base de datos no inicializada, usando localStorage');
                const value = localStorage.getItem(`config_${key}`);
                return value ? JSON.parse(value) : null;
            }

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
            // Fallback a localStorage
            const value = localStorage.getItem(`config_${key}`);
            return value ? JSON.parse(value) : null;
        }
    }

    /**
     * Alias para compatibilidad
     */
    async setConfig(key, value) {
        return await this.saveConfig(key, value);
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

    /**
     * Guarda códigos secundarios
     */
    async saveSecondaryCodes(codigos) {
        try {
            if (!this.db) {
                console.log('⚠️ Base de datos no inicializada');
                return;
            }

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