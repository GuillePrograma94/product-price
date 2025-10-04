@echo off
echo Creando keystore para Labels Productos...
echo.
echo IMPORTANTE: Guarda bien la contraseña que uses, la necesitaras para futuras actualizaciones
echo.

"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore labels-productos-release.keystore -alias labels-productos -keyalg RSA -keysize 2048 -validity 10000

echo.
echo Keystore creado exitosamente!
echo Archivo: labels-productos-release.keystore
echo Alias: labels-productos
echo.
pause
