<?php
/**
 * API endpoint para obtener configuración de Supabase
 * Lee las variables de entorno y las devuelve de forma segura
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Solo permitir método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    // Cargar variables de entorno desde el archivo .env del proyecto principal
    $envFile = __DIR__ . '/../../.env';
    
    if (!file_exists($envFile)) {
        throw new Exception('Archivo .env no encontrado');
    }
    
    // Leer y parsear el archivo .env
    $envVars = [];
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Ignorar comentarios
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parsear líneas con formato KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remover comillas si existen
            $value = trim($value, '"\'');
            
            $envVars[$key] = $value;
        }
    }
    
    // Verificar que las variables necesarias existen
    if (!isset($envVars['SUPABASE_URL']) || !isset($envVars['SUPABASE_ANON_KEY'])) {
        throw new Exception('Variables SUPABASE_URL y SUPABASE_ANON_KEY no encontradas en .env');
    }
    
    // Devolver solo las variables necesarias
    $config = [
        'SUPABASE_URL' => $envVars['SUPABASE_URL'],
        'SUPABASE_ANON_KEY' => $envVars['SUPABASE_ANON_KEY']
    ];
    
    echo json_encode($config);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al cargar configuración',
        'message' => $e->getMessage()
    ]);
}
?>
