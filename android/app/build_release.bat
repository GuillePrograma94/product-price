@echo off
echo ========================================
echo    BUILD APK RELEASE - LABELS PRODUCTOS
echo ========================================
echo.

REM Verificar que existe el keystore
if not exist "labels-productos-release.keystore" (
    echo ERROR: No se encontro el keystore!
    echo Ejecuta primero: create_keystore.bat
    pause
    exit /b 1
)

REM Verificar que existe el archivo de propiedades
if not exist "keystore.properties" (
    echo ERROR: No se encontro keystore.properties!
    echo Edita el archivo keystore.properties con tus contraseñas
    pause
    exit /b 1
)

echo Limpiando build anterior...
call gradlew clean

echo.
echo Compilando APK de release...
call gradlew assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    BUILD EXITOSO!
    echo ========================================
    echo.
    echo APK generada en: build\outputs\apk\release\
    echo.
    echo Archivos generados:
    dir build\outputs\apk\release\*.apk
    echo.
    echo Listo para subir a Google Play Store!
) else (
    echo.
    echo ========================================
    echo    ERROR EN BUILD
    echo ========================================
    echo.
    echo Revisa los errores anteriores
)

echo.
pause
