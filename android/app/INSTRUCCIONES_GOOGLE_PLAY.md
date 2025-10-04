# 📱 GUÍA PARA PUBLICAR EN GOOGLE PLAY STORE

## 🔐 Paso 1: Crear Keystore

1. **Ejecutar el script de creación:**
   ```bash
   create_keystore.bat
   ```

2. **Completar la información solicitada:**
   - Contraseña del keystore (mínimo 6 caracteres)
   - Confirmar contraseña
   - Nombre completo: Tu nombre
   - Unidad organizacional: Tu empresa
   - Ciudad: Tu ciudad
   - Estado/Provincia: Tu estado
   - Código de país: ES (para España)

3. **Guardar bien la contraseña** - la necesitarás para futuras actualizaciones

## ⚙️ Paso 2: Configurar Contraseñas

1. **Editar `keystore.properties`:**
   ```
   KEYSTORE_PASSWORD=tu_password_real_aqui
   KEY_PASSWORD=tu_password_real_aqui
   ```

## 🏗️ Paso 3: Generar APK de Release

1. **Ejecutar el build:**
   ```bash
   build_release.bat
   ```

2. **Verificar que se generó correctamente:**
   - Archivo: `build/outputs/apk/release/app-release.apk`
   - Tamaño: Debe ser varios MB
   - Firmada: Verificar con `keytool -printcert`

## 📋 Paso 4: Preparar para Google Play

### Información necesaria:
- **Nombre:** Labels Productos
- **Descripción:** Aplicación móvil para crear listas de productos y generar códigos de acceso que pueden ser utilizados en la aplicación de escritorio
- **Categoría:** Productividad
- **Capturas:** Mínimo 2 por dispositivo (teléfono, tablet)
- **Icono:** Ya tienes (192x192, 512x512)

### Política de Privacidad:
Necesitas crear una política de privacidad que mencione:
- Uso de cámara para escanear códigos de barras
- Conexión a internet para sincronizar datos
- Almacenamiento local de listas de productos

## 🚀 Paso 5: Subir a Google Play Console

1. **Crear cuenta de desarrollador** ($25 USD)
2. **Crear nueva aplicación**
3. **Subir APK/AAB**
4. **Completar información de la tienda**
5. **Enviar para revisión**

## ⚠️ IMPORTANTE

- **NUNCA** subas el keystore o contraseñas a control de versiones
- **Guarda** una copia de seguridad del keystore en lugar seguro
- **Usa** la misma contraseña para todas las actualizaciones futuras
- **Prueba** la APK en dispositivos reales antes de publicar

## 🔧 Troubleshooting

### Error: "keystore not found"
- Verifica que `labels-productos-release.keystore` existe en la carpeta `app/`

### Error: "password incorrect"
- Verifica las contraseñas en `keystore.properties`

### Error: "build failed"
- Ejecuta `gradlew clean` antes del build
- Verifica que Android Studio esté instalado

## 📞 Soporte

Si tienes problemas, revisa:
1. Que Java esté instalado (Android Studio incluye Java)
2. Que las contraseñas sean correctas
3. Que el keystore se haya creado correctamente
