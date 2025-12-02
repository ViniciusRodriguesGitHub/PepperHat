/**
 * GameState - Sistema de gerenciamento de estados do jogo
 * Responsável por controlar transições entre diferentes estados (menu, playing, gameOver)
 */
class GameState {
  constructor() {
    this.currentState = 'menu';
    this.states = new Map();
    this.stateData = new Map();
    this.listeners = new Map();
    this.stateHistory = [];
  }

  /**
   * Registra um novo estado
   * @param {string} name - Nome do estado
   * @param {Function} stateClass - Classe do estado
   */
  registerState(name, stateClass) {
    this.states.set(name, stateClass);
  }

  /**
   * Muda para um novo estado
   * @param {string} newState - Nome do novo estado
   * @param {Object} data - Dados para o novo estado
   */
  changeState(newState, data = {}) {
    if (this.currentState !== newState) {
      // Salvar estado atual no histórico
      this.stateHistory.push({
        state: this.currentState,
        data: this.stateData.get(this.currentState) || {},
        timestamp: Date.now()
      });

      // Limitar histórico a 10 estados
      if (this.stateHistory.length > 10) {
        this.stateHistory.shift();
      }

      // Atualizar estado atual
      const previousState = this.currentState;
      this.currentState = newState;
      this.stateData.set(newState, data);

      // Notificar mudança de estado
      this.notifyStateChange(newState, data, previousState);
    }
  }

  /**
   * Volta para o estado anterior
   * @returns {boolean} True se conseguiu voltar
   */
  goBack() {
    if (this.stateHistory.length > 0) {
      const previousState = this.stateHistory.pop();
      this.currentState = previousState.state;
      this.stateData.set(previousState.state, previousState.data);
      this.notifyStateChange(previousState.state, previousState.data);
      return true;
    }
    return false;
  }

  /**
   * Obtém a classe do estado atual
   * @returns {Function} Classe do estado atual
   */
  getCurrentState() {
    return this.states.get(this.currentState);
  }

  /**
   * Obtém os dados do estado atual
   * @returns {Object} Dados do estado atual
   */
  getCurrentStateData() {
    return this.stateData.get(this.currentState) || {};
  }

  /**
   * Obtém o nome do estado atual
   * @returns {string} Nome do estado atual
   */
  getCurrentStateName() {
    return this.currentState;
  }

  /**
   * Adiciona um listener para mudanças de estado
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função de callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove um listener
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função de callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notifica mudança de estado
   * @private
   */
  notifyStateChange(newState, data, previousState = null) {
    const eventData = {
      newState,
      data,
      previousState,
      timestamp: Date.now()
    };

    // Notificar listeners específicos
    if (this.listeners.has('stateChange')) {
      this.listeners.get('stateChange').forEach(callback => {
        callback(eventData);
      });
    }

    // Notificar listeners específicos do estado
    if (this.listeners.has(`stateChange:${newState}`)) {
      this.listeners.get(`stateChange:${newState}`).forEach(callback => {
        callback(eventData);
      });
    }
  }

  /**
   * Verifica se está em um estado específico
   * @param {string} state - Nome do estado
   * @returns {boolean} True se estiver no estado
   */
  isInState(state) {
    return this.currentState === state;
  }

  /**
   * Obtém o histórico de estados
   * @returns {Array} Array com o histórico de estados
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Limpa o histórico de estados
   */
  clearHistory() {
    this.stateHistory = [];
  }

  /**
   * Obtém estatísticas do sistema de estados
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      currentState: this.currentState,
      totalStates: this.states.size,
      historyLength: this.stateHistory.length,
      listenersCount: Array.from(this.listeners.values()).reduce((total, callbacks) => total + callbacks.length, 0)
    };
  }
}

// Exportar para uso global
window.GameState = GameState;
