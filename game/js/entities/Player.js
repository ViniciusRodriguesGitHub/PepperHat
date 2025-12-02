/**
 * Player - Classe que representa o jogador
 * Responsável por toda a lógica relacionada ao personagem principal
 */
class Player {
  constructor(x, y, config) {
    this.x = x;
    this.y = y;
    this.width = config.WIDTH;
    this.height = config.INITIAL_HEIGHT;
    this.initialHeight = config.INITIAL_HEIGHT;
    this.crouchHeight = config.CROUCH_HEIGHT;
    this.baseMoveSpeed = config.BASE_MOVE_SPEED;
    this.collisionViewRange = config.COLLISION_VIEW_RANGE;
    
    // Física
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    
    // Estado
    this.facingRight = true;
    this.isCrouching = false;
    this.isAcceleratedJump = false;
    this.jumpAccelerationFactor = 1.0;
    
    // Animações
    this.animations = {
      idle: [],
      walk: [],
      jump: [],
      crouch: []
    };
    this.currentAnim = 'idle';
    this.animIndex = 0;
    this.animTimer = 0;
    this.animSpeed = 0.2;
    this.lastAnim = 'idle';
    this.idleTime = 0;
    
    // Input
    this.input = {
      left: false,
      right: false,
      jump: false,
      crouch: false
    };
  }

  /**
   * Atualiza o estado do jogador
   * @param {number} dt - Delta time
   * @param {Object} physics - Configurações de física
   * @param {number} groundY - Posição Y do chão
   */
  update(dt, physics, groundY) {
    this._updateMovement(dt, physics);
    this._updatePhysics(dt, physics, groundY);
    this._updateAnimation(dt);
    this._updateFacing();
  }

  /**
   * Atualiza o movimento do jogador
   * @private
   */
  _updateMovement(dt, physics) {
    let moveSpeed = this.baseMoveSpeed;
    
    // Aplicar fator de aceleração de pulo se ativo
    if (this.isAcceleratedJump) {
      moveSpeed *= this.jumpAccelerationFactor;
      // Decair gradualmente o fator de aceleração
      this.jumpAccelerationFactor = Math.max(1.0, 
        this.jumpAccelerationFactor - (physics.ACCELERATED_JUMP_DECAY_RATE * dt)
      );
    }

    this.vx = 0;
    
    if (!this.isCrouching) {
      if (this.input.left && !this.input.right) {
        this.vx = -moveSpeed;
      } else if (this.input.right && !this.input.left) {
        this.vx = moveSpeed;
      }
    }

    // Aplicar movimento horizontal
    this.x += this.vx * dt;
  }

