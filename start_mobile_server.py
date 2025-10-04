#!/usr/bin/env python3
"""
Servidor para la aplicación móvil PWA
Permite acceso desde dispositivos móviles en la red local
"""

import http.server
import socketserver
import os
import sys
import socket
import json
from pathlib import Path

# Configuración
PORT = 8080
DIRECTORY = Path(__file__).parent

class MobileHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler personalizado para la aplicación móvil"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Añadir headers para PWA
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Headers para CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Headers para PWA
        if self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json')
        
        super().end_headers()
    
    def do_GET(self):
        # Manejar la API de configuración
        if self.path == '/api/config':
            self.handle_config_api()
            return
        
        # Servir archivos estáticos
        super().do_GET()
    
    def handle_config_api(self):
        """Maneja la API de configuración de Supabase"""
        try:
            # Intentar cargar configuración desde el archivo .env
            env_file = DIRECTORY.parent / '.env'
            config = {
                'SUPABASE_URL': '',
                'SUPABASE_ANON_KEY': ''
            }
            
            if env_file.exists():
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            if '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip().strip('"\'')
                                if key in config:
                                    config[key] = value
            
            # Responder con la configuración
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = json.dumps(config)
            self.wfile.write(response.encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_response = json.dumps({'error': str(e)})
            self.wfile.write(error_response.encode())


def get_local_ip():
    """Obtiene la IP local de la máquina"""
    try:
        # Conectar a una dirección externa para obtener la IP local
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def main():
    """Función principal"""
    print("🚀 SERVIDOR PWA PARA MÓVIL - Labels Productos")
    print("=" * 60)
    
    # Cambiar al directorio de la aplicación móvil
    os.chdir(DIRECTORY)
    
    # Obtener IPs
    local_ip = get_local_ip()
    
    # Crear servidor
    with socketserver.TCPServer(("", PORT), MobileHTTPRequestHandler) as httpd:
        print(f"📱 Servidor iniciado en puerto {PORT}")
        print()
        print("🌐 URLs de acceso:")
        print(f"   • Local:    http://localhost:{PORT}")
        print(f"   • Red:      http://{local_ip}:{PORT}")
        print()
        print("📋 INSTRUCCIONES PARA ANDROID:")
        print("=" * 40)
        print("1. Conecta tu Android a la MISMA WiFi que este PC")
        print(f"2. Abre Chrome en Android y ve a: http://{local_ip}:{PORT}")
        print("3. Chrome te preguntará 'Añadir a pantalla de inicio'")
        print("4. ¡Acepta y ya tienes la app instalada!")
        print()
        print("🔧 FUNCIONALIDADES:")
        print("   ✅ PWA instalable")
        print("   ✅ Funciona offline")
        print("   ✅ Escáner de códigos de barras")
        print("   ✅ Generación de códigos con barcode")
        print("   ✅ Sincronización con Supabase")
        print()
        print("⏹️  Presiona Ctrl+C para detener el servidor")
        print("=" * 60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido")
            print("¡Gracias por usar Labels Productos Móvil!")


if __name__ == "__main__":
    main()
