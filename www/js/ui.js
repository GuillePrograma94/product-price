/**
 * Gestor de interfaz de usuario para Labels Reader
 * Aplicación de consulta de precios - Solo búsqueda por código
 */

class UIManager {
    constructor() {
        this.currentProduct = null;
        this.isLoading = false;
        
        // Referencias a elementos DOM
        this.elements = {};
        
        // Configuración de toast
        this.toastTimeout = null;
    }

    /**
     * Inicializa la interfaz de usuario
     */
    async initialize() {
        // Verificar que estamos en en contexto válido
        if (typeof document === 'undefined') {
            console.error('❌ UIManager: document no está disponible');
            return;
        }
        
        // Verificar estado del DOM
        console.log('📄 Estado del DOM:', document.readyState);
        
        this.cacheElements();
        this.bindEvents();
        await this.updateUI();
        
        console.log('✅ UI Manager inicializado - Labels Reader');
    }

    /**
     * Cachea referencias a elementos DOM
     */
    cacheElements() {
        console.log('🔍 Cacheando elementos del DOM...');
        console.log('📄 Document ready:', document.readyState);
        console.log('📄 Document body:', document.body ? 'disponible' : 'no disponible');
        
        this.elements = {
            // Loading
            loadingScreen: document.getElementById('loadingScreen'),
            mainContent: document.getElementById('mainContent'),
            loadingText: document.getElementById('loadingText'),
            progressFill: document.getElementById('progressFill'),
            
            // Status
            syncStatus: document.getElementById('syncStatus'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            
            // Search
            codeInput: document.getElementById('codeInput'),
            searchBtn: document.getElementById('searchBtn'),
            scanBtn: document.getElementById('scanBtn'),
            searchStats: document.getElementById('searchStats'),
            productsCount: document.getElementById('productsCount'),
            
            // Multiple products
            multipleProductsSection: document.getElementById('multipleProductsSection'),
            searchedCode: document.getElementById('searchedCode'),
            productsList: document.getElementById('productsList'),
            clearMultipleProducts: document.getElementById('clearMultipleProducts'),
            
            // Product display
            productSection: document.getElementById('productSection'),
            productCard: document.getElementById('productCard'),
            productCode: document.getElementById('productCode'),
            productDescription: document.getElementById('productDescription'),
            productPrice: document.getElementById('productPrice'),
            productPVP: document.getElementById('productPVP'),
            productIVA: document.getElementById('productIVA'),
            productImage: document.getElementById('productImage'),
            productImagePlaceholder: document.getElementById('productImagePlaceholder'),
            clearProduct: document.getElementById('clearProduct'),
            
            // No results
            noResultsSection: document.getElementById('noResultsSection'),
            
            // Scanner
            scannerModal: document.getElementById('scannerModal'),
            scannerVideo: document.getElementById('scannerVideo'),
            scannerResult: document.getElementById('scannerResult'),
            detectedCode: document.getElementById('detectedCode'),
            searchDetectedBtn: document.getElementById('searchDetectedBtn'),
            closeScannerBtn: document.getElementById('closeScannerBtn'),
            
            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
        
        // Verificar elementos críticos inmediatamente después del cacheo
        const criticalElements = ['loadingScreen', 'mainContent', 'loadingText', 'progressFill'];
        criticalElements.forEach(id => {
            const element = this.elements[id];
            console.log(`${id}:`, element ? '✅ encontrado' : '❌ NO ENCONTRADO', element || '');
        });
        
        const missingElements = criticalElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.error('❌ Elementos críticos no encontrados:', missingElements);
            console.log('📄 Estado del DOM:', document.readyState);
            console.log('📄 Elementos disponibles:', Object.keys(this.elements).filter(key => this.elements[key]));
            
            // Intentar buscar elementos directamente
            console.log('🔍 Buscando elementos directamente...');
            missingElements.forEach(id => {
                const element = document.getElementById(id);
                console.log(`document.getElementById('${id}'):`, element ? '✅ encontrado' : '❌ no encontrado', element || '');
            });
        } else {
            console.log('✅ Todos los elementos críticos encontrados');
        }
    }

    /**
     * Vincula eventos a elementos DOM
     */
    bindEvents() {
        // Search events
        this.elements.searchBtn.addEventListener('click', () => this.searchProduct());
        this.elements.scanBtn.addEventListener('click', () => this.openScanner());
        
        // Eventos de teclado para búsqueda
        this.elements.codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchProduct();
            }
        });
        
        // Clear product
        this.elements.clearProduct.addEventListener('click', () => this.clearProduct());
        
        // Clear multiple products
        this.elements.clearMultipleProducts.addEventListener('click', () => this.clearMultipleProducts());
        
        // Scanner events
        this.elements.closeScannerBtn.addEventListener('click', () => this.closeScanner());
        this.elements.searchDetectedBtn.addEventListener('click', () => this.searchDetectedCode());
        
        // Auto-focus en el campo de código
        this.elements.codeInput.focus();
        
        console.log('✅ Eventos vinculados');
    }

    /**
     * Actualiza la interfaz de usuario
     */
    async updateUI() {
        await this.updateSearchStats();
        console.log('✅ UI actualizada');
    }

    /**
     * Actualiza las estadísticas de búsqueda
     */
    async updateSearchStats() {
        if (window.storageManager && window.storageManager.isAvailable()) {
            try {
                const stats = await window.storageManager.getStats();
                if (this.elements.productsCount) {
                    this.elements.productsCount.textContent = `${stats.totalProducts || 0} productos disponibles`;
                }
            } catch (error) {
                console.log('⚠️ Error al obtener estadísticas, usando valor por defecto');
                if (this.elements.productsCount) {
                    this.elements.productsCount.textContent = '0 productos disponibles';
                }
            }
        } else {
            console.log('⚠️ StorageManager no disponible, usando valor por defecto');
            if (this.elements.productsCount) {
                this.elements.productsCount.textContent = '0 productos disponibles';
            }
        }
    }

    /**
     * Busca un producto por código
     */
    async searchProduct() {
        const code = this.elements.codeInput.value.trim();
        
        if (!code) {
            // this.showToast('Introduce un código de producto', 'warning');
            console.log('⚠️ Introduce un código de producto');
            this.elements.codeInput.focus();
            return;
        }

        try {
            this.setLoading(true);
            this.hideProductSections();
            
            console.log(`🔍 Buscando producto con código: ${code}`);
            
            // Buscar productos en el almacenamiento local
            const products = await window.storageManager.searchProductsByCode(code);
            
            if (products && products.length > 0) {
                if (products.length === 1) {
                    // Un solo producto encontrado
                    this.displayProduct(products[0]);
                    // this.showToast('Producto encontrado', 'success');
                    console.log('✅ Producto encontrado');
                } else {
                    // Múltiples productos encontrados
                    this.displayMultipleProducts(code, products);
                    // this.showToast(`${products.length} productos encontrados`, 'info');
                    console.log(`📦 ${products.length} productos encontrados`);
                }
            } else {
                this.showNoResults();
                // this.showToast('Producto no encontrado', 'error');
                console.log('❌ Producto no encontrado');
            }
            
        } catch (error) {
            console.error('❌ Error al buscar producto:', error);
            // this.showToast('Error al buscar el producto', 'error');
            console.log('❌ Error al buscar el producto');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Muestra la información del producto encontrado
     */
    displayProduct(product) {
        this.currentProduct = product;
        
        // Actualizar información básica
        this.elements.productCode.textContent = product.codigo || '-';
        this.elements.productDescription.textContent = product.descripcion || 'Sin descripción';
        
        // Calcular y mostrar precios
        const pvp = parseFloat(product.pvp) || 0;
        const iva = pvp * 0.21; // 21% IVA
        const precioFinal = pvp + iva;
        
        this.elements.productPrice.textContent = precioFinal.toFixed(2);
        this.elements.productPVP.textContent = `${pvp.toFixed(2)} €`;
        this.elements.productIVA.textContent = `${iva.toFixed(2)} €`;
        
        // Manejar imagen del producto
        this.handleProductImage(product);
        
        // Mostrar sección de producto
        this.elements.productSection.style.display = 'block';
        this.elements.productSection.classList.add('fade-in');
        
        // Scroll suave hacia la tarjeta del producto
        setTimeout(() => {
            this.elements.productSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 200); // Pequeño delay para que la animación fade-in sea visible
        
        // Limpiar campo de búsqueda
        // this.elements.codeInput.value = '';
        
        console.log('✅ Producto mostrado:', product);
    }

    /**
     * Maneja la imagen del producto usando la URL de saneamiento-martinez
     */
    handleProductImage(product) {
        // Ocultar imagen actual y mostrar placeholder
        this.elements.productImage.style.display = 'none';
        this.elements.productImagePlaceholder.style.display = 'flex';
        
        // Crear nueva imagen con URL de saneamiento-martinez
        const img = new Image();
        img.src = `https://www.saneamiento-martinez.com/imagenes/articulos/${product.codigo}_1.JPG`;
        img.alt = `Imagen de ${product.descripcion}`;
        img.className = 'product-image';
        
        img.onload = () => {
            // Reemplazar placeholder con imagen real
            this.elements.productImage.src = img.src;
            this.elements.productImage.alt = img.alt;
            this.elements.productImage.style.display = 'block';
            this.elements.productImagePlaceholder.style.display = 'none';
            console.log('✅ Imagen cargada:', img.src);
        };
        
        img.onerror = () => {
            // Mantener placeholder si falla la carga
            this.elements.productImage.style.display = 'none';
            this.elements.productImagePlaceholder.style.display = 'flex';
            console.log('❌ Error al cargar imagen:', img.src);
        };
    }

    /**
     * Muestra mensaje de producto no encontrado
     */
    showNoResults() {
        this.elements.noResultsSection.style.display = 'block';
        this.elements.noResultsSection.classList.add('fade-in');
    }

    /**
     * Muestra múltiples productos encontrados
     */
    displayMultipleProducts(code, products) {
        this.elements.searchedCode.textContent = code;
        
        // Limpiar lista anterior
        this.elements.productsList.innerHTML = '';
        
        // Crear elementos para cada producto
        products.forEach((product, index) => {
            const productElement = this.createProductOptionElement(product, index);
            this.elements.productsList.appendChild(productElement);
        });
        
        // Mostrar sección de múltiples productos
        this.elements.multipleProductsSection.style.display = 'block';
        this.elements.multipleProductsSection.classList.add('fade-in');
        
        // Scroll suave hacia la sección de múltiples productos
        setTimeout(() => {
            this.elements.multipleProductsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 200); // Pequeño delay para que la animación fade-in sea visible
        
        console.log(`✅ ${products.length} productos mostrados para selección`);
    }

    /**
     * Crea un elemento de opción de producto
     */
    createProductOptionElement(product, index) {
        const pvp = parseFloat(product.pvp) || 0;
        const iva = pvp * 0.21;
        const precioFinal = pvp + iva;
        
        const productDiv = document.createElement('div');
        productDiv.className = 'product-option';
        productDiv.innerHTML = `
            <div class="product-option-header">
                <span class="product-option-code">${product.codigo}</span>
                <span class="product-option-price">${precioFinal.toFixed(2)} €</span>
                    </div>
            <div class="product-option-description">${product.descripcion || 'Sin descripción'}</div>
            <div class="product-option-details">
                <span class="product-option-category">${product.categoria || 'Sin categoría'}</span>
                <span class="product-option-secondary">Sec: ${product.codigo_secundario || '-'}</span>
                    </div>
            <div class="product-option-actions">
                <button class="select-product-btn" data-product-index="${index}">
                    Seleccionar este producto
                        </button>
            </div>
        `;

        // Agregar evento de clic
        const selectBtn = productDiv.querySelector('.select-product-btn');
        selectBtn.addEventListener('click', () => {
            this.selectProductFromMultiple(product);
        });
        
        // Agregar evento de clic en toda la tarjeta
        productDiv.addEventListener('click', (e) => {
            if (e.target !== selectBtn) {
                this.selectProductFromMultiple(product);
            }
        });
        
        return productDiv;
    }

    /**
     * Selecciona un producto de la lista múltiple
     */
    selectProductFromMultiple(product) {
        // Ocultar sección de múltiples productos
        this.elements.multipleProductsSection.style.display = 'none';
        this.elements.multipleProductsSection.classList.remove('fade-in');
        
        // Mostrar el producto seleccionado
        this.displayProduct(product);
        
        // Limpiar campo de búsqueda
        this.elements.codeInput.value = '';
        
        console.log('✅ Producto seleccionado:', product.codigo);
    }

    /**
     * Limpia la selección de múltiples productos
     */
    clearMultipleProducts() {
        this.elements.multipleProductsSection.style.display = 'none';
        this.elements.multipleProductsSection.classList.remove('fade-in');
        this.elements.codeInput.focus();
        console.log('✅ Selección múltiple limpiada');
    }

    /**
     * Oculta todas las secciones de producto
     */
    hideProductSections() {
        this.elements.productSection.style.display = 'none';
        this.elements.multipleProductsSection.style.display = 'none';
        this.elements.noResultsSection.style.display = 'none';
        this.elements.productSection.classList.remove('fade-in');
        this.elements.multipleProductsSection.classList.remove('fade-in');
        this.elements.noResultsSection.classList.remove('fade-in');
    }

    /**
     * Limpia el producto actual
     */
    clearProduct() {
        this.currentProduct = null;
        this.hideProductSections();
        this.elements.codeInput.focus();
        console.log('✅ Producto limpiado');
    }

    /**
     * Abre el escáner de códigos de barras
     */
    openScanner() {
        console.log('📷 Abriendo escáner...');
        
        // Inicializar escáner
        if (window.scanner) {
            window.scanner.openScanner();
        } else {
            console.error('❌ Escáner no disponible');
            // this.showToast('Escáner no disponible', 'error');
            console.log('❌ Escáner no disponible');
        }
    }

    /**
     * Cierra el escáner
     */
    closeScanner() {
        this.elements.scannerModal.style.display = 'none';
        this.elements.scannerModal.classList.remove('fade-in');
        
        // Detener escáner
        if (window.scanner) {
            window.scanner.stopScanning();
        }
        
        console.log('📷 Escáner cerrado');
    }

    /**
     * Busca el código detectado por el escáner
     */
    searchDetectedCode() {
        const detectedCode = this.elements.detectedCode.textContent;
        this.elements.codeInput.value = detectedCode;
        this.closeScanner();
        this.searchProduct();
    }

    /**
     * Muestra la pantalla de carga
     */
    showLoading(message = 'Cargando...') {
        if (!this.elements.loadingScreen) {
            console.error('❌ loadingScreen no encontrado');
            return;
        }
        this.elements.loadingScreen.style.display = 'flex';
        
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = message;
        }
        this.isLoading = true;
    }

    /**
     * Oculta la pantalla de carga
     */
    hideLoading() {
        if (!this.elements.loadingScreen) {
            console.error('❌ loadingScreen no encontrado');
                return;
            }
        this.elements.loadingScreen.style.display = 'none';
        
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = 'block';
        }
        this.isLoading = false;
    }

    /**
     * Actualiza el progreso de carga
     */
    updateProgress(percentage, message) {
        this.elements.progressFill.style.width = `${percentage * 100}%`;
        this.elements.loadingText.textContent = message;
    }

    /**
     * Actualiza el estado de sincronización
     */
    updateSyncStatus(status, message) {
        if (!this.elements.statusText) {
            console.error('❌ statusText no encontrado');
            return;
        }
        this.elements.statusText.textContent = message;
        
        if (!this.elements.statusIndicator) {
            console.error('❌ statusIndicator no encontrado');
            return;
        }
        
        // Actualizar indicador visual
        this.elements.statusIndicator.className = 'status-indicator';
        switch (status) {
            case 'connected':
                this.elements.statusIndicator.classList.add('connected');
                this.elements.statusIndicator.textContent = '🟢';
                break;
            case 'connecting':
                this.elements.statusIndicator.classList.add('connecting');
                this.elements.statusIndicator.textContent = '🟡';
                break;
            case 'error':
                this.elements.statusIndicator.classList.add('error');
                this.elements.statusIndicator.textContent = '🔴';
                break;
            default:
                this.elements.statusIndicator.textContent = '⚪';
        }
    }

    /**
     * Establece el estado de carga
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.searchBtn.disabled = loading;
        this.elements.codeInput.disabled = loading;
        
        if (loading) {
            this.elements.searchBtn.textContent = 'Buscando...';
            } else {
            this.elements.searchBtn.textContent = 'Buscar Precio';
        }
    }

    /**
     * Muestra una notificación toast
     */
    showToast(message, type = 'info', duration = 3000) {
        // Limpiar toast anterior si existe
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        // Añadir al contenedor
        this.elements.toastContainer.appendChild(toast);

        // Auto-eliminar después del tiempo especificado
        this.toastTimeout = setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
        
        console.log(`📢 Toast ${type}: ${message}`);
    }

    /**
     * Obtiene estadísticas de la aplicación
     */
    getAppStats() {
        return {
            currentProduct: this.currentProduct,
            isLoading: this.isLoading,
            productsCount: window.storageManager ? window.storageManager.getStatsSync().totalProducts : 0
        };
    }
}

// Inicializar UI Manager cuando la página esté completamente cargada
window.addEventListener('load', async () => {
    console.log('🌐 Página completamente cargada, inicializando UIManager...');
    console.log('📄 Estado del DOM:', document.readyState);
    
    // Crear instancia del UIManager
window.ui = new UIManager();

    // Inicializar de forma asíncrona
    await window.ui.initialize();
    
    console.log('🎯 Labels Reader UI Manager creado');
});