  /**
   * Atualiza a física do jogador
   * @private
   */
  _updatePhysics(dt, physics, groundY) {
    // Aplicar gravidade
    this.vy += physics.GRAVITY * dt;
    
    // Aplicar velocidade vertical
    this.y += this.vy * dt;
    
    // Colisão com o chão
    const groundTolerance = physics.GROUND_TOLERANCE;
    if (this.y + this.height >= groundY - groundTolerance) {
      this.y = groundY - this.height;
      this.vy = 0;
      
      // Resetar estado de pulo acelerado se pousou
      if (!this.onGround && this.isAcceleratedJump) {
        this.isAcceleratedJump = false;
        this.jumpAccelerationFactor = 1.0;
      }
      
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  /**
   * Atualiza as animações do jogador
   * @private
   */
  _updateAnimation(dt) {
    // Determinar animação baseada no estado
    if (this.onGround) {
      if (this.isCrouching) {
        this.currentAnim = 'crouch';
      } else if (this.input.left || this.input.right) {
        this.currentAnim = 'walk';
      } else {
        this.currentAnim = 'idle';
      }
    } else {
      this.currentAnim = 'jump';
      // Definir frame específico baseado na velocidade vertical
      if (this.vy < 0) {
        this.animIndex = 0; // Subindo
      } else if (this.vy >= 200 && this.vy <= 400) {
        this.animIndex = 1; // Desacelerando
      } else {
        this.animIndex = 2; // Caindo
      }
    }

    // Resetar índice se a animação mudou
    if (this.currentAnim !== this.lastAnim) {
      this.animIndex = 0;
    }
    this.lastAnim = this.currentAnim;

    // Avançar animação
    this._advanceAnimation(dt);
  }

  /**
   * Avança a animação atual
   * @private
   */
  _advanceAnimation(dt) {
    const frames = this.animations[this.currentAnim];
    if (!frames || frames.length === 0) return;

    this.animTimer += dt;
    if (this.animTimer >= this.animSpeed) {
      this.animTimer = 0;
      
      if (this.currentAnim === 'idle') {
        this.animIndex = 0; // Sempre usar o primeiro frame para idle
      } else if (this.currentAnim === 'crouch') {
        // Pausar no último frame do agachamento
        if (this.animIndex < frames.length - 1) {
          this.animIndex = (this.animIndex + 1) % frames.length;
        }
      } else if (this.currentAnim === 'walk') {
        this.animIndex = (this.animIndex + 1) % frames.length;
      }
      // Para jump, o índice é definido baseado na velocidade vertical
    }
  }

  /**
   * Atualiza a direção que o jogador está olhando
   * @private
   */
  _updateFacing() {
    if (this.vx < 0) this.facingRight = false;
    if (this.vx > 0) this.facingRight = true;
  }

  /**
   * Faz o jogador pular
   * @param {Object} physics - Configurações de física
   * @param {boolean} isAccelerated - Se é um pulo acelerado
   */
  jump(physics, isAccelerated = false) {
    if (this.onGround) {
      this.vy = physics.JUMP_IMPULSE;
      this.onGround = false;
      
      if (isAccelerated) {
        this.isAcceleratedJump = true;
        this.jumpAccelerationFactor = physics.ACCELERATED_JUMP_FACTOR;
      }
    }
  }

  /**
   * Define se o jogador está agachado
   * @param {boolean} crouching - Se deve agachar
   */
  setCrouching(crouching) {
    this.isCrouching = crouching;
    this.height = crouching ? this.crouchHeight : this.initialHeight;
  }

  /**
   * Define o input do jogador
   * @param {Object} input - Objeto de input
   */
  setInput(input) {
    this.input = { ...this.input, ...input };
  }

  /**
   * Carrega as animações do jogador
   * @param {Object} images - Objeto com as imagens carregadas
   */
  loadAnimations(images) {
    this.animations.idle = [images.parado];
    this.animations.walk = [images.wk1, images.wk2, images.wk3, images.wk4];
    this.animations.jump = [images.subindo, images.desacelerando, images.caindo];
    this.animations.crouch = [images.abaixar1, images.abaixar2, images.abaixar3];
  }

  /**
   * Obtém o sprite atual para renderização
   * @returns {Image} Imagem do sprite atual
   */
  getCurrentSprite() {
    const frames = this.animations[this.currentAnim];
    if (!frames || frames.length === 0) return null;
    
    return frames[this.animIndex % frames.length];
  }

  /**
   * Obtém a caixa de colisão do jogador
   * @returns {Object} Objeto com as coordenadas da caixa de colisão
   */
  getCollisionBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Reseta o jogador para a posição inicial
   * @param {number} x - Posição X inicial
   * @param {number} y - Posição Y inicial
   */
  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.facingRight = true;
    this.isCrouching = false;
    this.isAcceleratedJump = false;
    this.jumpAccelerationFactor = 1.0;
    this.currentAnim = 'idle';
    this.animIndex = 0;
    this.animTimer = 0;
    this.idleTime = 0;
    this.input = { left: false, right: false, jump: false, crouch: false };
  }

  /**
   * Obtém informações de debug do jogador
   * @returns {Object} Informações de debug
   */
  getDebugInfo() {
    return {
      position: { x: this.x, y: this.y },
      velocity: { x: this.vx, y: this.vy },
      onGround: this.onGround,
      facingRight: this.facingRight,
      isCrouching: this.isCrouching,
      currentAnim: this.currentAnim,
      animIndex: this.animIndex,
      isAcceleratedJump: this.isAcceleratedJump,
      jumpAccelerationFactor: this.jumpAccelerationFactor
    };
  }
}

// Exportar para uso global
window.Player = Player;
