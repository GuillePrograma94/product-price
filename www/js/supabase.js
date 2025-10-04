/**
 * Cliente Supabase para la aplicación móvil
 * Maneja la conexión y operaciones con la base de datos
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
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error en test de conexión:', error);
            throw error;
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
            console.error('❌ Error verificando versión:', error);
            // En caso de error, asumir que no necesita actualización para evitar descargas innecesarias
            return { necesitaActualizacion: false, versionRemota: null, versionLocal: null };
        }
    }

    /**
     * Actualiza la versión local después de sincronizar (guarda hash, igual que PC)
     */
    async actualizarVersionLocal(versionRemota) {
        try {
            if (versionRemota && versionRemota.version_hash) {
                await window.storageManager.saveConfig('version_hash_local', versionRemota.version_hash);
                console.log('✅ Versión local actualizada:', versionRemota.version_hash.substring(0, 8) + '...');
            }
        } catch (error) {
            console.error('❌ Error actualizando versión local:', error);
        }
    }

    /**
     * Descarga todos los productos desde Supabase
     */
    async downloadProducts(onProgress = null) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

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
     * Descarga códigos secundarios desde Supabase
     */
    async downloadSecondaryCodes(onProgress = null) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

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
     * Genera un código único de 6 dígitos
     */
    generateUniqueCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Verifica si un código ya existe en la base de datos
     */
    async checkCodeExists(code) {
        try {
            const { data, error } = await this.client
                .from('listas_temporales')
                .select('codigo_acceso')
                .eq('codigo_acceso', code)
                .eq('estado', 'activa')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw error;
            }

            return data !== null;
        } catch (error) {
            console.error('Error al verificar código:', error);
            return false;
        }
    }

    /**
     * Genera un código único verificando que no exista
     */
    async generateVerifiedCode() {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const code = this.generateUniqueCode();
            const exists = await this.checkCodeExists(code);
            
            if (!exists) {
                return code;
            }
            
            attempts++;
        }

        throw new Error('No se pudo generar un código único después de varios intentos');
    }

    /**
     * Sube una lista temporal a Supabase
     */
    async uploadTemporaryList(listData) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

            // Generar código único
            const codigoAcceso = await this.generateVerifiedCode();
            
            // Calcular fecha de expiración (24 horas)
            const fechaExpiracion = new Date();
            fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);

            // Crear lista temporal
            const { data: lista, error: errorLista } = await this.client
                .from('listas_temporales')
                .insert({
                    codigo_acceso: codigoAcceso,
                    nombre_lista: listData.nombre || `Lista ${new Date().toLocaleDateString()}`,
                    usuario_movil: listData.usuario || 'Usuario Móvil',
                    fecha_expiracion: fechaExpiracion.toISOString(),
                    estado: 'activa'
                })
                .select()
                .single();

            if (errorLista) throw errorLista;

            // Insertar productos de la lista
            const productosLista = listData.productos.map(producto => ({
                lista_id: lista.id,
                codigo_producto: producto.codigo,
                cantidad: producto.cantidad || 1,
                notas: producto.notas || null
            }));

            const { error: errorProductos } = await this.client
                .from('productos_lista_temporal')
                .insert(productosLista);

            if (errorProductos) throw errorProductos;

            console.log(`✅ Lista subida con código: ${codigoAcceso}`);
            
            return {
                codigo: codigoAcceso,
                listaId: lista.id,
                fechaExpiracion: fechaExpiracion,
                productosCount: productosLista.length
            };

        } catch (error) {
            console.error('❌ Error al subir lista temporal:', error);
            throw error;
        }
    }

    /**
     * Obtiene una lista temporal por código
     */
    async getTemporaryList(codigo) {
        try {
            if (!this.isConnected) {
                throw new Error('No hay conexión con Supabase');
            }

            // Buscar lista por código
            const { data: lista, error: errorLista } = await this.client
                .from('listas_temporales')
                .select('*')
                .eq('codigo_acceso', codigo)
                .eq('estado', 'activa')
                .single();

            if (errorLista) {
                if (errorLista.code === 'PGRST116') {
                    throw new Error('Código no encontrado o expirado');
                }
                throw errorLista;
            }

            // Verificar si no ha expirado
            const ahora = new Date();
            const expiracion = new Date(lista.fecha_expiracion);
            
            if (ahora > expiracion) {
                // Marcar como expirada
                await this.client
                    .from('listas_temporales')
                    .update({ estado: 'expirada' })
                    .eq('id', lista.id);
                
                throw new Error('El código ha expirado');
            }

            // Obtener productos de la lista
            const { data: productos, error: errorProductos } = await this.client
                .from('productos_lista_temporal')
                .select('codigo_producto, cantidad, notas')
                .eq('lista_id', lista.id);

            if (errorProductos) throw errorProductos;

            // Incrementar contador de descargas
            await this.client
                .from('listas_temporales')
                .update({ 
                    descargas_count: lista.descargas_count + 1,
                    estado: 'descargada'
                })
                .eq('id', lista.id);

            return {
                lista: lista,
                productos: productos
            };

        } catch (error) {
            console.error('❌ Error al obtener lista temporal:', error);
            throw error;
        }
    }

    /**
     * Limpia listas temporales expiradas
     */
    async cleanupExpiredLists() {
        try {
            if (!this.isConnected) {
                return;
            }

            const ahora = new Date().toISOString();

            // Marcar listas expiradas
            const { error } = await this.client
                .from('listas_temporales')
                .update({ estado: 'expirada' })
                .lt('fecha_expiracion', ahora)
                .eq('estado', 'activa');

            if (error) throw error;

            console.log('🧹 Limpieza de listas expiradas completada');
        } catch (error) {
            console.error('❌ Error en limpieza de listas:', error);
        }
    }
}

// Instancia global del cliente Supabase
window.supabaseClient = new SupabaseClient();
