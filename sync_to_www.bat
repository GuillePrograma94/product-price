@echo off
echo 🔄 Sincronizando archivos hacia carpeta www...

REM Crear carpeta www si no existe
if not exist www mkdir www

REM Copiar archivos principales
copy index.html www\
copy styles.css www\
copy manifest.json www\
copy package.json www\
copy package-lock.json www\
copy capacitor.config.json www\
copy config-apk.js www\
copy config-cloud.js www\
copy config.js www\
copy icon-192.png www\
copy icon-512.png www\

REM Copiar carpeta js completa
xcopy js www\js\ /E /I /Y

echo ✅ Sincronización completada
echo 📱 La carpeta www está lista para generar APK
pause
