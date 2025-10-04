# 📱 Crear APK de Labels Productos Móvil

## Opción 1: PWA (Recomendada) 🌟

### Pasos para instalar como PWA:

1. **Ejecutar servidor local:**
   ```bash
   python start_mobile_server.py
   ```

2. **En tu Android:**
   - Conectar a la misma WiFi que el PC
   - Abrir Chrome
   - Ir a la URL mostrada (ej: `http://192.168.1.100:8080`)
   - Chrome mostrará "Añadir a pantalla de inicio"
   - ¡Aceptar y ya tienes la app!

### Ventajas de PWA:
- ✅ Instalación instantánea
- ✅ Actualizaciones automáticas
- ✅ Funciona offline
- ✅ Acceso a cámara para escáner
- ✅ Notificaciones push (opcional)

---

## Opción 2: APK Real con Capacitor 📦

Si necesitas una APK real para distribución:

### Requisitos:
- Node.js 16+
- Android Studio
- Java JDK 11+

### Pasos:

1. **Instalar Capacitor:**
   ```bash
   npm install -g @capacitor/cli
   npm install @capacitor/core @capacitor/android
   ```

2. **Inicializar proyecto:**
   ```bash
   npx cap init "Labels Productos" "com.labelsproductos.mobile"
   ```

3. **Añadir plataforma Android:**
   ```bash
   npx cap add android
   ```

4. **Copiar archivos web:**
   ```bash
   npx cap copy android
   ```

5. **Abrir en Android Studio:**
   ```bash
   npx cap open android
   ```

6. **Compilar APK en Android Studio**

### Configuración adicional para APK:

#### capacitor.config.ts:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.labelsproductos.mobile',
  appName: 'Labels Productos',
  webDir: '.',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    }
  }
};

export default config;
```

---

## Opción 3: Servidor en la nube ☁️

### Desplegar en Netlify/Vercel:

1. **Subir código a GitHub**
2. **Conectar con Netlify/Vercel**
3. **Configurar variables de entorno:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. **¡Acceder desde cualquier lugar!**

### URL ejemplo:
`https://labels-productos-mobile.netlify.app`

---

## 🎯 Recomendación

**Para uso personal/empresa pequeña:** Usar **PWA** (Opción 1)
- Más rápido
- Más fácil
- Actualizaciones automáticas
- Funciona igual que una app nativa

**Para distribución masiva:** Usar **APK** (Opción 2)
- Disponible en Play Store
- Mayor confianza del usuario
- Control total sobre distribución

---

## 🔧 Troubleshooting

### Problema: "No se puede conectar"
- Verificar que Android y PC estén en la misma WiFi
- Verificar que el firewall no bloquee el puerto 8080
- Probar con la IP mostrada en el servidor

### Problema: "PWA no se instala"
- Usar Chrome (no otros navegadores)
- Verificar que la página cargue completamente
- Recargar la página si no aparece la opción

### Problema: "Cámara no funciona"
- Dar permisos de cámara al navegador
- Usar HTTPS (el servidor local usa HTTP pero Chrome permite cámara en localhost)
