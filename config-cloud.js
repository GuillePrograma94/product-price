// Configuración para PWA en la nube
// Este archivo se usa cuando la app está desplegada en Netlify/Vercel

async function loadSupabaseConfig() {
    try {
        // En producción, usar variables de entorno
        const supabaseUrl = process.env.SUPABASE_URL || window.location.origin.includes('netlify') 
            ? 'https://tu-proyecto-supabase.supabase.co' 
            : 'https://tu-proyecto-supabase.supabase.co';
            
        const supabaseKey = process.env.SUPABASE_ANON_KEY || window.location.origin.includes('netlify')
            ? 'tu-clave-anonima-aqui'
            : 'tu-clave-anonima-aqui';

        return {
            supabaseUrl: supabaseUrl,
            supabaseKey: supabaseKey,
            environment: 'production'
        };
    } catch (error) {
        console.error('Error cargando configuración:', error);
        throw error;
    }
}

// Exportar para uso en otros módulos
window.loadSupabaseConfig = loadSupabaseConfig;
