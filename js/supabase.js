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
                .select('count')
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
     * Obtiene todos los productos
     */
    async getAllProducts() {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }
            
            console.log('📦 Obteniendo productos desde Supabase...');
            
            const { data, error } = await this.client
                .from('productos')
                .select('*')
                .order('codigo');
            
            if (error) {
                throw error;
            }
            
            console.log(`✅ ${data.length} productos obtenidos`);
            return data || [];
            
        } catch (error) {
            console.error('❌ Error al obtener productos:', error);
            throw error;
        }
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
            
            const { data, error } = await this.client
                .from('productos')
                .select('updated_at')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // No hay productos
                    return null;
                }
                throw error;
            }
            
            return data.updated_at;
            
        } catch (error) {
            console.error('❌ Error al obtener última actualización:', error);
            return null;
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