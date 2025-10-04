# Labels Productos - Aplicación Móvil

Aplicación web móvil para crear listas de productos y generar códigos de acceso que pueden ser utilizados en la aplicación de escritorio.

## 🚀 Características

- **📱 PWA (Progressive Web App)**: Instalable como aplicación nativa
- **🔍 Búsqueda inteligente**: Busca por código, descripción o código secundario
- **📋 Gestión de listas**: Crea y gestiona listas de productos fácilmente
- **🔢 Códigos únicos**: Genera códigos de 6 dígitos para sincronizar con PC
- **💾 Trabajo offline**: Funciona sin conexión una vez sincronizado
- **⚡ Sincronización automática**: Se mantiene actualizado con Supabase
- **📊 Interface responsive**: Optimizada para móviles y tablets

## 🛠️ Instalación y Configuración

### 1. Configurar Supabase

Antes de usar la aplicación, necesitas configurar tu proyecto Supabase:

1. **Crear las tablas necesarias** (si no las tienes):
   ```sql
   -- Ejecutar en el SQL Editor de Supabase
   
   -- Tabla para listas temporales
   CREATE TABLE listas_temporales (
       id SERIAL PRIMARY KEY,
       codigo_acceso CHAR(6) UNIQUE NOT NULL,
       nombre_lista TEXT NOT NULL,
       usuario_movil TEXT,
       fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       fecha_expiracion TIMESTAMP WITH TIME ZONE,
       estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'descargada', 'expirada')),
       descargas_count INTEGER DEFAULT 0
   );

   -- Tabla para productos de las listas temporales
   CREATE TABLE productos_lista_temporal (
       id SERIAL PRIMARY KEY,
       lista_id INTEGER REFERENCES listas_temporales(id) ON DELETE CASCADE,
       codigo_producto TEXT NOT NULL,
       cantidad INTEGER DEFAULT 1,
       notas TEXT,
       fecha_agregado TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índices para optimización
   CREATE INDEX idx_listas_codigo ON listas_temporales(codigo_acceso);
   CREATE INDEX idx_listas_estado ON listas_temporales(estado);
   CREATE INDEX idx_productos_lista ON productos_lista_temporal(lista_id);
   ```

2. **Obtener credenciales** de tu proyecto Supabase:
   - Ve a Settings → API en tu proyecto Supabase
   - Copia la **Project URL** y **anon public key**

### 2. Configurar la Aplicación

1. **Verificar archivo .env**:
   La aplicación lee automáticamente las variables de entorno desde el archivo `.env` del proyecto principal:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-clave-anonima-aqui
   ```

2. **Configurar servidor web**:
   La aplicación necesita un servidor que soporte PHP o Python para servir la API de configuración.
   
   **Para PHP** (Apache/Nginx):
   - Asegúrate de que PHP esté habilitado
   - El archivo `.htaccess` está incluido para Apache
   
   **Para Python** (servidor de desarrollo):
   - Usa el script `config.py` como CGI
   - O configura tu servidor web para ejecutar Python

### 3. Desplegar la Aplicación

#### Opción A: Servidor Web Local
```bash
# Usar cualquier servidor web estático
python -m http.server 8000
# o
npx serve .
# o
php -S localhost:8000
```

#### Opción B: Netlify/Vercel
1. Subir los archivos a tu repositorio Git
2. Conectar con Netlify o Vercel
3. Desplegar automáticamente

#### Opción C: GitHub Pages
1. Subir a un repositorio GitHub
2. Habilitar GitHub Pages en la configuración
3. Acceder desde `https://tu-usuario.github.io/tu-repo`

## 📱 Uso de la Aplicación

### 1. Primera Vez
1. **Abrir la aplicación** en el navegador móvil
2. **Esperar sincronización**: La app descargará el catálogo de productos
3. **Instalar como PWA** (opcional): "Añadir a pantalla de inicio"

### 2. Crear una Lista
1. **Buscar productos**: Usar la barra de búsqueda
2. **Añadir a lista**: Tocar "➕ Añadir a lista" en cada producto
3. **Ajustar cantidades**: Usar los botones + y - en la lista
4. **Generar código**: Tocar "📤 Generar Código"
5. **Compartir código**: Copiar o compartir el código de 6 dígitos

### 3. Usar en PC
1. **Abrir aplicación PC**: Labels Productos
2. **Introducir código**: Escribir el código de 6 dígitos
3. **Descargar lista**: La lista se añadirá automáticamente
4. **Trabajar normalmente**: Imprimir etiquetas como siempre

