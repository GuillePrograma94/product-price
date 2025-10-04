#!/usr/bin/env python3
"""
Script para probar la aplicación móvil localmente
Sirve la aplicación y verifica que todo funcione correctamente
"""

import os
import sys
import http.server
import socketserver
import webbrowser
import threading
import time
from pathlib import Path

def check_env_file():
    """Verifica que el archivo .env existe y tiene las variables necesarias"""
    env_path = Path(__file__).parent.parent / '.env'
    
    if not env_path.exists():
        print("❌ Archivo .env no encontrado")
        print("📝 Creando .env desde supabase_config_example.env...")
        
        example_path = Path(__file__).parent.parent / 'supabase_config_example.env'
        if example_path.exists():
            # Copiar archivo ejemplo
            with open(example_path, 'r') as f:
                content = f.read()
            
            # Usar credenciales del código si están disponibles
            content = content.replace(
                'SUPABASE_URL=https://tu-proyecto.supabase.co',
                'SUPABASE_URL=https://wjgybvkmqdletwfnbrce.supabase.co'
            )
            content = content.replace(
                'SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tu-clave-anonima-aqui',
                'SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3lidmttcWRsZXR3Zm5icmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjI5MDUsImV4cCI6MjA3Mzc5ODkwNX0.Sr3frQZJU-HYCBeFQ5QmAAI7MqOG0bMRStuWb_a0WMc'
            )
            
            # Verificar que las URLs no estén malformadas
            if 'SUPABASE_URL=https://.' in content:
                content = content.replace(
                    'SUPABASE_URL=https://.',
                    'SUPABASE_URL=https://wjgybvkmqdletwfnbrce.supabase.co'
                )
            
            with open(env_path, 'w') as f:
                f.write(content)
            
            print("✅ Archivo .env creado con credenciales")
        else:
            print("❌ Archivo supabase_config_example.env no encontrado")
            return False
    
    # Verificar contenido
    try:
        with open(env_path, 'r') as f:
            content = f.read()
            
        if 'SUPABASE_URL=' in content and 'SUPABASE_ANON_KEY=' in content:
            print("✅ Archivo .env configurado correctamente")
            return True
        else:
            print("❌ Archivo .env no tiene las variables necesarias")
            return False
    except Exception as e:
        print(f"❌ Error al leer .env: {e}")
        return False

def check_supabase_tables():
    """Verifica que las tablas de Supabase existen"""
    try:
        # Importar después de verificar .env
        sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
        from data.supabase_manager import SupabaseManager
        
        print("🔄 Verificando conexión con Supabase...")
        supabase = SupabaseManager(silent_mode=True)
        
        # Probar conexión básica
        productos = supabase.descargar_productos()
        print(f"✅ Conexión exitosa - {len(productos)} productos encontrados")
        
        # Verificar si existen las tablas móviles
        try:
            result = supabase.client.table('listas_temporales').select('count').limit(1).execute()
            print("✅ Tablas móviles configuradas correctamente")
        except Exception as e:
            print("⚠️ Tablas móviles no encontradas")
            print("📝 Ejecuta mobile_web_app/setup_mobile_tables.sql en Supabase")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error de conexión con Supabase: {e}")
        print("📝 Verifica las credenciales en .env")
        return False

class ConfigHandler(http.server.SimpleHTTPRequestHandler):
    """Handler personalizado para servir la API de configuración"""
    
    def do_GET(self):
        if self.path == '/api/config':
            self.serve_config()
        else:
            super().do_GET()
    
    def serve_config(self):
        """Sirve la configuración de Supabase"""
        try:
            # Leer .env
            env_path = Path(__file__).parent.parent / '.env'
            config = {}
            
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"\'')
                        config[key] = value
            
            # Responder con JSON
            response = {
                'SUPABASE_URL': config.get('SUPABASE_URL', ''),
                'SUPABASE_ANON_KEY': config.get('SUPABASE_ANON_KEY', '')
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            import json
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            import json
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode())

def start_server(port=8000):
    """Inicia el servidor web"""
    mobile_app_dir = Path(__file__).parent
    os.chdir(mobile_app_dir)
    
    handler = ConfigHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"🌐 Servidor iniciado en http://localhost:{port}")
            print("📱 Aplicación móvil disponible en el navegador")
            print("⏹️ Presiona Ctrl+C para detener el servidor")
            
            # Abrir navegador automáticamente
            def open_browser():
                time.sleep(1)
                webbrowser.open(f'http://localhost:{port}')
            
            threading.Thread(target=open_browser, daemon=True).start()
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Puerto {port} ya está en uso")
            print(f"💡 Intenta con otro puerto: python test_local.py {port + 1}")
        else:
            print(f"❌ Error al iniciar servidor: {e}")

def main():
    """Función principal"""
    print("🧪 Probando aplicación móvil localmente")
    print("=" * 50)
    
    # Verificar archivo .env
    if not check_env_file():
        print("\n❌ No se pudo configurar el archivo .env")
        return
    
    # Verificar conexión Supabase
    if not check_supabase_tables():
        print("\n⚠️ Problemas con Supabase, pero continuando...")
        print("💡 La app funcionará en modo offline si hay datos locales")
    
    print("\n🚀 Iniciando servidor de desarrollo...")
    
    # Obtener puerto de argumentos
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Puerto inválido, usando 8000")
    
    start_server(port)

if __name__ == '__main__':
    main()
