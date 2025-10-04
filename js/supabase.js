/**
 * Cliente Supabase para Labels Reader
 * Maneja la conexión y operaciones con la base de datos de productos
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.config = {
            url: '',
            anonKey: ''
        };
    }

    /**
     * Inicializa la conexión con Supabase
     */
    async initialize(config) {
        try {
            this.config = config;
            
            // Validar configuración
            if (!config.supabaseUrl || !config.supabaseKey) {
                throw new Error('Configuración de Supabase incompleta');
            }
            
            console.log('🔗 Conectando a Supabase:', config.supabaseUrl);
            
            // Crear cliente Supabase
            this.client = supabase.createClient(config.supabaseUrl, config.supabaseKey);
            
            // Probar conexión
            await this.testConnection();
            this.isConnected = true;
            
            console.log('✅ Conexión con Supabase establecida');
            return true;
        } catch (error) {
            console.error('❌ Error al conectar con Supabase:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Prueba la conexión con Supabase
     */
    async testConnection() {
        try {
            const { data, error } = await this.client
                .from('productos')
                .select('codigo')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Conexión con Supabase verificada');
            return true;
        } catch (error) {
            console.error('❌ Error al verificar conexión:', error);
            throw error;
        }
    }

    /**
     * Descarga todos los productos desde Supabase (con paginación)
     */
    async downloadProducts(onProgress = null) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

            console.log('📦 Descargando productos desde Supabase...');
            const productos = [];
            const batchSize = 1000;
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await this.client
                    .from('productos')
                    .select('codigo, descripcion, pvp')
                    .range(offset, offset + batchSize - 1)
                    .order('codigo');

                if (error) throw error;

                if (data && data.length > 0) {
                    productos.push(...data);
                    offset += batchSize;
                    
                    // Reportar progreso
                    if (onProgress) {
                        onProgress({
                            loaded: productos.length,
                            total: productos.length + (data.length === batchSize ? batchSize : 0)
                        });
                    }
                    
                    // Si recibimos menos datos que el batch size, hemos terminado
                    hasMore = data.length === batchSize;
                } else {
                    hasMore = false;
                }
            }

            console.log(`✅ Descargados ${productos.length} productos`);
            return productos;
        } catch (error) {
            console.error('❌ Error al descargar productos:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los productos (método legacy para compatibilidad)
     */
    async getAllProducts() {
        return await this.downloadProducts();
    }

    /**
     * Busca un producto por código
     */
    async searchProductByCode(code) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }
            
            const { data, error } = await this.client
                .from('productos')
                .select('*')
                .eq('codigo', code)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // No se encontró el producto
                    return null;
                }
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Error al buscar producto:', error);
            throw error;
        }
    }

    /**
     * Busca productos por código secundario
     */
    async searchProductBySecondaryCode(secondaryCode) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }
            
            const { data, error } = await this.client
                .from('productos')
                .select('*')
                .eq('codigo_secundario', secondaryCode)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // No se encontró el producto
                    return null;
                }
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Error al buscar por código secundario:', error);
            throw error;
        }
    }

    /**
     * Obtiene la fecha de última actualización
     */
    async getLastUpdateTime() {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }
            
            // Intentar obtener la fecha de última actualización
            // Si no existe el campo updated_at, usar una fecha por defecto
            const { data, error } = await this.client
                .from('productos')
                .select('codigo')
                .order('codigo', { ascending: false })
                .limit(1);
            
            if (error) {
                console.log('⚠️ Error al obtener última actualización, usando fecha por defecto:', error);
                return new Date().toISOString();
            }
            
            // Si hay productos, devolver fecha actual
            if (data && data.length > 0) {
                return new Date().toISOString();
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error al obtener última actualización:', error);
            return new Date().toISOString();
        }
    }

    /**
     * Verifica si necesita actualización comparando hashes (igual que PC)
     */
    async verificarActualizacionNecesaria() {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

            // Obtener versión remota (igual que PC)
            const { data: versionRemota, error } = await this.client
                .from('version_control')
                .select('*')
                .order('fecha_actualizacion', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (!versionRemota || versionRemota.length === 0) {
                console.log('📊 No hay información de versión en Supabase');
                return { necesitaActualizacion: false, versionRemota: null, versionLocal: null };
            }

            const infoRemota = versionRemota[0];

            // Obtener versión local guardada (hash, no fecha)
            const versionLocalHash = await window.storageManager.getConfig('version_hash_local');
            
            if (!versionLocalHash) {
                console.log('📊 Primera sincronización - descargando datos');
                return { necesitaActualizacion: true, versionRemota: infoRemota, versionLocal: null };
            }

            // Comparar hashes (igual que PC)
            const versionRemotaHash = infoRemota.version_hash || '';
            const necesitaActualizacion = versionLocalHash !== versionRemotaHash;

            console.log('📊 Verificación de versión:', {
                versionLocal: versionLocalHash.substring(0, 8) + '...',
                versionRemota: versionRemotaHash.substring(0, 8) + '...',
                necesitaActualizacion: necesitaActualizacion
            });

            return { necesitaActualizacion, versionRemota: infoRemota, versionLocal: versionLocalHash };

        } catch (error) {
            console.error('❌ Error al verificar actualización:', error);
            return { necesitaActualizacion: true, versionRemota: null, versionLocal: null };
        }
    }

    /**
     * Actualiza la versión local guardada
     */
    async actualizarVersionLocal(versionRemota) {
        try {
            if (versionRemota && versionRemota.version_hash) {
                await window.storageManager.setConfig('version_hash_local', versionRemota.version_hash);
                console.log('✅ Versión local actualizada:', versionRemota.version_hash.substring(0, 8) + '...');
            }
        } catch (error) {
            console.error('❌ Error al actualizar versión local:', error);
        }
    }

    /**
     * Descarga códigos secundarios desde Supabase
     */
    async downloadSecondaryCodes(onProgress = null) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

            console.log('📦 Descargando códigos secundarios desde Supabase...');
            const codigos = [];
            const batchSize = 1000;
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await this.client
                    .from('codigos_secundarios')
                    .select('codigo_secundario, descripcion, codigo_principal')
                    .range(offset, offset + batchSize - 1)
                    .order('codigo_secundario');

                if (error) throw error;

                if (data && data.length > 0) {
                    codigos.push(...data);
                    offset += batchSize;
                    
                    // Reportar progreso
                    if (onProgress) {
                        onProgress({
                            loaded: codigos.length,
                            total: codigos.length + (data.length === batchSize ? batchSize : 0)
                        });
                    }
                    
                    hasMore = data.length === batchSize;
                } else {
                    hasMore = false;
                }
            }

            console.log(`✅ Descargados ${codigos.length} códigos secundarios`);
            return codigos;
        } catch (error) {
            console.error('❌ Error al descargar códigos secundarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de productos
     */
    async getProductStats() {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }
            
            const { count, error } = await this.client
                .from('productos')
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                throw error;
            }
            
            return {
                totalProducts: count || 0,
                lastUpdate: await this.getLastUpdateTime()
            };
            
        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            throw error;
        }
    }

    /**
     * Verifica si hay conexión
     */
    isConnectedToSupabase() {
        return this.isConnected && this.client !== null;
    }

    /**
     * Obtiene información de debug
     */
    getDebugInfo() {
        return {
            isConnected: this.isConnected,
            config: {
                url: this.config.url ? 'Configurada' : 'No configurada',
                key: this.config.anonKey ? 'Configurada' : 'No configurada'
            },
            client: this.client ? 'Inicializado' : 'No inicializado'
        };
    }

    /**
     * Cierra la conexión
     */
    disconnect() {
        this.client = null;
        this.isConnected = false;
        console.log('🔌 Conexión con Supabase cerrada');
    }
}

// Crear instancia global
window.supabaseClient = new SupabaseClient();
console.log('🎯 Supabase Client creado - Labels Reader');