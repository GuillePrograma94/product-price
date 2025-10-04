/**
 * Configuración para APK - Credenciales incluidas
 * Este archivo reemplaza config.js cuando se compila la APK
 */

// Configuración de Supabase (incluida directamente en la APK)
const SUPABASE_CONFIG = {
    url: 'https://wjgybvkmqdletwfnbrce.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3lidmttcWRsZXR3Zm5icmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjI5MDUsImV4cCI6MjA3Mzc5ODkwNX0.Sr3frQZJU-HYCBeFQ5QmAAI7MqOG0bMRStuWb_a0WMc'
};

// Función para cargar configuración (para APK no necesita servidor)
async function loadSupabaseConfig() {
    try {
        console.log('✅ Configuración de Supabase cargada desde APK:', {
            url: SUPABASE_CONFIG.url ? 'Configurada ✅' : 'Faltante ❌',
            key: SUPABASE_CONFIG.anonKey ? 'Configurada ✅' : 'Faltante ❌'
        });
        return true;
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        return false;
    }
}

// Exportar configuración para uso global
window.CONFIG = {
    SUPABASE: SUPABASE_CONFIG,
    loadSupabaseConfig: loadSupabaseConfig
};

console.log('🔧 Configuración APK cargada');
