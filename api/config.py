#!/usr/bin/env python3
"""
API endpoint para obtener configuración de Supabase
Lee las variables de entorno y las devuelve de forma segura
"""

import os
import json
import sys
from pathlib import Path

def load_env_file(env_path):
    """Carga variables de entorno desde archivo .env"""
    env_vars = {}
    
    if not env_path.exists():
        raise FileNotFoundError(f"Archivo .env no encontrado en {env_path}")
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Ignorar comentarios y líneas vacías
            if not line or line.startswith('#'):
                continue
            
            # Parsear líneas con formato KEY=VALUE
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Remover comillas si existen
                value = value.strip('"\'')
                
                env_vars[key] = value
    
    return env_vars

def main():
    """Función principal del endpoint"""
    try:
        # Headers para CORS y JSON
        print("Content-Type: application/json")
        print("Access-Control-Allow-Origin: *")
        print("Access-Control-Allow-Methods: GET")
        print("Access-Control-Allow-Headers: Content-Type")
        print()  # Línea vacía requerida después de headers
        
        # Verificar método
        request_method = os.environ.get('REQUEST_METHOD', 'GET')
        if request_method != 'GET':
            print(json.dumps({'error': 'Método no permitido'}))
            sys.exit(1)
        
        # Buscar archivo .env en el directorio padre del proyecto
        current_dir = Path(__file__).parent
        env_file = current_dir.parent.parent / '.env'
        
        # Cargar variables de entorno
        env_vars = load_env_file(env_file)
        
        # Verificar que las variables necesarias existen
        required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
        missing_vars = [var for var in required_vars if var not in env_vars]
        
        if missing_vars:
            raise ValueError(f"Variables faltantes en .env: {', '.join(missing_vars)}")
        
        # Devolver solo las variables necesarias
        config = {
            'SUPABASE_URL': env_vars['SUPABASE_URL'],
            'SUPABASE_ANON_KEY': env_vars['SUPABASE_ANON_KEY']
        }
        
        print(json.dumps(config))
        
    except Exception as e:
        error_response = {
            'error': 'Error al cargar configuración',
            'message': str(e)
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