## 🔧 Configuración Avanzada

### Personalizar Configuración
```javascript
// En config.js puedes modificar:

const APP_CONFIG = {
    sync: {
        autoSyncInterval: 240,  // Minutos entre sincronizaciones
        batchSize: 1000,        // Productos por lote
        maxRetries: 3           // Reintentos en caso de error
    },
    
    search: {
        minSearchLength: 2,     // Mínimo caracteres para buscar
        maxResults: 50,         // Máximo resultados mostrados
        debounceDelay: 300      // Delay para búsqueda en tiempo real
    },
    
    temporaryLists: {
        expirationHours: 24,    // Horas antes de expirar listas
        maxProductsPerList: 100 // Máximo productos por lista
    }
};
```

### Configurar PWA
```json
// Personalizar manifest.json
{
    "name": "Tu Nombre de App",
    "short_name": "Tu App",
    "theme_color": "#tu-color",
    "background_color": "#tu-color-fondo"
}
```

## 🛠️ Desarrollo

### Estructura del Proyecto
```
mobile_web_app/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── manifest.json       # Configuración PWA
├── config.js          # Configuración de la app
├── js/
│   ├── app.js         # Aplicación principal
│   ├── ui.js          # Gestión de interfaz
│   ├── storage.js     # Almacenamiento local
│   └── supabase.js    # Cliente Supabase
└── README.md          # Esta documentación
```

### Tecnologías Utilizadas
- **HTML5**: Estructura semántica
- **CSS3**: Diseño responsive con CSS Grid/Flexbox
- **JavaScript ES6+**: Lógica de aplicación
- **IndexedDB**: Almacenamiento local
- **Supabase**: Base de datos en la nube
- **PWA**: Capacidades de aplicación nativa

### Debugging
```javascript
// Habilitar modo debug en config.js
const ENV_CONFIG = {
    development: {
        debug: true,
        logLevel: 'debug'
    }
};
```

## 🔒 Seguridad y Privacidad

### Datos Almacenados
- **Localmente**: Catálogo de productos, configuración, listas temporales
- **En Supabase**: Solo listas temporales con códigos de acceso
- **No se almacena**: Información personal o sensible

### Códigos de Acceso
- **Únicos**: Cada código es verificado como único
- **Temporales**: Expiran automáticamente en 24 horas
- **Seguros**: 6 dígitos proporcionan 1 millón de combinaciones

### Trabajo Offline
- **Datos locales**: Se mantienen en IndexedDB del navegador
- **Sincronización**: Solo cuando hay conexión
- **Fallback**: Funciona completamente offline una vez sincronizado

## 🚨 Solución de Problemas

### Error de Conexión
```
❌ Error al conectar con Supabase
```
**Solución**: Verificar credenciales en `config.js` y conexión a internet

### No Carga Productos
```
⚠️ No hay datos disponibles
```
**Solución**: 
1. Verificar que las tablas existen en Supabase
2. Verificar que hay productos en la tabla `productos`
3. Comprobar permisos de lectura en Supabase

### Código No Funciona en PC
```
❌ Código no encontrado
```
**Solución**:
1. Verificar que el código se generó correctamente
2. Comprobar que no ha expirado (24 horas)
3. Verificar conexión de la aplicación PC con Supabase

### App No Se Instala como PWA
**Solución**:
1. Servir desde HTTPS (no HTTP)
2. Verificar que `manifest.json` es válido
3. Comprobar que todos los iconos existen

## 📞 Soporte

### Logs de Debug
```javascript
// Abrir DevTools (F12) y revisar:
console.log(window.mobileApp.getAppStats());
console.log(await window.storageManager.getStorageStats());
```

### Limpiar Datos
```javascript
// En caso de problemas, limpiar datos locales:
await window.storageManager.clearAllData();
location.reload();
```

### Verificar Configuración
```javascript
// Verificar configuración actual:
console.log(window.CONFIG);
```

## 🔄 Actualizaciones

La aplicación se actualiza automáticamente cuando:
1. Se recarga la página
2. Se detecta una nueva versión del Service Worker
3. Se reinstala como PWA

Para forzar actualización:
1. Recargar la página (pull to refresh)
2. Reinstalar la PWA
3. Limpiar caché del navegador

## 📄 Licencia

Este proyecto está bajo la misma licencia que el proyecto principal Labels Productos.

---

**¿Necesitas ayuda?** Revisa los logs de la consola del navegador o contacta al desarrollador del sistema.
