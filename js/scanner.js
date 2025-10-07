/**
 * Escáner de códigos de barras para la aplicación móvil
 * Utiliza la API de getUserMedia y ZXing para detectar códigos
 */

class BarcodeScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.video = null;
        this.codeReader = null;
        this.currentCamera = 'environment'; // 'user' o 'environment'
        this.hasFlash = false;
        this.flashEnabled = false;
        
        // Elementos DOM
        this.elements = {};
        
        // Inicializar ZXing
        this.initializeZXing();
    }

    /**
     * Inicializa la librería ZXing
     */
    async initializeZXing() {
        try {
            // Cargar ZXing dinámicamente
            if (!window.ZXing) {
                await this.loadZXingLibrary();
            }
            
            this.codeReader = new ZXing.BrowserMultiFormatReader();
            console.log('✅ ZXing inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar ZXing:', error);
        }
    }

    /**
     * Carga la librería ZXing dinámicamente
     */
    loadZXingLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializa los elementos DOM
     */
    initializeElements() {
        this.elements = {
            scannerModal: document.getElementById('scannerModal'),
            closeScannerBtn: document.getElementById('closeScannerBtn'),
            scannerVideo: document.getElementById('scannerVideo'),
            scannerResult: document.getElementById('scannerResult'),
            detectedCode: document.getElementById('detectedCode'),
            searchDetectedBtn: document.getElementById('searchDetectedBtn')
        };
        
        // Validar que todos los elementos estén disponibles
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
            
        if (missingElements.length > 0) {
            console.error('❌ Elementos del escáner no encontrados:', missingElements);
        } else {
            console.log('✅ Todos los elementos del escáner encontrados');
        }
    }

    /**
     * Vincula los eventos
     */
    bindEvents() {
        // Cerrar modal
        this.elements.closeScannerBtn.addEventListener('click', () => this.closeScanner());
        
        // Buscar código detectado
        this.elements.searchDetectedBtn.addEventListener('click', () => this.searchDetectedCode());
        
        // Cerrar modal al hacer clic fuera
        this.elements.scannerModal.addEventListener('click', (e) => {
            if (e.target === this.elements.scannerModal) {
                this.closeScanner();
            }
        });
    }

    /**
     * Abre el escáner
     */
    async openScanner() {
        try {
            // Inicializar elementos si no están inicializados
            if (!this.elements.scannerModal) {
                this.initializeElements();
                this.bindEvents();
            }

            // Verificar soporte de cámara
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a la cámara');
            }

            // Mostrar modal
            this.elements.scannerModal.style.display = 'flex';
            
            // Ocultar resultado anterior
            this.elements.scannerResult.style.display = 'none';
            
            // Iniciar cámara
            await this.startCamera();
            
            // Iniciar escaneo
            this.startScanning();
            
            // window.ui.showToast('Escáner iniciado', 'success'); // Eliminado para mejor UX

        } catch (error) {
            console.error('Error al abrir escáner:', error);
            window.ui.showToast('Error: ' + error.message, 'error');
            this.closeScanner();
        }
    }

    /**
     * Inicia la cámara
     */
    async startCamera() {
        try {
            // Detener stream anterior si existe
            if (this.stream) {
                this.stopCamera();
            }

            // Configurar constraints
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            // Obtener stream de la cámara
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Asignar stream al video
            this.elements.scannerVideo.srcObject = this.stream;
            
            console.log('✅ Cámara iniciada');

        } catch (error) {
            console.error('Error al iniciar cámara:', error);
            
            if (error.name === 'NotAllowedError') {
                throw new Error('Permiso de cámara denegado. Permite el acceso a la cámara.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No se encontró ninguna cámara en el dispositivo.');
            } else {
                throw new Error('Error al acceder a la cámara: ' + error.message);
            }
        }
    }

    /**
     * Detiene la cámara
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.elements.scannerVideo) {
            this.elements.scannerVideo.srcObject = null;
        }
    }

    /**
     * Inicia el escaneo de códigos
     */
    async startScanning() {
        if (!this.codeReader || this.isScanning) return;

        try {
            console.log('📷 Iniciando escaneo...');
            this.isScanning = true;
            
            // Verificar que los elementos estén inicializados
            if (!this.elements.scannerVideo) {
                console.error('❌ scannerVideo no encontrado, reinicializando elementos...');
                this.initializeElements();
                
                if (!this.elements.scannerVideo) {
                    throw new Error('No se pudo encontrar el elemento scannerVideo');
                }
            }
            
            // Verificar que el video esté listo
            if (!this.elements.scannerVideo.srcObject) {
                throw new Error('La cámara no está disponible');
            }
            
            console.log('✅ Elemento scannerVideo encontrado:', this.elements.scannerVideo);
            
            // Esperar a que el video esté listo
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout esperando video'));
                }, 5000);
                
                this.elements.scannerVideo.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    this.elements.scannerVideo.play();
                    resolve();
                };
            });
            
            // Luego iniciar el escaneo con ZXing
            this.codeReader.decodeFromVideoDevice(
                undefined, // deviceId (undefined = usar el stream actual)
                this.elements.scannerVideo,
                (result, error) => {
                    if (result) {
                        // Código detectado
                        this.onCodeDetected(result.text);
                    }
                    
                    if (error && error.name !== 'NotFoundException') {
                        console.warn('Error de escaneo:', error);
                    }
                }
            );
            
            console.log('✅ Escaneo iniciado correctamente');
        } catch (error) {
            console.error('❌ Error al iniciar escaneo:', error);
            this.isScanning = false;
            this.showCameraError();
        }
    }

    /**
     * Obtiene acceso a la cámara
     */
    async getCameraAccess() {
        try {
            console.log('📷 Solicitando acceso a la cámara...');
            
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.elements.scannerVideo.srcObject = this.stream;
            
            // Esperar a que el video esté listo
            await new Promise((resolve) => {
                this.elements.scannerVideo.onloadedmetadata = () => {
                    this.elements.scannerVideo.play();
                    resolve();
                };
            });
            
            console.log('✅ Acceso a cámara obtenido');
        } catch (error) {
            console.error('❌ Error al acceder a la cámara:', error);
            throw error;
        }
    }

    /**
     * Muestra error de cámara
     */
    showCameraError() {
        if (this.elements.scannerResult) {
            this.elements.scannerResult.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--error-color);">
                    <h3>❌ Error de Cámara</h3>
                    <p>No se pudo acceder a la cámara. Verifica los permisos.</p>
                    <button onclick="window.scanner.retryCamera()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            `;
            this.elements.scannerResult.style.display = 'block';
        }
    }

    /**
     * Reintenta el acceso a la cámara
     */
    async retryCamera() {
        try {
            this.elements.scannerResult.style.display = 'none';
            await this.startScanning();
        } catch (error) {
            console.error('❌ Error al reintentar cámara:', error);
        }
    }

    /**
     * Detiene el escaneo
     */
    stopScanning() {
        if (this.codeReader && this.isScanning) {
            this.codeReader.reset();
            this.isScanning = false;
        }
        
        // Detener el stream de la cámara
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Limpiar el video
        if (this.elements.scannerVideo) {
            this.elements.scannerVideo.srcObject = null;
        }
        
        console.log('📷 Escaneo detenido');
    }

    /**
     * Maneja la detección de un código
     */
    onCodeDetected(code) {
        console.log('🎯 Código detectado:', code);
        
        // Detener escaneo
        this.stopScanning();
        
        // Cerrar el modal del escáner inmediatamente
        this.closeScanner();
        
            // Buscar automáticamente el producto
            this.searchProductAutomatically(code);
        
        // Vibración si está disponible
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        
        // Sonido de éxito (opcional)
        this.playSuccessSound();
    }

    /**
     * Busca automáticamente un producto por código
     */
    async searchProductAutomatically(code) {
        try {
            console.log('🔍 Búsqueda automática del código:', code);
            
            // Usar el UIManager para buscar el producto
            if (window.ui) {
                // Simular escritura en el campo de búsqueda
                window.ui.elements.codeInput.value = code;
                
                // Ejecutar búsqueda EXACTA para escáner
                const results = await window.storageManager.searchProductsExact(code);
                
                if (results.length === 1) {
                    // Un producto encontrado - mostrar directamente
                    window.ui.displayProduct(results[0]);
                    window.ui.showToast(`✅ ${results[0].descripcion} encontrado`, 'success');
                } else if (results.length > 1) {
                    // Múltiples productos encontrados - mostrar opciones
                    window.ui.displayMultipleProducts(code, results);
                    window.ui.showToast(`🔍 ${results.length} productos encontrados. Selecciona el correcto.`, 'info');
                } else {
                    // No se encontró - mostrar mensaje de no encontrado
                    window.ui.showNoResults();
                    window.ui.showToast(`❌ No se encontró producto con código ${code}`, 'warning');
                }
            }
            
        } catch (error) {
            console.error('❌ Error en búsqueda automática:', error);
        }
    }

    /**
     * Reproduce sonido de éxito
     */
    playSuccessSound() {
        try {
            // Crear un sonido simple usando Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Silenciar errores de audio
        }
    }

    /**
     * Busca el código detectado y añade automáticamente si es único
     */
    async searchDetectedCode() {
        const code = this.elements.detectedCode.textContent;
        if (code) {
            // Cerrar escáner
            this.closeScanner();
            
            // Buscar productos con este código específico
            try {
                const results = await window.storageManager.searchProducts(code, '', 10);
                
                if (results.length === 1) {
                    // Si hay exactamente un producto, añadirlo automáticamente
                    const product = results[0];
                    await window.ui.addProductToList(product.codigo);
                    window.ui.showToast(`✅ ${product.descripcion} añadido automáticamente`, 'success');
                } else if (results.length > 1) {
                    // Si hay múltiples productos, mostrar resultados para que el usuario elija
                    window.ui.elements.codeInput.value = code;
                    window.ui.performSmartSearch();
                    window.ui.showToast(`🔍 ${results.length} productos encontrados. Selecciona el correcto.`, 'info');
                } else {
                    // Si no se encuentra el producto
                    window.ui.elements.codeInput.value = code;
                    window.ui.showToast(`❌ No se encontró producto con código ${code}`, 'warning');
                }
            } catch (error) {
                console.error('Error al buscar código detectado:', error);
                // Fallback: usar búsqueda normal
                if (window.ui) {
                    window.ui.elements.codeInput.value = code;
                    window.ui.performSmartSearch();
                }
            }
        }
    }

    /**
     * Cierra el escáner
     */
    closeScanner() {
        // Detener escaneo y cámara
        this.stopScanning();
        this.stopCamera();
        
        // Ocultar modal
        if (this.elements.scannerModal) {
            this.elements.scannerModal.style.display = 'none';
        }
        
        // Reset flash
        this.flashEnabled = false;
        
        console.log('📷 Escáner cerrado');
    }
}

// Instancia global del escáner
window.scanner = new BarcodeScanner();
