/**
 * Test de configuración de Supabase para Labels Reader
 * Este archivo verifica que la configuración se esté cargando correctamente
 */

console.log('🧪 Iniciando test de configuración...');

// Verificar que los scripts se hayan cargado
console.log('📦 Verificando scripts cargados:');
console.log('- Supabase:', typeof supabase !== 'undefined' ? '✅' : '❌');
console.log('- CONFIG:', typeof window.CONFIG !== 'undefined' ? '✅' : '❌');
console.log('- supabaseClient:', typeof window.supabaseClient !== 'undefined' ? '✅' : '❌');
console.log('- storageManager:', typeof window.storageManager !== 'undefined' ? '✅' : '❌');

// Verificar configuración de Supabase
if (window.CONFIG && window.CONFIG.SUPABASE) {
    console.log('🔧 Configuración de Supabase:');
    console.log('- URL:', window.CONFIG.SUPABASE.url ? '✅ Configurada' : '❌ Faltante');
    console.log('- Key:', window.CONFIG.SUPABASE.anonKey ? '✅ Configurada' : '❌ Faltante');
    
    if (window.CONFIG.SUPABASE.url && window.CONFIG.SUPABASE.anonKey) {
        console.log('✅ Configuración completa');
        
        // Probar conexión
        testSupabaseConnection();
    } else {
        console.error('❌ Configuración incompleta');
    }
} else {
    console.error('❌ CONFIG.SUPABASE no encontrado');
}

async function testSupabaseConnection() {
    try {
        console.log('🔗 Probando conexión con Supabase...');
        
        // Crear cliente temporal para probar
        const testClient = supabase.createClient(
            window.CONFIG.SUPABASE.url,
            window.CONFIG.SUPABASE.anonKey
        );
        
        // Probar conexión con una consulta simple
        const { data, error } = await testClient
            .from('productos')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Error de conexión:', error);
        } else {
            console.log('✅ Conexión exitosa con Supabase');
            console.log('📊 Datos recibidos:', data);
        }
        
    } catch (error) {
        console.error('❌ Error al probar conexión:', error);
    }
}

// Ejecutar test cuando la página esté cargada
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🎯 Test de configuración completado');
        }, 1000);
    });
} else {
    setTimeout(() => {
        console.log('🎯 Test de configuración completado');
    }, 1000);
}
