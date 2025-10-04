#!/bin/bash
# Script para sincronizar archivos fuente hacia carpeta www

echo "🔄 Sincronizando archivos hacia carpeta www..."

# Crear carpeta www si no existe
mkdir -p www

# Copiar archivos principales
cp index.html www/
cp styles.css www/
cp manifest.json www/
cp package.json www/
cp package-lock.json www/
cp capacitor.config.json www/
cp config-apk.js www/
cp config-cloud.js www/
cp config.js www/
cp icon-192.png www/
cp icon-512.png www/

# Copiar carpeta js completa
cp -r js/ www/

echo "✅ Sincronización completada"
echo "📱 La carpeta www está lista para generar APK"
