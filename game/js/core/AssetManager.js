/**
 * AssetManager - Sistema de gerenciamento de assets
 * Responsável por carregar, cachear e gerenciar todos os recursos do jogo
 */
class AssetManager {
  constructor() {
    this.assets = new Map();
    this.loadingPromises = new Map();
    this.loadingProgress = 0;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  /**
   * Carrega um asset individual
   * @param {string} path - Caminho do asset
   * @param {string} type - Tipo do asset (image, audio, json)
   * @returns {Promise} Promise que resolve com o asset carregado
   */
  async loadAsset(path, type = 'image') {
    if (this.assets.has(path)) {
      return this.assets.get(path);
    }

    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path);
    }

    const promise = this._loadAssetByType(path, type);
    this.loadingPromises.set(path, promise);

    try {
      const asset = await promise;
      this.assets.set(path, asset);
      this.loadingPromises.delete(path);
      this.loadedAssets++;
      this.loadingProgress = this.loadedAssets / this.totalAssets;
      return asset;
    } catch (error) {
      console.error(`Erro ao carregar asset: ${path}`, error);
      this.loadingPromises.delete(path);
      throw error;
    }
  }

  /**
   * Carrega múltiplos assets
   * @param {Array} assetList - Lista de assets para carregar
   * @returns {Promise} Promise que resolve quando todos os assets forem carregados
   */
  async preloadAssets(assetList) {
    this.totalAssets = assetList.length;
    this.loadedAssets = 0;
    this.loadingProgress = 0;

    const loadPromises = assetList.map(({ path, type = 'image' }) => 
      this.loadAsset(path, type)
    );

    return Promise.all(loadPromises);
  }

  /**
   * Carrega assets por categoria
   * @param {Object} categories - Objeto com categorias de assets
   * @returns {Promise} Promise que resolve quando todos os assets forem carregados
   */
  async loadAssetsByCategory(categories) {
    const allAssets = [];
    
    for (const [category, assets] of Object.entries(categories)) {
      for (const [key, path] of Object.entries(assets)) {
        allAssets.push({ path, type: 'image', category, key });
      }
    }

    return this.preloadAssets(allAssets);
  }

  /**
   * Carrega asset por tipo específico
   * @private
   */
  _loadAssetByType(path, type) {
    switch (type) {
      case 'image':
        return this._loadImage(path);
      case 'audio':
        return this._loadAudio(path);
      case 'json':
        return this._loadJSON(path);
      default:
        throw new Error(`Tipo de asset não suportado: ${type}`);
    }
  }

  /**
   * Carrega uma imagem
   * @private
   */
  _loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${path}`));
      img.src = path;
    });
  }

  /**
   * Carrega um arquivo de áudio
   * @private
   */
  _loadAudio(path) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Falha ao carregar áudio: ${path}`));
      audio.src = path;
    });
  }

  /**
   * Carrega um arquivo JSON
   * @private
   */
  _loadJSON(path) {
    return fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar JSON: ${path}`);
        }
        return response.json();
      });
  }

  /**
   * Obtém um asset carregado
   * @param {string} path - Caminho do asset
   * @returns {*} Asset carregado ou undefined
   */
  getAsset(path) {
    return this.assets.get(path);
  }

  /**
   * Verifica se um asset foi carregado
   * @param {string} path - Caminho do asset
   * @returns {boolean} True se o asset foi carregado
   */
  hasAsset(path) {
    return this.assets.has(path);
  }

  /**
   * Obtém o progresso de carregamento
   * @returns {number} Progresso de 0 a 1
   */
  getLoadingProgress() {
    return this.loadingProgress;
  }

  /**
   * Limpa o cache de assets
   */
  clearCache() {
    this.assets.clear();
    this.loadingPromises.clear();
    this.loadingProgress = 0;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  /**
   * Obtém informações sobre assets carregados
   * @returns {Object} Estatísticas dos assets
   */
  getStats() {
    return {
      totalAssets: this.totalAssets,
      loadedAssets: this.loadedAssets,
      cachedAssets: this.assets.size,
      loadingProgress: this.loadingProgress,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * Estima o uso de memória dos assets
   * @private
   */
  _estimateMemoryUsage() {
    let totalSize = 0;
    for (const asset of this.assets.values()) {
      if (asset instanceof Image) {
        totalSize += asset.width * asset.height * 4; // 4 bytes por pixel (RGBA)
      }
    }
    return totalSize;
  }
}

// Exportar para uso global
window.AssetManager = AssetManager;
