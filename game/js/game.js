/*
 * Minimalist platform game implemented without any external libraries.
 *
 * The game displays a pixel art city backdrop, a ground plane and a
 * single pepper character that you can move left and right across a
 * scrolling world.  Use the left/right arrow keys on a keyboard, the
 * on‑screen buttons on touch devices or a connected gamepad's D‑pad
 * (left/right) to walk.  Press the space bar, the on‑screen A button
 * or the primary gamepad button to jump.  The camera follows the
 * player as they traverse a level three screens wide.
 */

(function() {
  // Canvas and rendering context
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  document.getElementById('gameContainer').appendChild(canvas);

  // Fixed internal resolution.  The canvas will be scaled to fit the
  // browser window while maintaining aspect ratio.
  let GAME_WIDTH = 800;
  let GAME_HEIGHT = 450;

  let isAccelerometerEnabled = false; // Declared globally
  let currentZoomLevel = 1.0; // New global variable for zoom level
  let isRightLocked = false; // New global variable for locking right movement

  // Define all game constants within a single configuration object for better organization
  const GameConfig = {
    // Assets
    ASSETS: {
    ground: 'assets/images/environment/ground_tile.png',
    pepper: 'assets/images/player/pepper.png',
    pepper_idle_0: 'assets/images/player/pepper_idle_0.png',
    pepper_idle_1: 'assets/images/player/pepper_idle_1.png',
    pepper_idle_2: 'assets/images/player/pepper_idle_2.png',
    pepper_idle_3: 'assets/images/player/pepper_idle_3.png',
    pepper_idle_4: 'assets/images/player/pepper_idle_4.png',
    pepper_idle_5: 'assets/images/player/pepper_idle_5.png',
    wk1: 'assets/images/player/wk1.png',
    wk2: 'assets/images/player/wk2.png',
    wk3: 'assets/images/player/wk3.png',
    wk4: 'assets/images/player/wk4.png',
    subindo: 'assets/images/player/1subindo.png',
    desacelerando: 'assets/images/player/2desacelerando.png',
    caindo: 'assets/images/player/3caindo.png',
    parado: 'assets/images/player/parado.png',
    abaixar1: 'assets/images/player/l0_abaixar1.png',
    abaixar2: 'assets/images/player/l0_abaixar2.png',
    abaixar3: 'assets/images/player/l0_abaixar3.png',
    note: 'assets/images/collectibles/note.png',
    record: 'assets/images/collectibles/record.png',
    ground_tile: 'assets/images/environment/ground_tile.png'
    },

    // Bar Constants
    ANIMATED_BAR: {
      Y_OFFSET: 50,
      WIDTH: 200,
      HEIGHT: 20,
      SPEED: 2.0,
      RED_THRESHOLD: 0.9,
      GREEN_COLOR: '#00FF00',
      RED_COLOR: '#FF0000',
    },
    STAMINA_BAR: {
      DRAIN_SPEED: 0.2,
      RECOVER_SPEED: 0.2,
      COLOR: '#FFA500',
    },
    BAR_VERTICAL_SPACING: 10,

    // Enemy Constants
    ENEMY: {
      INITIAL_X_OFFSET: 50,
      WIDTH: 40,
      HEIGHT: 40,
      SPEED: 150,
      HITBOX_OFFSET: 10,
    },

    // Player Constants
    PLAYER: {
      INITIAL_X_OFFSET: 25,
      WIDTH: 50,
      INITIAL_HEIGHT: 60,
      CROUCH_HEIGHT: 30,
      BASE_MOVE_SPEED: 200,
      COLLISION_VIEW_RANGE: 100,
    },

    // Color Palettes
    COLORS: {
      PASTEL_LIGHT: [
        '#B3E5FC', '#C8E6C9', '#FFF9C4', '#FFCCBC', '#F8BBD0',
      ],
      SOFT_PASTEL_LIGHT: [
        '#FDFD96', '#84B6F4', '#FF6961', '#77DD77', '#FFD1DC', '#B19CD9',
      ],
      PASTEL_DESATURATED: [
        '#90CAF9', '#A5D6A7', '#FFECB3', '#FFAB91', '#F48FB1',
      ],
      WINDOW: [
        '#E3F2FD', '#BBDEFB',
      ],
      DOOR: [
        '#D7CCC8', '#BCAAA4',
      ],
    },

    // Furniture Types
    FURNITURE_TYPES: [
      { type: 'refrigerator', minWidth: 40, maxWidth: 50, minHeight: 90, maxHeight: 120 },
      { type: 'cabinet', minWidth: 60, maxWidth: 100, minHeight: 70, maxHeight: 100 },
      { type: 'table', minWidth: 80, maxWidth: 150, minHeight: 40, maxHeight: 60 },
      { type: 'television', minWidth: 50, maxWidth: 80, minHeight: 40, maxHeight: 60 },
      { type: 'sofa', minWidth: 100, maxWidth: 180, minHeight: 30, maxHeight: 50 },
      { type: 'plant', minWidth: 20, maxWidth: 40, minHeight: 50, maxHeight: 80 },
      { type: 'painting', minWidth: 30, maxWidth: 60, minHeight: 40, maxHeight: 70 },
      { type: 'bookshelf', minWidth: 60, maxWidth: 100, minHeight: 80, maxHeight: 110 },
      { type: 'chair', minWidth: 30, maxWidth: 50, minHeight: 50, maxHeight: 70 },
    ],

    // Procedural Generation Parameters
    GENERATION: {
      VIEW_RANGE: 1.5, // Multiplied by GAME_WIDTH
      BUFFER: 0.5, // Multiplied by GAME_WIDTH
      PROB_HOUSE: 0.4,
      PROB_TREE: 0.3,
      PROB_STREETLIGHT: 0.1,
      PROB_FENCE: 0.1,
      PROB_BUSH: 0.05,
      PROB_POLE: 0.05,
      PROB_BACKGROUND_HOUSE: 0.3,
      PROB_HAS_WINDOW: 0.7,
      PROB_HAS_DOOR: 0.8,
      PROB_HAS_ROOF: 0.9,
      PROB_COLLECTIBLE: 0.2,
      PROB_NOTE_COLLECTIBLE: 0.5,
      SEGMENT_WIDTH: 200,
    },

    // Physics Constants
    PHYSICS: {
      GRAVITY: 1200,
      STAMINA_LOW_SPEED_FACTOR: 0.5,
      JUMP_IMPULSE: -600,
      ACCELERATED_JUMP_FACTOR: 1.8,
      ACCELERATED_JUMP_DECAY_RATE: 0.8,
      GROUND_TOLERANCE: 1,
    },

    // Animation Constants
    ANIMATION: {
      SPEED: 0.15,
      JUMP_ASCENDING_INDEX: 0,
      JUMP_DECELERATING_INDEX: 1,
      JUMP_DESCENDING_INDEX: 2,
    },

    // Render Constants
    RENDER: {
      PARALLAX_FACTOR_BACKGROUND: 0.2,
      PARALLAX_FACTOR_CITY: 0.1,
      PARALLAX_FACTOR_LAYER_BACKGROUND: 0.5,
      MIN_ZOOM_LEVEL: 0.5, // Minimum zoom level
      MAX_ZOOM_LEVEL: 2.0, // Maximum zoom level
      ZOOM_STEP: 0.1, // Increment/decrement for zoom
    },

    // Menu Constants
    MENU: {
      TITLE_Y_OFFSET: -150,
      BUTTON_WIDTH: 200,
      BUTTON_HEIGHT: 60,
      BUTTON_SPACING_Y: 30,
      EASY_BUTTON_Y_OFFSET: -60, // Adjusted to be higher
      NORMAL_BUTTON_Y_OFFSET: 0, // Centered at the height of the previous button
      INCLINATION_BUTTON_Y_OFFSET: 60, // Based on the new spacing
      LOCK_RIGHT_BUTTON_Y_OFFSET: 120, // Based on the new spacing
    },

    // Game Over Menu Constants
    GAME_OVER_MENU: {
      RESTART_BUTTON_WIDTH: 120,
      RESTART_BUTTON_HEIGHT: 40,
      RESTART_BUTTON_Y_OFFSET: 10,
    },

    // Accelerometer Constants
    ACCELEROMETER: {
      TILT_THRESHOLD: 7,
      MAX_TILT: 45,
    },
  };

  let images = {};

  const animatedBar = {
    // x: GAME_WIDTH / 2 - 100, // Will be calculated in updateBarPositions
    y: GameConfig.ANIMATED_BAR.Y_OFFSET, // Positioned near the top (initial value, will be updated)
    width: GameConfig.ANIMATED_BAR.WIDTH,
    height: GameConfig.ANIMATED_BAR.HEIGHT,
    fill: 0.0, // Current fill level (0.0 to 1.0)
    fillDirection: 1, // 1 for increasing, -1 for decreasing
    speed: GameConfig.ANIMATED_BAR.SPEED, // How fast it oscillates (0.5 * 4 = 2.0)
    isVisible: false,
    color: GameConfig.ANIMATED_BAR.GREEN_COLOR, // Default to green
  };

  const staminaBar = {
    // x: animatedBar.x, // Will be calculated in updateBarPositions
    // y: animatedBar.y - animatedBar.height - 10, // Will be calculated in updateBarPositions
    width: animatedBar.width,
    height: animatedBar.height,
    fill: 1.0, // Start fully filled
    drainSpeed: GameConfig.STAMINA_BAR.DRAIN_SPEED, // Speed at which stamina drains (per second)
    recoverSpeed: GameConfig.STAMINA_BAR.RECOVER_SPEED, // Speed at which stamina recovers (per second)
    color: GameConfig.STAMINA_BAR.COLOR, // Orange
  };

  // Enemy state
  const enemy = {
    x: GAME_WIDTH - GameConfig.ENEMY.INITIAL_X_OFFSET, // Initial position on the right side of the screen
    y: 0, // Will be set correctly after groundY is calculated
    width: GameConfig.ENEMY.WIDTH,
    height: GameConfig.ENEMY.HEIGHT,
    vx: 0,
    vy: 0,
    speed: GameConfig.ENEMY.SPEED, // Slightly slower than player's moveSpeed (200) - Adjusted from 180
    onGround: false,
  };

  const enemyHitboxOffset = GameConfig.ENEMY.HITBOX_OFFSET; // Offset to reduce the enemy's collision box size

  let isGameOver = false; // New global variable to track game over state
  let currentGameState = 'menu'; // 'menu', 'playing', 'gameOver'
  let selectedMenuItem = 0; // 0: Easy, 1: Normal, 2: Inclination, 3: Lock Right - for keyboard/gamepad navigation
  let difficulty = 'normal'; // 'easy', 'normal'
  let highScores = JSON.parse(localStorage.getItem('highScores') || '[]'); // Load high scores from localStorage

  // New: Variables for enemy proximity effect
  let enemyPlayerDistance = Infinity; // Stores the calculated distance between enemy and player
  const pulsationEffect = {
    opacity: 0,
    speed: 0,
    normalizedDistance: 1 // New: Stores the normalized distance for border width calculation
  }; // Stores opacity and speed for the pulsating border effect

  // Adaptive Difficulty System - Adjusts game difficulty based on player performance
  const adaptiveDifficulty = {
    playerStats: {
      deaths: 0,
      distanceTraveled: 0,
      itemsCollected: 0,
      timePlayed: 0,
      questsCompleted: 0,
      sprintUsage: 0
    },
    difficultyModifiers: {
      enemySpeed: 1.0,
      objectFrequency: 1.0,
      staminaDrain: 1.0,
      jumpPower: 1.0
    },
    performanceMetrics: {
      survivalRate: 1.0, // Distance per death
      collectionRate: 0, // Items per minute
      explorationRate: 0, // Houses entered per minute
      skillRating: 0 // Overall skill assessment
    },

    updateStats: function(dt) {
      this.playerStats.timePlayed += dt;

      // Update performance metrics
      if (this.playerStats.deaths > 0) {
        this.performanceMetrics.survivalRate = this.playerStats.distanceTraveled / this.playerStats.deaths;
      }

      if (this.playerStats.timePlayed > 0) {
        this.performanceMetrics.collectionRate = (this.playerStats.itemsCollected * 60) / this.playerStats.timePlayed;
        this.performanceMetrics.explorationRate = (this.playerStats.questsCompleted * 60) / this.playerStats.timePlayed;
      }

      // Calculate overall skill rating (0-1 scale)
      const survivalScore = Math.min(1.0, this.performanceMetrics.survivalRate / 500); // 500m per death is good
      const collectionScore = Math.min(1.0, this.performanceMetrics.collectionRate / 2); // 2 items per minute is good
      const explorationScore = Math.min(1.0, this.performanceMetrics.explorationRate / 0.5); // 1 house per 2 minutes is good

      this.performanceMetrics.skillRating = (survivalScore + collectionScore + explorationScore) / 3;

      // Adjust difficulty modifiers based on skill rating
      this.adjustDifficulty();
    },

    recordEvent: function(eventType, value = 1) {
      switch (eventType) {
        case 'death':
          this.playerStats.deaths += value;
          break;
        case 'distance':
          this.playerStats.distanceTraveled = Math.max(this.playerStats.distanceTraveled, value);
          break;
        case 'item_collected':
          this.playerStats.itemsCollected += value;
          break;
        case 'quest_completed':
          this.playerStats.questsCompleted += value;
          break;
        case 'sprint_used':
          this.playerStats.sprintUsage += value;
          break;
      }
    },

    adjustDifficulty: function() {
      const skill = this.performanceMetrics.skillRating;

      // Adjust enemy speed based on player skill
      if (skill < 0.3) {
        // Beginner: slower enemies
        this.difficultyModifiers.enemySpeed = 0.7;
      } else if (skill < 0.6) {
        // Intermediate: normal speed
        this.difficultyModifiers.enemySpeed = 1.0;
      } else {
        // Advanced: faster enemies
        this.difficultyModifiers.enemySpeed = 1.3;
      }

      // Adjust object frequency
      if (skill < 0.4) {
        // More collectibles for beginners
        this.difficultyModifiers.objectFrequency = 1.5;
      } else if (skill < 0.7) {
        // Normal frequency
        this.difficultyModifiers.objectFrequency = 1.0;
      } else {
        // Fewer collectibles, more challenges
        this.difficultyModifiers.objectFrequency = 0.7;
      }

      // Adjust stamina drain
      if (skill < 0.5) {
        // Easier stamina management for beginners
        this.difficultyModifiers.staminaDrain = 0.8;
      } else {
        // Normal stamina drain
        this.difficultyModifiers.staminaDrain = 1.0;
      }

      // Apply difficulty modifiers
      enemy.speed = GameConfig.ENEMY.SPEED * this.difficultyModifiers.enemySpeed;
      staminaBar.drainSpeed = GameConfig.STAMINA_BAR.DRAIN_SPEED * this.difficultyModifiers.staminaDrain;
    },

    getDifficultyDescription: function() {
      const skill = this.performanceMetrics.skillRating;
      if (skill < 0.3) return "Modo Iniciante - Facilitando sua jornada!";
      if (skill < 0.6) return "Modo Intermediário - Desafiando suas habilidades!";
      return "Modo Avançado - Mestre do Pepper Hat!";
    },

    render: function(ctx) {
      // Show current difficulty level
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      const desc = this.getDifficultyDescription();
      ctx.fillText(desc, 10, GAME_HEIGHT - 20);

      // Show skill rating for debugging (can be removed in production)
      ctx.fillStyle = '#FFFF00';
      ctx.font = '10px Arial';
      ctx.fillText(`Habilidade: ${(this.performanceMetrics.skillRating * 100).toFixed(0)}%`, 10, GAME_HEIGHT - 5);
    }
  };

  // Object Pooling System - Reuses objects to improve performance
  const objectPool = {
    pools: new Map(),

    createPool: function(type, factory, initialSize = 10) {
      if (!this.pools.has(type)) {
        this.pools.set(type, []);
      }
      const pool = this.pools.get(type);

      // Pre-populate pool
      for (let i = 0; i < initialSize; i++) {
        pool.push(factory());
      }
    },

    get: function(type, factory) {
      const pool = this.pools.get(type);
      if (pool && pool.length > 0) {
        return pool.pop();
      }
      // Create new object if pool is empty
      return factory ? factory() : null;
    },

    release: function(type, obj) {
      const pool = this.pools.get(type);
      if (pool) {
        // Reset object to default state
        this.resetObject(obj);
        pool.push(obj);
      }
    },

    resetObject: function(obj) {
      // Reset common properties
      if (obj.lifetime !== undefined) obj.lifetime = 0;
      if (obj.alpha !== undefined) obj.alpha = 1.0;
      if (obj.x !== undefined) obj.x = 0;
      if (obj.y !== undefined) obj.y = 0;
      if (obj.vx !== undefined) obj.vx = 0;
      if (obj.vy !== undefined) obj.vy = 0;
    },

    getPoolStats: function() {
      const stats = {};
      for (const [type, pool] of this.pools) {
        stats[type] = pool.length;
      }
      return stats;
    }
  };

  // Enhanced Visual Feedback System - Particles, effects, and better UI
  const visualEffects = {
    particles: [],
    screenShake: { intensity: 0, duration: 0 },
    screenFlash: { color: null, intensity: 0, duration: 0 },

    init: function() {
      // Initialize particle pool
      objectPool.createPool('particle', () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        color: '#FFFFFF', size: 1,
        lifetime: 0, maxLifetime: 0, alpha: 1.0,
        active: false
      }), 50); // Pre-create 50 particles
    },

    createParticle: function(x, y, vx, vy, color, size, lifetime) {
      const particle = objectPool.get('particle', () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        color: '#FFFFFF', size: 1,
        lifetime: 0, maxLifetime: 0, alpha: 1.0,
        active: false
      }));

      if (particle) {
        particle.x = x;
        particle.y = y;
        particle.vx = vx;
        particle.vy = vy;
        particle.color = color;
        particle.size = size;
        particle.lifetime = lifetime;
        particle.maxLifetime = lifetime;
        particle.alpha = 1.0;
        particle.active = true;

        this.particles.push(particle);
      }
    },

    triggerScreenShake: function(intensity, duration) {
      this.screenShake.intensity = intensity;
      this.screenShake.duration = duration;
    },

    triggerScreenFlash: function(color, intensity, duration) {
      this.screenFlash.color = color;
      this.screenFlash.intensity = intensity;
      this.screenFlash.duration = duration;
    },

    update: function(dt) {
      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.lifetime -= dt;
        particle.alpha = particle.lifetime / particle.maxLifetime;

        if (particle.lifetime <= 0) {
          // Return particle to pool instead of destroying
          objectPool.release('particle', particle);
          this.particles.splice(i, 1);
        }
      }

      // Update screen shake
      if (this.screenShake.duration > 0) {
        this.screenShake.duration -= dt;
      } else {
        this.screenShake.intensity = 0;
      }

      // Update screen flash
      if (this.screenFlash.duration > 0) {
        this.screenFlash.duration -= dt;
        this.screenFlash.intensity = Math.max(0, this.screenFlash.intensity - dt * 2);
      } else {
        this.screenFlash.color = null;
        this.screenFlash.intensity = 0;
      }
    },

    render: function(ctx) {
      // Apply screen shake
      const shakeX = (Math.random() - 0.5) * this.screenShake.intensity * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShake.intensity * 2;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Apply screen flash
      if (this.screenFlash.color && this.screenFlash.intensity > 0) {
        ctx.fillStyle = this.screenFlash.color;
        ctx.globalAlpha = this.screenFlash.intensity * 0.3;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.globalAlpha = 1.0;
      }

      // Render particles
      for (const particle of this.particles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        ctx.restore();
      }

      ctx.restore();
    },

    // Effect triggers for different events
    onItemCollected: function(x, y) {
      // Create sparkle particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 50 + Math.random() * 50;
        this.createParticle(
          x, y,
          Math.cos(angle) * speed, Math.sin(angle) * speed,
          '#FFD700', 3, 0.5
        );
      }
      this.triggerScreenFlash('#FFFFFF', 0.2, 0.1);
    },

    onQuestCompleted: function() {
      // Create celebration particles
      for (let i = 0; i < 20; i++) {
        this.createParticle(
          GAME_WIDTH / 2 + (Math.random() - 0.5) * 200,
          GAME_HEIGHT / 2 + (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100,
          ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][Math.floor(Math.random() * 4)],
          4, 2.0
        );
      }
      this.triggerScreenShake(5, 0.3);
      this.triggerScreenFlash('#FFFFFF', 0.5, 0.2);
    },

    onSpeedBoostActivated: function(x, y) {
      // Create speed lines effect
      for (let i = 0; i < 12; i++) {
        this.createParticle(
          x + (Math.random() - 0.5) * 60, y,
          (Math.random() - 0.5) * 200, Math.random() * -50,
          '#FFD700', 2, 0.3
        );
      }
    },

    onCrateBroken: function(x, y) {
      // Create debris particles
      for (let i = 0; i < 6; i++) {
        this.createParticle(
          x + (Math.random() - 0.5) * 20, y,
          (Math.random() - 0.5) * 80, Math.random() * -60,
          '#8B4513', 2, 0.8
        );
      }
      this.triggerScreenShake(2, 0.1);
    },

    onSprintActivated: function(x, y) {
      // Create speed trail effect
      for (let i = 0; i < 5; i++) {
        this.createParticle(
          x - 20, y + (Math.random() - 0.5) * 20,
          -100 - Math.random() * 50, (Math.random() - 0.5) * 20,
          '#00FF00', 3, 0.2
        );
      }
    }
  };

  // Quest System - Progressive objectives to give purpose to gameplay
  const questSystem = {
    currentQuest: 0,
    quests: [
      {
        id: 'welcome',
        title: 'Bem-vindo ao Pepper Hat!',
        description: 'Colete 5 itens musicais',
        type: 'collect_notes',
        target: 5,
        progress: 0,
        completed: false,
        reward: { type: 'message', text: 'Parabéns! Você dominou os básicos!' }
      },
      {
        id: 'explorer',
        title: 'Explorador',
        description: 'Entre em 3 casas diferentes',
        type: 'enter_houses',
        target: 3,
        progress: 0,
        completed: false,
        reward: { type: 'stamina_boost', amount: 0.5 }
      },
      {
        id: 'sprinter',
        title: 'Corredor Veloz',
        description: 'Use o sprint 10 vezes',
        type: 'use_sprint',
        target: 10,
        progress: 0,
        completed: false,
        reward: { type: 'speed_boost', amount: 1.2 }
      },
      {
        id: 'survivor',
        title: 'Sobrevivente',
        description: 'Alcance 2000 metros de distância',
        type: 'distance',
        target: 2000,
        progress: 0,
        completed: false,
        reward: { type: 'message', text: 'Incrível! Você é um verdadeiro explorador!' }
      },
      {
        id: 'collector',
        title: 'Colecionador',
        description: 'Colete 20 itens no total',
        type: 'collect_total',
        target: 20,
        progress: 0,
        completed: false,
        reward: { type: 'stamina_boost', amount: 1.0 }
      }
    ],
    activeNotification: null,
    notificationTimer: 0,

    updateProgress: function(type, amount = 1) {
      if (this.currentQuest >= this.quests.length) return;

      const quest = this.quests[this.currentQuest];
      if (quest.completed) return;

      // Update progress based on type
      switch (type) {
        case 'collect_note':
          if (quest.type === 'collect_notes' || quest.type === 'collect_total') {
            quest.progress += amount;
          }
          break;
        case 'collect_record':
          if (quest.type === 'collect_total') {
            quest.progress += amount;
          }
          break;
        case 'enter_house':
          if (quest.type === 'enter_houses') {
            quest.progress += amount;
          }
          break;
        case 'use_sprint':
          if (quest.type === 'use_sprint') {
            quest.progress += amount;
          }
          break;
        case 'distance':
          if (quest.type === 'distance') {
            quest.progress = Math.max(quest.progress, amount);
          }
          break;
      }

      // Check if quest is completed
      if (quest.progress >= quest.target && !quest.completed) {
        quest.completed = true;
        this.showNotification(`🎉 ${quest.title} Concluída!\n${quest.reward.text || 'Recompensa recebida!'}`);
        this.applyReward(quest.reward);

        // Record quest completion in adaptive difficulty
        adaptiveDifficulty.recordEvent('quest_completed');

        // Trigger visual celebration effect
        visualEffects.onQuestCompleted();

        // Move to next quest after a delay
        setTimeout(() => {
          this.currentQuest++;
          if (this.currentQuest < this.quests.length) {
            const nextQuest = this.quests[this.currentQuest];
            this.showNotification(`📋 Nova Missão:\n${nextQuest.title}\n${nextQuest.description}`);
          }
        }, 3000);
      }
    },

    applyReward: function(reward) {
      switch (reward.type) {
        case 'stamina_boost':
          staminaBar.fill = Math.min(1.0, staminaBar.fill + reward.amount);
          break;
        case 'speed_boost':
          player.baseMoveSpeed *= reward.amount;
          setTimeout(() => {
            player.baseMoveSpeed /= reward.amount;
          }, 10000); // 10 seconds boost
          break;
        case 'message':
          // Message already shown in notification
          break;
      }
    },

    showNotification: function(message) {
      this.activeNotification = message;
      this.notificationTimer = 180; // 3 seconds at 60fps
    },

    update: function(dt) {
      if (this.notificationTimer > 0) {
        this.notificationTimer -= dt * 60; // Assuming 60fps
        if (this.notificationTimer <= 0) {
          this.activeNotification = null;
        }
      }
    },

    render: function(ctx) {
      if (this.activeNotification) {
        const alpha = Math.min(1.0, this.notificationTimer / 60); // Fade in/out
        ctx.save();
        ctx.globalAlpha = alpha;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 50, 400, 100);

        // Border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 50, 400, 100);

        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const lines = this.activeNotification.split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20 + index * 20);
        });

        ctx.restore();
      }

      // Show current quest progress
      if (this.currentQuest < this.quests.length) {
        const quest = this.quests[this.currentQuest];
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Missão: ${quest.description}`, 10, GAME_HEIGHT - 60);
        ctx.fillText(`Progresso: ${Math.min(quest.progress, quest.target)}/${quest.target}`, 10, GAME_HEIGHT - 40);
      }
    }
  };

  // Player state
  const player = {
    x: GAME_WIDTH / 2 - GameConfig.PLAYER.INITIAL_X_OFFSET, // Centered horizontally using a direct value (50 / 2 = 25)
    y: 0, // Will be set correctly after groundY is calculated
    width: GameConfig.PLAYER.WIDTH, // Reduced from 100 to 50
    initialHeight: GameConfig.PLAYER.INITIAL_HEIGHT, // Store initial height
    crouchHeight: GameConfig.PLAYER.CROUCH_HEIGHT, // Crouching height (half of initialHeight)
    height: GameConfig.PLAYER.INITIAL_HEIGHT, // Reduced from 120 to 60. This will change when crouching.
    vx: 0,
    vy: 0,
    onGround: false,
    facingRight: true,
    idleTime: 0, // Track how long the player has been idle
    lastAnim: 'idle', // Track the previous animation state
    // Animation data.  Each key holds an array of Image objects
    animations: {
      idle: [],
      walk: [],
      jump: [],
      crouch: [] // New animation array for crouching
    },
    currentAnim: 'idle',
    animIndex: 0,
    animTimer: 0,
    animSpeed: 0.2, // seconds per frame (Restored)
    idleTime: 0, // Time spent idle for potential future mechanics
    isAcceleratedJump: false, // Tracks if player is in an accelerated jump
    jumpAccelerationFactor: 1.0, // Factor to multiply player.vx during accelerated jump
    baseMoveSpeed: GameConfig.PLAYER.BASE_MOVE_SPEED, // pixels per second - Moved to player object
  };

  // Input state
  const input = {
    left: false,
    right: false,
    jump: false,
    crouch: false, // New input for crouching
    accelerometerActive: false, // New: Indicates if accelerometer is actively providing input
    accelerometerSpeedFactor: 0, // New: Stores the speed factor from accelerometer tilt
  };

  // New: Store neutral inclination values for dynamic calibration
  let neutralGamma = 0;
  let neutralBeta = 0;

  // New: Stores the last device orientation event for calibration
  let lastDeviceOrientationEvent = null;

  // World objects for procedural generation
  let worldObjects = [];

  let groundY = 0;
  let lastTime = 0;
  let scrollX = 0;

  // Procedural generation parameters
  const VIEW_RANGE = GameConfig.GENERATION.VIEW_RANGE * GAME_WIDTH; // How far ahead/behind the player to generate/keep objects
  const GENERATION_BUFFER = GameConfig.GENERATION.BUFFER * GAME_WIDTH; // How far past the view range to generate
  let lastGeneratedChunkX = 0; // Tracks the furthest X-coordinate generated

  // Physics Constants
  const GRAVITY = GameConfig.PHYSICS.GRAVITY; // pixels per second squared

  // Game Physics & Player Movement Constants
  const STAMINA_LOW_SPEED_FACTOR = GameConfig.PHYSICS.STAMINA_LOW_SPEED_FACTOR; // Factor when stamina is low
  const JUMP_IMPULSE = GameConfig.PHYSICS.JUMP_IMPULSE; // Player's jump impulse (pixels/second)
  const ACCELERATED_JUMP_FACTOR = GameConfig.PHYSICS.ACCELERATED_JUMP_FACTOR; // Initial acceleration factor for jump
  const ACCELERATED_JUMP_DECAY_RATE = GameConfig.PHYSICS.ACCELERATED_JUMP_DECAY_RATE; // Rate at which jump acceleration decays
  const GROUND_TOLERANCE = GameConfig.PHYSICS.GROUND_TOLERANCE; // Small tolerance for ground detection

  // Animation Constants
  const ANIMATION_SPEED = GameConfig.ANIMATION.SPEED; // seconds per frame
  const JUMP_ANIM_ASCENDING_INDEX = GameConfig.ANIMATION.JUMP_ASCENDING_INDEX; // Index for 1subindo.png
  const JUMP_ANIM_DECELERATING_INDEX = GameConfig.ANIMATION.JUMP_DECELERATING_INDEX; // Index for 2desacelerando.png
  const JUMP_ANIM_DESCENDING_INDEX = GameConfig.ANIMATION.JUMP_DESCENDING_INDEX; // Index for 3caindo.png

  // Render Constants
  const PARALLAX_FACTOR_BACKGROUND = GameConfig.RENDER.PARALLAX_FACTOR_BACKGROUND; // 20% scroll speed for main background
  const PARALLAX_FACTOR_CITY = GameConfig.RENDER.PARALLAX_FACTOR_CITY; // 10% scroll speed for distant city
  const PARALLAX_FACTOR_LAYER_BACKGROUND = GameConfig.RENDER.PARALLAX_FACTOR_LAYER_BACKGROUND; // 50% parallax for background layer objects

  // Menu Constants
  const MENU_TITLE_Y_OFFSET = GameConfig.MENU.TITLE_Y_OFFSET;
  const BUTTON_WIDTH = GameConfig.MENU.BUTTON_WIDTH;
  const BUTTON_HEIGHT = GameConfig.MENU.BUTTON_HEIGHT;
  const BUTTON_SPACING_Y = GameConfig.MENU.BUTTON_SPACING_Y; // Spacing between buttons

  const EASY_BUTTON_Y_OFFSET = GameConfig.MENU.EASY_BUTTON_Y_OFFSET;
  const NORMAL_BUTTON_Y_OFFSET = GameConfig.MENU.NORMAL_BUTTON_Y_OFFSET;
  const INCLINATION_BUTTON_Y_OFFSET = GameConfig.MENU.INCLINATION_BUTTON_Y_OFFSET;
  const LOCK_RIGHT_BUTTON_Y_OFFSET = GameConfig.MENU.LOCK_RIGHT_BUTTON_Y_OFFSET;

  const RESTART_BUTTON_WIDTH = GameConfig.GAME_OVER_MENU.RESTART_BUTTON_WIDTH;
  const RESTART_BUTTON_HEIGHT = GameConfig.GAME_OVER_MENU.RESTART_BUTTON_HEIGHT;
  const RESTART_BUTTON_Y_OFFSET_GAME_OVER = GameConfig.GAME_OVER_MENU.RESTART_BUTTON_Y_OFFSET; // Position from top in Game Over screen

  // Accelerometer Constants
  const ACCELEROMETER_TILT_THRESHOLD = GameConfig.ACCELEROMETER.TILT_THRESHOLD; // Degrees to start moving
  const ACCELEROMETER_MAX_TILT = GameConfig.ACCELEROMETER.MAX_TILT; // Max tilt for full speed

  let houseFurniture = []; // Stores furniture objects when inside a house
  let isInHouse = false; // New state to track if player is inside a house
  let lastEntranceDoor = null; // Stores the door object the player last entered through

  // Function to update the positions of the stamina and animated bars
  function updateBarPositions() {
    animatedBar.x = GAME_WIDTH / 2 - animatedBar.width / 2;
    staminaBar.x = GAME_WIDTH / 2 - staminaBar.width / 2;
    staminaBar.y = animatedBar.y - staminaBar.height - GameConfig.BAR_VERTICAL_SPACING; // Position staminaBar above animatedBar
  }

  // Load all images and start the game loop once complete
  function loadImages() {
    const promises = Object.keys(GameConfig.ASSETS).map(key => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = GameConfig.ASSETS[key];
        img.onload = () => {
          images[key] = img;
          console.log(`Image loaded: ${key} -> ${GameConfig.ASSETS[key]}`); // Log image loading
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Error loading image: ${key} -> ${GameConfig.ASSETS[key]}`, err); // Log image loading errors
          reject(err);
        };
      });
    });
    return Promise.all(promises);
  }

  // Resize the canvas to fill the whole window
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Log dimensions for debugging
    console.log(`Resize: window.innerWidth=${window.innerWidth}, window.innerHeight=${window.innerHeight}`);
    console.log(`Resize: canvas.width=${canvas.width}, canvas.height=${canvas.height}`);
    console.log(`Resize: GAME_HEIGHT=${GAME_HEIGHT}, groundY=${groundY}, player.y=${player.y}`); // Added for debugging

    // Update GAME_WIDTH and GAME_HEIGHT to reflect the new canvas dimensions
    // This will ensure game elements scale correctly with the new canvas size
    GAME_WIDTH = canvas.width;
    GAME_HEIGHT = canvas.height;

    // Log dimensions for debugging AFTER updating GAME_WIDTH and GAME_HEIGHT
    console.log(`Resize: new GAME_WIDTH=${GAME_WIDTH}, new GAME_HEIGHT=${GAME_HEIGHT}`);
    console.log(`Resize: groundY before=${groundY}, player.y before=${player.y}`);

    // Recalculate groundY based on the new GAME_HEIGHT
    if (images.ground) {
      groundY = GAME_HEIGHT - images.ground.height;
    }

    // Adjust player and enemy Y positions to stay on the new groundY if they were on ground
    if (player.onGround) {
      player.y = groundY - player.height;
    }
    if (enemy.onGround) {
      enemy.y = groundY - enemy.height;
    }
    
    // Adjust existing world objects to new groundY
    const oldGroundY = groundY; // This will be the new groundY
    worldObjects.forEach(obj => {
      if (obj.type === 'structure') {
        // Recalculate structure position based on new groundY
        const houseHeight = obj.height;
        obj.y = groundY - houseHeight;
        obj.walkableSurfaceY = groundY - houseHeight;
      } else if (obj.type === 'fence') {
        // Recalculate fence position
        const fenceHeight = obj.height;
        obj.y = groundY;
        obj.walkableSurfaceY = groundY - fenceHeight;
      } else if (obj.type === 'tree' || obj.type === 'streetlight' || obj.type === 'bush' || obj.type === 'pole') {
        // These objects should be on the ground
        obj.y = groundY;
      } else if (obj.type === 'collectible') {
        // Recalculate collectible position
        const itemSize = obj.size || 32;
        obj.y = groundY - itemSize - Math.random() * 30;
      }
    });
    
    // Adjust player position if inside a house
    if (isInHouse) {
      // Update house floor Y position
      window.houseFloorY = GAME_HEIGHT / 2;
      // Reposition player on the house floor
      player.y = window.houseFloorY - player.initialHeight;
    }
    
    console.log(`Resize: groundY after=${groundY}, player.y after=${player.y}`);

    updateBarPositions(); // Update bar positions on resize
  }

  // Function to generate world objects procedurally
  function generateWorldObjects(startX, endX) {
    const segmentWidth = GameConfig.GENERATION.SEGMENT_WIDTH; // Average spacing between objects
    let currentX = startX;
    while (currentX < endX) {
      const rand = Math.random();
      if (rand < GameConfig.GENERATION.PROB_HOUSE) { // House (structure)
        const isBackground = Math.random() < GameConfig.GENERATION.PROB_BACKGROUND_HOUSE; // 30% chance to be a background house
        const scale = isBackground ? 0.6 + Math.random() * 0.2 : 1; // Smaller for background
        const houseWidth = (150 + Math.random() * 100) * scale; // Random width between 150-250, scaled
        const houseHeight = (100 + Math.random() * 100) * scale; // Random height between 100-200, scaled
        const hasWindow = Math.random() > GameConfig.GENERATION.PROB_HAS_WINDOW;
        const hasDoor = Math.random() > GameConfig.GENERATION.PROB_HAS_DOOR;
        const hasRoof = Math.random() > GameConfig.GENERATION.PROB_HAS_ROOF;

        const bodyColors = isBackground ? GameConfig.COLORS.PASTEL_DESATURATED : GameConfig.COLORS.PASTEL_LIGHT;
        const skyColor = '#87CEEB'; // Define sky color for exclusion
        const filteredBodyColors = bodyColors.filter(color => color !== skyColor);
        const selectedBodyColor = filteredBodyColors[Math.floor(Math.random() * filteredBodyColors.length)];
        const selectedWindowColor = hasWindow ? GameConfig.COLORS.WINDOW[Math.floor(Math.random() * GameConfig.COLORS.WINDOW.length)] : null;
        const selectedDoorColor = hasDoor ? GameConfig.COLORS.DOOR[Math.floor(Math.random() * GameConfig.COLORS.DOOR.length)] : null;

        const doorWidth = houseWidth / 4;
        const doorHeight = houseHeight / 2;
        let doorXOffset;
        if (hasWindow) {
          doorXOffset = houseWidth - doorWidth - (houseWidth / 8);
        } else {
          doorXOffset = (houseWidth / 2) - (doorWidth / 2);
        }
        const doorYOffset = houseHeight - doorHeight;

        worldObjects.push({
          type: 'structure',
          x: currentX,
          y: groundY - houseHeight,
          width: houseWidth,
          height: houseHeight,
          bodyColor: selectedBodyColor,
          windowColor: selectedWindowColor,
          doorColor: selectedDoorColor,
          hasRoof: hasRoof,
          layer: isBackground ? 'background' : 'foreground',
          isWalkable: true, // Allow player to walk on top of the structure
          walkableSurfaceY: groundY - houseHeight, // The top of the house
          // Add door collision area if it has a door
          doorArea: hasDoor ? {
            x_offset: doorXOffset,
            y_offset: doorYOffset,
            width: doorWidth,
            height: doorHeight,
          } : null,
          houseInterior: hasDoor ? null : null, // New: Stores generated furniture for this house
        });
      } else if (rand < (GameConfig.GENERATION.PROB_HOUSE + GameConfig.GENERATION.PROB_TREE)) { // Tree
        const trunkHeight = 80 + Math.random() * 70; // Random height between 80-150
        const canopyRadius = 50 + Math.random() * 50; // Random radius between 50-100
        worldObjects.push({
          type: 'tree',
          x: currentX,
          y: groundY,
          trunkHeight: trunkHeight,
          canopyRadius: canopyRadius,
          trunkColor: '#8B4513',
          canopyColor: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random green shade
        });
      } else if (rand < (GameConfig.GENERATION.PROB_HOUSE + GameConfig.GENERATION.PROB_TREE + GameConfig.GENERATION.PROB_STREETLIGHT)) { // Streetlight
        const poleHeight = 150 + Math.random() * 50; // Random height between 150-200
        const poleWidth = 10; // Fixed width
        worldObjects.push({
          type: 'streetlight',
          x: currentX,
          y: groundY,
          width: poleWidth,
          height: poleHeight,
          color: '#696969', // Dim Grey
          lightColor: '#FFD700', // Gold light
          layer: 'foreground',
        });
      } else if (rand < (GameConfig.GENERATION.PROB_HOUSE + GameConfig.GENERATION.PROB_TREE + GameConfig.GENERATION.PROB_STREETLIGHT + GameConfig.GENERATION.PROB_FENCE)) { // Fence
        const fenceHeight = 40; // Fixed height
        const fenceWidth = 80 + Math.random() * 40; // Random width
        worldObjects.push({
          type: 'fence',
          x: currentX,
          y: groundY,
          width: fenceWidth,
          height: fenceHeight,
          color: '#A0522D', // Sienna
          layer: 'foreground',
          isWalkable: true, // Allow player to walk on top of the fence
          walkableSurfaceY: groundY - fenceHeight, // The top of the fence
        });
      } else if (rand < (GameConfig.GENERATION.PROB_HOUSE + GameConfig.GENERATION.PROB_TREE + GameConfig.GENERATION.PROB_STREETLIGHT + GameConfig.GENERATION.PROB_FENCE + GameConfig.GENERATION.PROB_BUSH)) { // Bush
        const bushSize = 30 + Math.random() * 20; // Random size
        worldObjects.push({
          type: 'bush',
          x: currentX,
          y: groundY,
          size: bushSize,
          color: '#228B22', // ForestGreen
          layer: 'foreground',
        });
      } else { // Pole or interactive object (remaining chance)
        const randObj = Math.random();
        if (randObj < 0.7) { // 70% chance for regular pole
          const poleHeight = 40 + Math.random() * 20; // Smaller poles, random height between 40-60
          const poleWidth = 10; // Fixed width for poles
          worldObjects.push({
            type: 'pole',
            x: currentX,
            y: groundY,
            width: poleWidth,
            height: poleHeight,
            color: '#36454F', // Dark Grey color
            collidable: true, // Add collidable property
            layer: 'foreground',
          });
        } else if (randObj < 0.85) { // 15% chance for speed boost platform
          worldObjects.push({
            type: 'speed_boost',
            x: currentX,
            y: groundY - 20, // Slightly above ground
            width: 60,
            height: 20,
            color: '#FFD700', // Gold color
            collidable: true,
            isWalkable: true,
            walkableSurfaceY: groundY - 20,
            layer: 'foreground',
            activated: false,
          });
        } else { // 15% chance for breakable crate
          worldObjects.push({
            type: 'breakable_crate',
            x: currentX,
            y: groundY - 40,
            width: 30,
            height: 40,
            color: '#8B4513', // Brown
            collidable: true,
            layer: 'foreground',
            broken: false,
            health: 1, // Breaks on one hit/jump
          });
        }
      }
      currentX += segmentWidth + Math.random() * 100; // Advance position with some randomness

      // 20% chance to place a collectible
      if (Math.random() < GameConfig.GENERATION.PROB_COLLECTIBLE) {
        const itemType = Math.random() < GameConfig.GENERATION.PROB_NOTE_COLLECTIBLE ? 'note' : 'record';
        const itemSize = 24; // Standard size for collectibles
        worldObjects.push({
          type: 'collectible',
          itemType: itemType,
          x: currentX + Math.random() * 50, // Slightly offset from currentX
          y: groundY - itemSize - Math.random() * 30, // Random height above ground
          size: itemSize,
          collected: false,
          layer: 'foreground',
        });
      }
    }
    // Sort objects by x-coordinate for correct rendering order
    worldObjects.sort((a, b) => a.x - b.x);
  }

  // Function to generate random furniture for the house interior
  function generateHouseFurniture(currentHouse) {
    const newFurniture = [];
    const numFurniture = 3 + Math.floor(Math.random() * 4); // 3 to 6 pieces of furniture
    // Define interior room dimensions for furniture placement
    const floorY = GAME_HEIGHT / 2;
    const interiorXStart = GAME_WIDTH * 0.2; // Start of the back wall
    const interiorWidth = GAME_WIDTH * 0.6; // Width of the back wall area

    // Define the 'EXIT' door area for collision checking
    const doorWidth = 60;
    const doorHeight = 100;
    const doorX = GAME_WIDTH / 2 - (doorWidth / 2);
    const doorY = floorY - doorHeight;
    const doorSafeZonePadding = 20; // Extra padding around the door
    const exitDoorRect = {
      x: doorX - doorSafeZonePadding,
      y: doorY - doorSafeZonePadding, // Include space for 'EXIT' text
      width: doorWidth + (doorSafeZonePadding * 2),
      height: doorHeight + (doorSafeZonePadding * 2) + 20, // Add space for 'EXIT' text height
    };

    // Helper function for AABB collision detection
    const checkCollision = (rect1, rect2) => {
      return rect1.x < rect2.x + rect2.width &&
             rect1.x + rect1.width > rect2.x &&
             rect1.y < rect2.y + rect2.height &&
             rect1.y + rect1.height > rect2.y;
    };

    for (let i = 0; i < numFurniture; i++) {
      const furnitureType = GameConfig.FURNITURE_TYPES[Math.floor(Math.random() * GameConfig.FURNITURE_TYPES.length)];
      const color = GameConfig.COLORS.SOFT_PASTEL_LIGHT[Math.floor(Math.random() * GameConfig.COLORS.SOFT_PASTEL_LIGHT.length)];

      const width = furnitureType.minWidth + Math.random() * (furnitureType.maxWidth - furnitureType.minWidth);
      const height = furnitureType.minHeight + Math.random() * (furnitureType.maxHeight - furnitureType.minHeight);

      let placed = false;
      let attempts = 0;
      const maxAttempts = 20; // Max attempts to place a furniture item without overlap

      while (!placed && attempts < maxAttempts) {
        // Random X position within the interior width
        const x = interiorXStart + Math.random() * (interiorWidth - width);
        // Y position is on the floor
        const y = floorY; // Furniture base is at floorY

        const newFurnitureRect = {
          x: x,
          y: y - height, // Top-left corner for collision check
          width: width,
          height: height,
        };

        let collision = false;
        if (checkCollision(newFurnitureRect, exitDoorRect)) {
          collision = true; // Collision with exit door
        }

        if (!collision) {
        for (const existingItem of newFurniture) {
          const existingRect = {
            x: existingItem.x,
            y: existingItem.y - existingItem.height,
            width: existingItem.width,
            height: existingItem.height,
          };
          if (checkCollision(newFurnitureRect, existingRect)) {
            collision = true;
            break;
            }
          }
        }

        if (!collision) {
          newFurniture.push({
            type: furnitureType.type,
            x: x,
            y: y, // Store y as the base of the furniture
            width: width,
            height: height,
            color: color,
          });
          placed = true;
        }
        attempts++;
      }
    }
    return newFurniture;
  }

  // Function to draw the interior of a house with perspective
  function drawRoom(exitDoorX, exitDoorY) {
    const floorColor = '#D2B48C'; // Tan
    const wallColor = '#F0E68C'; // Khaki
    const backWallColor = '#BDB76B'; // Dark Khaki
    const doorColor = '#8B4513'; // SaddleBrown

    const floorY = GAME_HEIGHT / 2; // Top of the floor
    const floorHeight = GAME_HEIGHT / 2; // Height of the floor
    
    // Store the house floor Y position globally for player positioning
    window.houseFloorY = floorY;

    // Floor
    ctx.fillStyle = floorColor;
    ctx.fillRect(0, floorY, GAME_WIDTH, floorHeight);

    // Side Walls (trapezoids for perspective)
    // Left Wall
    ctx.fillStyle = wallColor;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(0, 0);
    ctx.lineTo(GAME_WIDTH * 0.2, 0);
    ctx.lineTo(GAME_WIDTH * 0.2, floorY);
    ctx.closePath();
    ctx.fill();

    // Right Wall
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH, floorY);
    ctx.lineTo(GAME_WIDTH, 0);
    ctx.lineTo(GAME_WIDTH * 0.8, 0);
    ctx.lineTo(GAME_WIDTH * 0.8, floorY);
    ctx.closePath();
    ctx.fill();

    // Back Wall
    ctx.fillStyle = backWallColor;
    ctx.fillRect(GAME_WIDTH * 0.2, 0, GAME_WIDTH * 0.6, floorY);

    // Exit Door
    ctx.fillStyle = doorColor;
    const doorWidth = 60;
    const doorHeight = 100;
    const doorX = exitDoorX - (doorWidth / 2); // Center the door
    const doorY = floorY - doorHeight; // Position door on the floor level
    ctx.fillRect(doorX, doorY, doorWidth, doorHeight);

    // Door frame (minimalist)
    ctx.strokeStyle = '#5A2D0C'; // Darker brown
    ctx.lineWidth = 3;
    ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);

    // EXIT text above the door
    ctx.fillStyle = '#FFFFFF'; // White text
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', doorX + (doorWidth / 2), doorY - 10); // 10 pixels above the door
  }

  // Function to draw minimalist furniture inside the house
  function drawFurniture(type, x, y, width, height, color) {
    ctx.fillStyle = color;
    const drawX = x;
    const drawY = y - height; // Draw from bottom up

    switch (type) {
      case 'refrigerator':
        ctx.fillRect(drawX, drawY, width, height);
        // Door handle
        ctx.fillStyle = '#A9A9A9'; // DarkGrey
        ctx.fillRect(drawX + width - 10, drawY + (height / 3), 5, height / 3);
        break;
      case 'cabinet':
        ctx.fillRect(drawX, drawY, width, height);
        // Cabinet doors
        ctx.strokeStyle = '#5A2D0C'; // Darker brown
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, width / 2, height);
        ctx.strokeRect(drawX + width / 2, drawY, width / 2, height);
        break;
      case 'table':
        // Tabletop
        ctx.fillRect(drawX, drawY, width, 10);
        // Table legs
        ctx.fillRect(drawX, drawY + 10, 5, height - 10);
        ctx.fillRect(drawX + width - 5, drawY + 10, 5, height - 10);
        break;
      case 'television':
        ctx.fillRect(drawX, drawY, width, height);
        // Screen
        ctx.fillStyle = '#2F4F4F'; // DarkSlateGrey
        ctx.fillRect(drawX + 5, drawY + 5, width - 10, height - 10);
        break;
      case 'sofa':
        ctx.fillRect(drawX, drawY + height / 3, width, height * 2 / 3); // Base of the sofa
        ctx.fillRect(drawX, drawY, width / 5, height / 3); // Left armrest
        ctx.fillRect(drawX + width * 4 / 5, drawY, width / 5, height / 3); // Right armrest
        break;
      case 'plant':
        ctx.fillStyle = '#8B4513'; // Brown pot
        ctx.fillRect(drawX + width / 4, drawY + height * 2 / 3, width / 2, height / 3);
        ctx.fillStyle = '#228B22'; // ForestGreen leaves
        ctx.beginPath();
        ctx.arc(drawX + width / 2, drawY + height / 3, width / 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'painting':
        ctx.strokeStyle = '#8B4513'; // Brown frame
        ctx.lineWidth = 5;
        ctx.strokeRect(drawX, drawY, width, height);
        ctx.fillStyle = '#A9A9A9'; // Grey canvas
        ctx.fillRect(drawX + 5, drawY + 5, width - 10, height - 10);
        break;
      case 'bookshelf':
        ctx.fillStyle = '#8B4513'; // Brown for the main body
        ctx.fillRect(drawX, drawY, width, height);
        // Shelves
        ctx.fillStyle = '#5A2D0C'; // Darker brown for shelves
        ctx.fillRect(drawX, drawY + height / 3 - 2, width, 4); // First shelf
        ctx.fillRect(drawX, drawY + height * 2 / 3 - 2, width, 4); // Second shelf
        break;
      case 'chair':
        ctx.fillStyle = '#8B4513'; // Brown for chair
        ctx.fillRect(drawX, drawY + height / 2, width, height / 2); // Seat
        ctx.fillRect(drawX + width / 4, drawY, width / 2, height / 2); // Backrest
        break;
      default:
        ctx.fillRect(drawX, drawY, width, height);
        break;
    }
  }

  // Function to draw a generic structure (house, building, dog house)
  function drawStructure(x, y, width, height, bodyColor, windowColor, doorColor, hasRoof, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    // Main body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(drawX, y, width, height);

    // Window (if applicable)
    if (windowColor) {
      const windowSize = width / 4; // Proportionate window size
      let windowX;
      if (doorColor) {
        windowX = drawX + (width / 8); // Place window to the left if there's also a door
      } else {
        windowX = drawX + (width / 2) - (windowSize / 2); // Center window if no door
      }
      const windowY = y + (height / 4);
      ctx.fillStyle = windowColor;
      ctx.fillRect(windowX, windowY, windowSize, windowSize);
    }

    // Door (if applicable)
    if (doorColor) {
      const doorWidth = width / 4;
      const doorHeight = height / 2;
      let doorX;
      if (windowColor) {
        doorX = drawX + width - doorWidth - (width / 8); // Place door to the right if there's also a window
      } else {
        doorX = drawX + (width / 2) - (doorWidth / 2); // Center door if no window
      }
      const doorY = y + height - doorHeight;
      ctx.fillStyle = doorColor;
      ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
    }

    // Roof (if applicable)
    if (hasRoof) {
      ctx.fillStyle = '#8B4513'; // SaddleBrown color for roof
      ctx.beginPath();
      ctx.moveTo(drawX - 10, y);
      ctx.lineTo(drawX + width + 10, y);
      ctx.lineTo(drawX + (width / 2), y - (height / 3));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Function to draw a pole
  function drawPole(x, y, height, color, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    ctx.fillStyle = color;
    ctx.fillRect(drawX, y - height, 10, height); // Pole body
  }

  // Function to draw a tree
  function drawTree(x, y, trunkHeight, canopyRadius, trunkColor, canopyColor, parallaxScrollX) {
    const drawX = x - parallaxScrollX;

    // Trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(drawX - 10, y - trunkHeight, 20, trunkHeight);

    // Canopy (a simple circle for now)
    ctx.fillStyle = canopyColor;
    ctx.beginPath();
    ctx.arc(drawX, y - trunkHeight - (canopyRadius / 2), canopyRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Function to draw a collectible item
  function drawCollectible(x, y, size, itemType, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    const img = itemType === 'note' ? images.note : images.record;
    if (img) {
      ctx.drawImage(img, drawX, y, size, size);
    }
  }

  // Function to draw the enemy
  function drawEnemy(enemyObj, parallaxScrollX) {
    const drawX = enemyObj.x - parallaxScrollX;
    const drawY = enemyObj.y;
    const width = enemyObj.width;
    const height = enemyObj.height;

    // Gradient body
    const gradient = ctx.createLinearGradient(drawX, drawY, drawX + width, drawY + height);
    gradient.addColorStop(0, '#4B0082'); // Dark Violet
    gradient.addColorStop(1, '#800080'); // Purple
    ctx.fillStyle = gradient;
    ctx.fillRect(drawX, drawY, width, height);

    // Eyes (simple circles)
    ctx.fillStyle = '#FFFFFF'; // White eyes
    const eyeRadius = width / 8;
    const eyeOffsetY = height / 4;
    const eyeOffsetX = width / 4;

    // Left eye
    ctx.beginPath();
    ctx.arc(drawX + eyeOffsetX, drawY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.arc(drawX + width - eyeOffsetX, drawY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (small black circles)
    ctx.fillStyle = '#000000'; // Black pupils
    const pupilRadius = eyeRadius / 2;
    // Left pupil (center based on eye position)
    ctx.beginPath();
    ctx.arc(drawX + eyeOffsetX, drawY + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    // Right pupil
    ctx.beginPath();
    ctx.arc(drawX + width - eyeOffsetX, drawY + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Create on‑screen controls for touch devices.  They are always visible
  // but only change input state when pressed.
  function createTouchControls() {
    // Remove any existing controls to avoid duplicates on reload
    const oldContainer = document.getElementById('controlsContainer');
    if (oldContainer) oldContainer.remove();
    // Create a container for all touch controls
    const container = document.createElement('div');
    container.id = 'controlsContainer';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
    // Helper to create a button
    function makeButton(label, id) {
      const btn = document.createElement('div');
      btn.textContent = label;
      btn.dataset.id = id; // Assign a unique ID to the button
      btn.style.position = 'absolute';
      btn.style.width = '70px';
      btn.style.height = '70px';
      btn.style.background = 'rgba(0,0,0,0.35)';
      btn.style.color = '#fff';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.fontSize = '24px'; // Reduced font size
      btn.style.borderRadius = '8px';
      btn.style.border = '2px solid #fff';
      btn.style.userSelect = 'none';
      btn.style.zIndex = '10';
      btn.style.pointerEvents = 'auto'; // Allow interaction
      // Removed cursor: 'grab' as buttons are no longer draggable
      return btn;
    }

    // Create buttons for movement and actions, fixed in position
    const leftBtn = makeButton('◀', 'leftBtn');
    leftBtn.style.left = '10px';
    leftBtn.style.bottom = '10px';
    container.appendChild(leftBtn);

    const rightBtn = makeButton('▶', 'rightBtn');
    rightBtn.style.left = '90px'; // Positioned next to leftBtn
    rightBtn.style.bottom = '10px';
    container.appendChild(rightBtn);

    const jumpBtn = makeButton('A', 'jumpBtn');
    jumpBtn.style.right = '90px'; // Positioned next to crouchBtn
    jumpBtn.style.bottom = '10px';
    container.appendChild(jumpBtn);

    const crouchBtn = makeButton('B', 'crouchBtn');
    crouchBtn.style.right = '10px';
    crouchBtn.style.bottom = '10px';
    container.appendChild(crouchBtn);

    // Create Zoom buttons
    const zoomOutBtn = makeButton('-', 'zoomOutBtn');
    zoomOutBtn.style.right = '90px';
    zoomOutBtn.style.top = '10px';
    container.appendChild(zoomOutBtn);

    const zoomInBtn = makeButton('+', 'zoomInBtn');
    zoomInBtn.style.right = '10px';
    zoomInBtn.style.top = '10px';
    container.appendChild(zoomInBtn);

    // Attach pointer listeners for game controls
    const set = (btn, prop) => {
      btn.addEventListener('pointerdown', () => { input[prop] = true; });
      btn.addEventListener('pointerup', () => { input[prop] = false; });
      btn.addEventListener('pointercancel', () => { input[prop] = false; });
      btn.addEventListener('pointerout', () => { input[prop] = false; });
    };

    set(leftBtn, 'left');
    set(rightBtn, 'right');
    set(jumpBtn, 'jump');
    set(crouchBtn, 'crouch');

    // Attach listeners for zoom buttons
    zoomOutBtn.addEventListener('pointerdown', () => {
      currentZoomLevel = Math.max(GameConfig.RENDER.MIN_ZOOM_LEVEL, currentZoomLevel - GameConfig.RENDER.ZOOM_STEP);
      resize(); // Trigger resize to apply new zoom level
    });
    zoomInBtn.addEventListener('pointerdown', () => {
      currentZoomLevel = Math.min(GameConfig.RENDER.MAX_ZOOM_LEVEL, currentZoomLevel + GameConfig.RENDER.ZOOM_STEP);
      resize(); // Trigger resize to apply new zoom level
    });

    // Removed drag functionality: buttons are now fixed in position.
    // Removed localStorage saving/loading for control positions.
  }

  // Keyboard controls
  function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (currentGameState === 'menu') {
        switch (e.code) {
          case 'ArrowUp':
            selectedMenuItem = (selectedMenuItem - 1 + 4) % 4; // Cycle through 4 menu items
            e.preventDefault();
            break;
          case 'ArrowDown':
            selectedMenuItem = (selectedMenuItem + 1) % 4; // Cycle through 4 menu items
            e.preventDefault();
            break;
          case 'Enter':
          case 'Space':
            e.preventDefault();
            // Simulate a click on the currently selected item
            // This logic will be moved to a helper function later, for now we simulate
            // For now, we'll directly apply the action based on selectedMenuItem
            if (selectedMenuItem === 0) { // Easy button
              difficulty = 'easy';
              if (lastDeviceOrientationEvent) {
                neutralGamma = lastDeviceOrientationEvent.gamma;
                neutralBeta = lastDeviceOrientationEvent.beta;
              }
              resetGame(); // Starts the game in easy mode
            } else if (selectedMenuItem === 1) { // Normal button
              difficulty = 'normal';
              if (lastDeviceOrientationEvent) {
                neutralGamma = lastDeviceOrientationEvent.gamma;
                neutralBeta = lastDeviceOrientationEvent.beta;
              }
              resetGame(); // Starts the game in normal mode
            } else if (selectedMenuItem === 2) { // Inclination button
              isAccelerometerEnabled = !isAccelerometerEnabled; // Toggle accelerometer state
              toggleAccelerometer();
            } else if (selectedMenuItem === 3) { // Lock Right button
              isRightLocked = !isRightLocked; // Toggle lock right state
            }
            break;
        }
      } else if (currentGameState === 'playing') {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          input.left = true;
            e.preventDefault(); // Prevent default browser action
          break;
        case 'ArrowRight':
        case 'KeyD':
          input.right = true;
            e.preventDefault(); // Prevent default browser action
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          input.jump = true;
            e.preventDefault(); // Prevent default browser action
          break;
        case 'ControlLeft': // New case for 'Ctrl' key for crouching
        case 'ControlRight':
        case 'KeyS': // New case for 'S' key for crouching
          input.crouch = true;
            e.preventDefault(); // Prevent default browser action
          break;
        case 'ArrowDown': // New case for 'ArrowDown' key for crouching
          input.crouch = true;
            e.preventDefault(); // Prevent default browser action
          break;
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          input.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          input.right = false;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          input.jump = false;
          break;
        case 'ControlLeft': // New case for 'Ctrl' key for crouching
        case 'ControlRight':
        case 'KeyS': // New case for 'S' key for crouching
          input.crouch = false;
          break;
        case 'ArrowDown': // New case for 'ArrowDown' key for crouching
          input.crouch = false;
          break;
      }
    });
    // New: Handle any keydown to restart to menu from Game Over screen
    window.addEventListener('keydown', (e) => {
      if (currentGameState === 'gameOver') {
        e.preventDefault(); // Prevent default action (e.g., scrolling)
        currentGameState = 'menu'; // Go back to menu
      }
    });
  }

  // Setup menu input (mouse and touch)
  function setupMenuInput() {
    const handleMenuInteraction = (e) => {
      e.preventDefault(); // Prevent default behavior (e.g., scrolling on touch)
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Scale click/touch coordinates to game's internal resolution
      const scaleX = GAME_WIDTH / rect.width;
      const scaleY = GAME_HEIGHT / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      if (currentGameState === 'menu') {
        // Easy Button coordinates (defined in drawMenu)
        const easyButtonWidth = BUTTON_WIDTH;
        const easyButtonHeight = BUTTON_HEIGHT;
        const easyButtonX = GAME_WIDTH / 2 - easyButtonWidth / 2;
        const easyButtonY = GAME_HEIGHT / 2 - easyButtonHeight / 2 + EASY_BUTTON_Y_OFFSET;

        // Normal Button coordinates (defined in drawMenu)
        const normalButtonWidth = BUTTON_WIDTH;
        const normalButtonHeight = BUTTON_HEIGHT;
        const normalButtonX = GAME_WIDTH / 2 - normalButtonWidth / 2;
        const normalButtonY = GAME_HEIGHT / 2 - normalButtonHeight / 2 + NORMAL_BUTTON_Y_OFFSET;

        // Inclination Movement Button coordinates
        const inclinationButtonWidth = BUTTON_WIDTH;
        const inclinationButtonHeight = BUTTON_HEIGHT;
        const inclinationButtonX = GAME_WIDTH / 2 - inclinationButtonWidth / 2;
        const inclinationButtonY = GAME_HEIGHT / 2 - inclinationButtonHeight / 2 + INCLINATION_BUTTON_Y_OFFSET;

        // Lock Right Movement Button coordinates (declared here for access in this scope)
        const lockRightButtonWidth = BUTTON_WIDTH;
        const lockRightButtonHeight = BUTTON_HEIGHT;
        const lockRightButtonX = GAME_WIDTH / 2 - lockRightButtonWidth / 2;
        const lockRightButtonY = GAME_HEIGHT / 2 - lockRightButtonHeight / 2 + LOCK_RIGHT_BUTTON_Y_OFFSET;

        // Check if Easy button clicked/touched
        if (x >= easyButtonX && x <= easyButtonX + easyButtonWidth &&
            y >= easyButtonY && y <= easyButtonY + easyButtonHeight) {
          selectedMenuItem = 0; // Update selected item
          difficulty = 'easy';
          if (lastDeviceOrientationEvent) {
            neutralGamma = lastDeviceOrientationEvent.gamma;
            neutralBeta = lastDeviceOrientationEvent.beta;
          }
          resetGame(); // Starts the game in easy mode
        }
        // Check if Normal button clicked/touched
        else if (x >= normalButtonX && x <= normalButtonX + normalButtonWidth &&
                 y >= normalButtonY && y <= normalButtonY + normalButtonHeight) {
          selectedMenuItem = 1; // Update selected item
          difficulty = 'normal';
          if (lastDeviceOrientationEvent) {
            neutralGamma = lastDeviceOrientationEvent.gamma;
            neutralBeta = lastDeviceOrientationEvent.beta;
          }
          resetGame(); // Starts the game in normal mode
        }
        // Check if Inclination Movement button clicked/touched
        else if (x >= inclinationButtonX && x <= inclinationButtonX + inclinationButtonWidth &&
                 y >= inclinationButtonY && y <= inclinationButtonY + inclinationButtonHeight) {
          selectedMenuItem = 2; // Update selected item
          isAccelerometerEnabled = !isAccelerometerEnabled; // Toggle accelerometer state
          // Call toggleAccelerometer directly here to update event listener immediately
          toggleAccelerometer();
        }
        // Check if Lock Right Movement button clicked/touched
        else if (x >= lockRightButtonX && x <= lockRightButtonX + lockRightButtonWidth &&
                 y >= lockRightButtonY && y <= lockRightButtonY + lockRightButtonHeight) {
          selectedMenuItem = 3; // Update selected item
          isRightLocked = !isRightLocked; // Toggle lock right state
        }
      }
      // Check for Restart button click/touch if in game over state
      else if (currentGameState === 'gameOver') {
        // Restart Button coordinates (defined in drawGameOverMenu)
        const restartButtonWidth = RESTART_BUTTON_WIDTH;
        const restartButtonHeight = RESTART_BUTTON_HEIGHT;
        const restartButtonX = GAME_WIDTH / 2 - restartButtonWidth / 2;
        const restartButtonY = RESTART_BUTTON_Y_OFFSET_GAME_OVER; // Position from top

        // Debugging: Log click coordinates and button bounds
        // console.log(`Click: x=${x}, y=${y}`); // Removed console.log
        // console.log(`Restart Button: x=${restartButtonX}, y=${restartButtonY}, width=${restartButtonWidth}, height=${restartButtonHeight}`); // Removed console.log

        if (x >= restartButtonX && x <= restartButtonX + restartButtonWidth &&
            y >= restartButtonY && y <= restartButtonY + restartButtonHeight) {
          currentGameState = 'menu'; // Change to menu state
        }
      }
    };
    canvas.addEventListener('mousedown', handleMenuInteraction, false);
    canvas.addEventListener('touchstart', handleMenuInteraction, false);
  }

  // Handle device orientation events for accelerometer input
    function handleOrientation(event) {
      lastDeviceOrientationEvent = event; // Store the latest orientation event
    // Ensure gamma and beta are available and are numbers
    if (event.gamma === null || isNaN(event.gamma) || event.beta === null || isNaN(event.beta)) {
      console.error('Device orientation event data is incomplete or invalid.', event); // Log the full event object
      return; // Exit if data is not valid
    }

      const currentGamma = event.gamma;
      const currentBeta = event.beta;

      // Calculate tilt relative to the neutral point established at game start
      const relativeGamma = currentGamma - neutralGamma;
      const relativeBeta = currentBeta - neutralBeta;

      // Determine if the device is more horizontal or vertical for movement control
      // We'll use the larger absolute tilt value for horizontal movement
      let effectiveTilt = 0;
      if (Math.abs(relativeGamma) > Math.abs(relativeBeta)) {
        effectiveTilt = relativeGamma;
      } else {
        effectiveTilt = relativeBeta; // Assuming positive beta means tilt right in landscape
      }

      input.left = false;
      input.right = false;
      input.accelerometerSpeedFactor = 0;

    // Apply a dead zone and scale speed based on tilt beyond the threshold
    if (effectiveTilt > ACCELEROMETER_TILT_THRESHOLD) {
        // Tilt right
        input.right = true;
      // Scale speed factor: 0 at threshold, 1 at maxTilt
      input.accelerometerSpeedFactor = Math.min(1, (effectiveTilt - ACCELEROMETER_TILT_THRESHOLD) / (ACCELEROMETER_MAX_TILT - ACCELEROMETER_TILT_THRESHOLD));
    } else if (effectiveTilt < -ACCELEROMETER_TILT_THRESHOLD) {
        // Tilt left
        input.left = true;
      // Scale speed factor: 0 at threshold, 1 at maxTilt (absolute values)
      input.accelerometerSpeedFactor = Math.min(1, (Math.abs(effectiveTilt) - ACCELEROMETER_TILT_THRESHOLD) / (ACCELEROMETER_MAX_TILT - ACCELEROMETER_TILT_THRESHOLD));
    }
  }

  // Setup accelerometer controls for mobile devices
  const toggleAccelerometer = () => {
    if (isAccelerometerEnabled) {
      if (window.DeviceOrientationEvent) {
        // Request permission for iOS 13+ devices
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
              if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                input.accelerometerActive = true; // Set flag when accelerometer is active
      } else {
                console.warn('Permission for device orientation not granted.');
                input.accelerometerActive = false; // Ensure flag is false if permission denied
              }
            })
            .catch(error => {
              console.error('Error requesting device orientation permission:', error);
              input.accelerometerActive = false;
            });
        } else {
          window.addEventListener('deviceorientation', handleOrientation);
          input.accelerometerActive = true; // Set flag for older browsers/Android
        }
      }
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      input.accelerometerActive = false; // Ensure flag is false if accelerometer is disabled
      // Reset input to avoid residual movement
      input.left = false;
      input.right = false;
      input.accelerometerSpeedFactor = 0;
    }
  };

  function setupAccelerometerControls() {
    // Initial call to set up accelerometer based on current state
    toggleAccelerometer();

    // Listen for changes in isAccelerometerEnabled (e.g., from menu click)
    // This is a simplified approach; in a larger app, you might use a more robust state management.
    // We are now calling toggleAccelerometer directly when isAccelerometerEnabled is changed in setupMenuInput.
    // Therefore, this Object.defineProperty is no longer needed.
    /*
    Object.defineProperty(input, 'accelerometerEnabledState', {
      get: function() { return isAccelerometerEnabled; },
      set: function(value) {
        isAccelerometerEnabled = value;
        toggleAccelerometer(); // Re-toggle accelerometer when state changes
      }
    });
    */
  }

  // Setup touch controls for jumping and crouching on the game canvas
  function setupGameTouchControls() {
    const handleTouchInteraction = (e) => {
      e.preventDefault(); // Prevent default touch actions like scrolling
      
      if (e.type === 'touchstart') {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY; // This line was also implicitly affected

        // Scale touch coordinates to game's internal resolution
        const scaleX = GAME_WIDTH / rect.width;
        const scaledX = (clientX - rect.left) * scaleX;

        if (scaledX > GAME_WIDTH / 2) {
          // Right half of the screen for jumping
          input.jump = true;
          input.crouch = false; // Ensure crouch is false if jumping
        } else {
          // Left half of the screen for crouching/interacting
          input.crouch = true;
          input.jump = false; // Ensure jump is false if crouching
        }
      } else if (e.type === 'touchend' || e.type === 'touchcancel') {
        input.jump = false;
        input.crouch = false;
      }
    };

    canvas.addEventListener('touchstart', handleTouchInteraction, false);
    canvas.addEventListener('touchend', handleTouchInteraction, false);
    canvas.addEventListener('touchcancel', handleTouchInteraction, false);
  }

  // Poll gamepad state each frame.  Many controllers map the d‑pad
  // buttons to indices 14 and 15 for left/right and 0 for the main
  // button.  Axis 0 is the left stick horizontal axis.
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (pads) {
      for (const pad of pads) {
        if (!pad) continue;
        // Axes
        const horizontal = pad.axes && pad.axes.length > 0 ? pad.axes[0] : 0;
        input.left = input.left || horizontal < -0.5 || (pad.buttons[14] && pad.buttons[14].pressed);
        input.right = input.right || horizontal > 0.5 || (pad.buttons[15] && pad.buttons[15].pressed);
        if (pad.buttons[0] && pad.buttons[0].pressed) input.jump = true;
        if (pad.buttons[1] && pad.buttons[1].pressed) input.crouch = true; // New: Gamepad button 1 for crouch
      }
    }
  }

  // Reset game state to initial values
  function resetGame() {
    isGameOver = false;
    currentGameState = 'playing'; // Set game state to playing when resetting
    isInHouse = false; // Ensure player is outside house
    lastEntranceDoor = null;

    player.x = GAME_WIDTH / 2 - GameConfig.PLAYER.INITIAL_X_OFFSET; // Center player horizontally
    player.y = groundY - player.initialHeight;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.currentAnim = 'idle';
    player.lastAnim = 'idle';
    player.animIndex = 0;
    player.animTimer = 0;
    player.idleTime = 0;
    player.isAcceleratedJump = false;
    player.jumpAccelerationFactor = 1.0;
    playerDistanceWalked = 0; // Reset player distance walked
    maxPlayerX = 0; // Reset maxPlayerX
    noteCount = 0; // Reset note count
    recordCount = 0; // Reset record count

    enemy.x = -enemy.width; // Start enemy off-screen to the left
    enemy.y = groundY - enemy.height;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.onGround = true;

    staminaBar.fill = 1.0; // Full stamina

    animatedBar.fill = 0.0; // Empty animated bar
    animatedBar.fillDirection = 1;
    animatedBar.isVisible = false;

    // Reset input states
    input.left = false;
    input.right = false;
    input.jump = false;
    input.crouch = false;
    isAccelerometerEnabled = false; // Reset accelerometer state
    input.accelerometerActive = false; // Ensure accelerometer is not active
    isRightLocked = false; // Reset lock right movement state
    // Call toggleAccelerometer to ensure the event listener is removed if it was active
    // and the game is being reset with accelerometer disabled.
    if (typeof toggleAccelerometer === 'function') {
      toggleAccelerometer();
    }
  }

  // Game update loop
  function update(dt) {
    if (currentGameState === 'menu' || currentGameState === 'gameOver') {
      return; // Stop all game updates if in menu or game over state
    }

    // Update quest system
    questSystem.update(dt);

    // Update adaptive difficulty system
    adaptiveDifficulty.updateStats(dt);

    // Update visual effects system
    visualEffects.update(dt);

    // Calculate sprinting state once for the entire update
    const isSprinting = input.right && input.crouch && player.vx > 0 && player.onGround && staminaBar.fill > 0.1;

    // dt is delta time in seconds
    // Horizontal movement
    // const baseMoveSpeed = GameConfig.PLAYER.BASE_MOVE_SPEED; // pixels per second - Redundant, now using player.baseMoveSpeed directly
    let moveSpeed = player.baseMoveSpeed; // Initialize with base speed
    const gravity = GRAVITY; // pixels per second squared

    // Sprint boost system - stamina enables sprinting instead of penalizing movement
    if (isSprinting) {
      moveSpeed = player.baseMoveSpeed * 2.0; // Double speed when sprinting with stamina
    } else {
      moveSpeed = player.baseMoveSpeed; // Normal speed otherwise
    }

    // Apply accelerated jump factor if active
    if (player.isAcceleratedJump) {
      moveSpeed *= player.jumpAccelerationFactor;
      // Gradually decay the acceleration factor
      player.jumpAccelerationFactor = Math.max(1.0, player.jumpAccelerationFactor - (ACCELERATED_JUMP_DECAY_RATE * dt)); // Decay from 1.8 to 1.0 over time
    }

    player.vx = 0;
    if (!input.crouch) { // Only allow horizontal movement if not crouching
      if (isRightLocked) {
        player.vx = moveSpeed; // Force movement right if locked
      } else if (isAccelerometerEnabled && input.accelerometerActive && input.accelerometerSpeedFactor > 0) {
        // Prioritize accelerometer input if enabled, active, and detecting movement
        if (input.left) player.vx = -moveSpeed;
        else if (input.right) player.vx = moveSpeed;
      } else { // Fallback to keyboard/gamepad if accelerometer is disabled or not active
        if (input.left && !input.right) player.vx = -moveSpeed;
        if (input.right && !input.left) player.vx = moveSpeed;
      }
    }

    // Enemy movement and gravity (only when outside the house)
    if (!isInHouse) {
      enemy.vy += gravity * dt; // Apply gravity
      enemy.y += enemy.vy * dt;

      // Ground collision for enemy
      if (enemy.y + enemy.height > groundY) {
        enemy.y = groundY - enemy.height;
        enemy.vy = 0;
        enemy.onGround = true;
      } else {
        enemy.onGround = false;
      }

      // Horizontal pursuit logic
      if (player.x < enemy.x) {
        enemy.vx = -enemy.speed;
      } else if (player.x > enemy.x) {
        enemy.vx = enemy.speed;
      } else {
        enemy.vx = 0;
      }
      enemy.x += enemy.vx * dt;

      // Calculate distance between enemy and player for visual effect
      enemyPlayerDistance = Math.abs(player.x - enemy.x);

      // Map distance to opacity and pulsation speed
      // const maxEffectDistance = GAME_WIDTH / 2; // e.g., half screen width
      // const normalizedDistance = Math.min(1, enemyPlayerDistance / maxEffectDistance);

      // pulsationEffect.opacity = (1 - normalizedDistance) * 0.7; // Max opacity 70%
      // pulsationEffect.speed = 0.5 + (1 - normalizedDistance) * 1.5; // Speed from 0.5 (far) to 2 (close) - Slower pulse
      // pulsationEffect.normalizedDistance = normalizedDistance; // Store normalized distance for border width

      // Player-enemy collision detection (only outside house)
      const px1 = player.x;
      const py1 = player.y;
      const px2 = player.x + player.width;
      const py2 = player.y + player.height;

      // Apply offset to enemy's hitbox
      const ex1 = enemy.x + enemyHitboxOffset;
      const ey1 = enemy.y + enemyHitboxOffset;
      const ex2 = enemy.x + enemy.width - enemyHitboxOffset;
      const ey2 = enemy.y + enemy.height - enemyHitboxOffset;

      if (px1 < ex2 && px2 > ex1 && py1 < ey2 && py2 > ey1) {
        if (difficulty === 'normal') { // Only die in normal mode
          isGameOver = true; // Player collided with enemy

          // Record death in adaptive difficulty system
          adaptiveDifficulty.recordEvent('death');

          // Update high scores only if in normal mode and player died
          if (currentGameState !== 'gameOver' && difficulty !== 'easy') { // Only run this logic once when game over state is triggered
            highScores.push(Math.floor(playerDistanceWalked / 10)); // Add current distance (in meters)
            highScores.sort((a, b) => b - a); // Sort in descending order
            highScores = highScores.slice(0, 10); // Keep only top 10 scores
            localStorage.setItem('highScores', JSON.stringify(highScores)); // Save to localStorage
          }
          currentGameState = 'gameOver'; // Set game state to game over
          return; // Stop further updates
        }
      }
    }

    // Handle house entry/exit logic
    if (!isInHouse) {
      // Check for entering a house
      if (input.crouch) {
        for (const obj of worldObjects) {
          if (obj.type === 'structure' && obj.doorArea && obj.layer !== 'background') {
            // Calculate player bounding box
            const px1 = player.x;
            const py1 = player.y;
            const px2 = player.x + player.width;
            const py2 = player.y + player.height;

            // Calculate door bounding box (relative to world coordinates)
            const dx1 = obj.x + obj.doorArea.x_offset;
            const dy1 = obj.y + obj.doorArea.y_offset;
            const dx2 = obj.x + obj.doorArea.x_offset + obj.doorArea.width;
            const dy2 = obj.y + obj.doorArea.y_offset + obj.doorArea.height;

            // Simple AABB collision detection
            if (px1 < dx2 && px2 > dx1 && py1 < dy2 && py2 > dy1) {
              lastEntranceDoor = obj; // Store the current door object before potentially generating new furniture
              if (!lastEntranceDoor.houseInterior) {
                lastEntranceDoor.houseInterior = generateHouseFurniture(lastEntranceDoor); // Generate and store furniture if not already done
              }
              houseFurniture = lastEntranceDoor.houseInterior; // Set current houseFurniture to this house's interior
              isInHouse = true;
              questSystem.updateProgress('enter_house');
              // Reposition player inside the house, in front of the exit door
              player.x = GAME_WIDTH / 2;
              // Position player on the house floor (will be set correctly in drawRoom)
              player.y = GAME_HEIGHT / 2 - player.initialHeight; // Use house floor position
              input.crouch = false; // Reset crouch input to prevent immediate re-entry/exit
              return; // Exit update early to prevent further movement/animation issues
            }
          }
        }
      }
    } else { // isInHouse === true
      // Ensure player is always on the house floor
      const houseFloorY = GAME_HEIGHT / 2;
      if (player.y + player.height > houseFloorY) {
        player.y = houseFloorY - player.height;
        player.vy = 0;
        player.onGround = true;
      }
      
      // Check for exiting a house
      if (input.crouch) {
        const exitDoorXCenter = GAME_WIDTH / 2; // Center of the exit door inside
        const exitDoorWidth = 60; // From drawRoom function
        const exitDoorTolerance = 30; // How close player needs to be to exit door

        // Check if player is near the exit door inside the house
        if (player.x > exitDoorXCenter - exitDoorTolerance &&
            player.x < exitDoorXCenter + exitDoorTolerance) {
          isInHouse = false;
          // Reposition player outside the house, in front of the entrance door
          if (lastEntranceDoor) {
            player.x = lastEntranceDoor.x + lastEntranceDoor.doorArea.x_offset + (lastEntranceDoor.doorArea.width / 2) - (player.width / 2);
            player.y = groundY - player.initialHeight; // Position outside on ground
          } else {
            // Fallback if no entrance door was stored (shouldn't happen)
            player.x = 100;
            player.y = groundY - player.initialHeight;
          }
          input.crouch = false; // Reset crouch input
          return; // Exit update early
        }
      }
    }

    // Handle idle animation logic
    if (player.vx === 0 && player.onGround) {
      player.idleTime += dt;
    } else {
      player.idleTime = 0;
      // Removed: player.animIndex = 0; // Reset to the first (and only) idle frame when moving or not on ground
    }

    // Apply horizontal velocity
    player.x += player.vx * dt;
    // Update maxPlayerX and playerDistanceWalked
    if (!isInHouse) { // Only update distance if not inside a house
      if (difficulty !== 'easy') { // Only count distance if not in easy mode
        maxPlayerX = Math.max(maxPlayerX, player.x); // Store the maximum x-coordinate reached
        const newDistance = Math.floor(maxPlayerX / 10); // Display distance in meters based on max x
        if (newDistance > playerDistanceWalked) {
          playerDistanceWalked = newDistance;
          questSystem.updateProgress('distance', playerDistanceWalked);
          adaptiveDifficulty.recordEvent('distance', playerDistanceWalked);
        }
      }
    }

    // Clamp within world bounds (now only left side)
    if (player.x < 0) player.x = 0;
    // Removed right-side clamping, world is infinite to the right

    // Gravity
    player.vy += gravity * dt; // Apply gravity to player

    // Jump input handling
    if (input.jump) {
      if (currentGameState === 'gameOver' && input.jump) { // Allow jump to restart game from Game Over screen
        currentGameState = 'menu'; // Change to menu state instead of resetting game directly
        input.jump = false; // Consume the jump input
        return; // Skip remaining update logic for this frame to allow full reset
      } else if (player.onGround) {
        player.vy = JUMP_IMPULSE; // jump impulse
        player.onGround = false;
        // Reset jump flag so holding the button doesn't cause repeated jumps
        input.jump = false;

        // Check for accelerated jump condition (red animated bar)
        if (animatedBar.fill > GameConfig.ANIMATED_BAR.RED_THRESHOLD) {
          player.isAcceleratedJump = true;
          player.jumpAccelerationFactor = ACCELERATED_JUMP_FACTOR; // Initial acceleration factor
        }
      }
    }

    // Apply vertical velocity
    player.y += player.vy * dt;
    // Ground collision
    const groundTolerance = GROUND_TOLERANCE; // Small tolerance for ground detection
    if (player.y + player.height >= groundY - groundTolerance) {
      player.y = groundY - player.height; // Snap to ground
      player.vy = 0;
      // Reset accelerated jump state if landing on ground
      if (!player.onGround && player.isAcceleratedJump) { // Only reset if just landed and was in accelerated jump
        player.isAcceleratedJump = false;
        player.jumpAccelerationFactor = 1.0;
      }
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Debugging: Log player.onGround, player.y, and groundY state
    console.log(`Player y: ${player.y.toFixed(2)}, Ground y: ${groundY.toFixed(2)}, On Ground: ${player.onGround}`);

    // Determine facing direction for drawing
    if (player.vx < 0) player.facingRight = false;
    if (player.vx > 0) player.facingRight = true;

    // Check for collisions with collidable world objects (e.g., poles)
    for (const obj of worldObjects) {
      // Only check for collisions with objects within a certain range of the player
      // and if not in house
      if (!isInHouse && obj.x + (obj.width || 0) > player.x - GameConfig.PLAYER.COLLISION_VIEW_RANGE &&
          obj.x < player.x + player.width + GameConfig.PLAYER.COLLISION_VIEW_RANGE) {

        // --- Collision for walkable surfaces (structures and fences) ---
        if (obj.isWalkable) {
          const platformTop = obj.walkableSurfaceY;
          const platformBottom = platformTop + 10; // Small thickness for the walkable surface
          const platformLeft = obj.x;
          const platformRight = obj.x + obj.width;

          // Check if player's feet are above the platform and player is falling
          if (player.y + player.height <= platformTop + GameConfig.PHYSICS.GROUND_TOLERANCE && // Player is above or just at the platform
              player.y + player.height + player.vy * dt > platformTop - GameConfig.PHYSICS.GROUND_TOLERANCE && // Player will land on the platform
              player.x + player.width > platformLeft &&
              player.x < platformRight) {

            if (player.vy > 0) { // Only apply if player is falling
              player.y = platformTop - player.height; // Snap player to the top of the platform
              player.vy = 0; // Stop vertical movement
              player.onGround = true; // Player is on the ground (of the platform)
            }
          }
        }

        // --- Existing Collision for poles (full AABB collision) ---
        if (obj.type === 'pole' && obj.collidable) {
          // Simple AABB collision detection
          const px1 = player.x;
          const py1 = player.y;
          const px2 = player.x + player.width;
          const py2 = player.y + player.height;

          const ox1 = obj.x;
          const oy1 = obj.y - obj.height; // Poles are drawn from top-left, y is base
          const ox2 = obj.x + obj.width;
          const oy2 = obj.y;

          if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) {
            // Collision detected with a pole
            // Determine which side the collision occurred and adjust player position
            const overlapX = Math.min(px2 - ox1, ox2 - px1);
            const overlapY = Math.min(py2 - oy1, oy2 - py1);

            if (overlapX < overlapY) { // Horizontal collision is smaller, so resolve horizontally
              if (player.vx > 0) { // Player moving right
                player.x -= overlapX;
              } else if (player.vx < 0) { // Player moving left
                player.x += overlapX;
              }
            } else { // Vertical collision is smaller, so resolve vertically
              if (player.vy > 0) { // Player falling onto pole
                player.y -= overlapY;
                player.vy = 0;
                player.onGround = true;
              } else if (player.vy < 0) { // Player jumping into pole from below
                player.y += overlapY;
                player.vy = 0;
                }
              }
            }
          }

        // --- Collision for speed boost platforms ---
        if (obj.type === 'speed_boost' && !obj.activated) {
          const px1 = player.x;
          const py1 = player.y;
          const px2 = player.x + player.width;
          const py2 = player.y + player.height;

          const ox1 = obj.x;
          const oy1 = obj.y - obj.height;
          const ox2 = obj.x + obj.width;
          const oy2 = obj.y;

          if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) {
            // Player stepped on speed boost - give temporary speed boost
            obj.activated = true;
            player.vx *= 1.5; // Boost horizontal velocity
            obj.color = '#FFA500'; // Change to orange to show activation

            // Trigger visual effect
            visualEffects.onSpeedBoostActivated(obj.x, obj.y);

            // Reset activation after 2 seconds
            setTimeout(() => {
              obj.activated = false;
              obj.color = '#FFD700'; // Back to gold
            }, 2000);
          }
        }

        // --- Collision for breakable crates ---
        if (obj.type === 'breakable_crate' && !obj.broken && player.vy > 0) {
          // Only break when player is falling/jumping down onto the crate
          const px1 = player.x;
          const py1 = player.y;
          const px2 = player.x + player.width;
          const py2 = player.y + player.height;

          const ox1 = obj.x;
          const oy1 = obj.y - obj.height;
          const ox2 = obj.x + obj.width;
          const oy2 = obj.y;

          if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) {
            // Player landed on crate - break it
            obj.broken = true;
            obj.collidable = false; // No longer collidable

            // Give player a small bounce
            player.vy = -200; // Small upward bounce

            // Trigger visual effect
            visualEffects.onCrateBroken(obj.x + obj.width / 2, obj.y);

            // Spawn collectible from broken crate
            if (Math.random() < 0.3) { // 30% chance
              const itemType = Math.random() < 0.5 ? 'note' : 'record';
              worldObjects.push({
                type: 'collectible',
                itemType: itemType,
                x: obj.x + obj.width / 2,
                y: obj.y - obj.height - 10,
                size: 24,
                collected: false,
                layer: 'foreground',
              });
            }
          }
        }
      }
    }

    // Select appropriate animation based on current state. You can
    // expand this logic when you implement walking or jumping
    if (player.onGround) { // Check grounded animations first
      if (input.crouch) {
        player.currentAnim = 'crouch';
      } else if (input.left || input.right) {
        player.currentAnim = 'walk';
      } else {
        player.currentAnim = 'idle';
      }
    } else { // Not on ground, must be jumping/falling
      if (player.vy < 0) {
        player.currentAnim = 'jump';
        player.animIndex = JUMP_ANIM_ASCENDING_INDEX; // 1subindo.png
      } else if (player.vy >= 200 && player.vy <= 400) { // Adjusted from === 0 to a range around 0
        player.currentAnim = 'jump';
        player.animIndex = JUMP_ANIM_DECELERATING_INDEX; // 2desacelerando.png
      } else {
        player.currentAnim = 'jump';
        player.animIndex = JUMP_ANIM_DESCENDING_INDEX; // 3caindo.png
      }
    }

    // Reset animIndex if the animation changes
    if (player.currentAnim !== player.lastAnim) {
      player.animIndex = 0;
    }
    player.lastAnim = player.currentAnim;

    // Update animated bar
    const wasVisible = animatedBar.isVisible;
    animatedBar.isVisible = (player.currentAnim === 'walk');
    if (animatedBar.isVisible && !wasVisible) {
      // Reset bar when it first becomes visible
      animatedBar.fill = 0.0;
      animatedBar.fillDirection = 1;
    }

    if (animatedBar.isVisible) {
      animatedBar.fill += animatedBar.fillDirection * animatedBar.speed * dt;
      if (animatedBar.fill > 1.0) {
        animatedBar.fill = 1.0;
        animatedBar.fillDirection = -1;
      } else if (animatedBar.fill < 0.0) {
        animatedBar.fill = 0.0;
        animatedBar.fillDirection = 1;
      }

      // Set color based on fill level
      if (animatedBar.fill > GameConfig.ANIMATED_BAR.RED_THRESHOLD) {
        animatedBar.color = GameConfig.ANIMATED_BAR.RED_COLOR; // Red
      } else {
        animatedBar.color = GameConfig.ANIMATED_BAR.GREEN_COLOR; // Green
      }
    }

    // Update stamina bar - Improved system: Sprint boost instead of movement penalty
    if (isSprinting && !isInHouse) {
      // Sprint mode: High speed but drains stamina quickly
      staminaBar.fill -= staminaBar.drainSpeed * 2.0 * dt; // Double drain rate
      questSystem.updateProgress('use_sprint');
      adaptiveDifficulty.recordEvent('sprint_used');

      // Trigger visual effect for sprint activation
      visualEffects.onSprintActivated(player.x, player.y);
    } else {
      // Normal recovery - faster when not moving or crouching
      let recoveryRate = staminaBar.recoverSpeed;
      if (player.vx === 0 || input.crouch) {
        recoveryRate *= 2.0; // Double recovery when stationary or crouching
      }
      staminaBar.fill += recoveryRate * dt;
    }
    // Clamp stamina between 0 and 1
    staminaBar.fill = Math.max(0, Math.min(1, staminaBar.fill));

    // Advance the frame timer.  When enough time has passed, move to
    // the next frame in the current animation.  If the selected
    // animation has no frames (e.g., walk/jump not yet implemented),
    // fallback to using the idle animation.
    const frames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
      ? player.animations[player.currentAnim]
      : player.animations.idle;
    const animSpeed = ANIMATION_SPEED; // Doubled animation speed (reduced from 0.3 to 0.15 seconds per frame)

    player.animTimer += dt;
    if (player.animTimer >= animSpeed) {
      player.animTimer = 0;
      if (player.currentAnim === 'idle') {
        player.animIndex = 0; // Always use the single idle frame (parado.png)
      } else if (player.currentAnim === 'jump') {
        // For jump animation, animIndex is set based on vy, so no need to advance here
      } else if (player.currentAnim === 'crouch') { // Crouch animation should pause on the last frame
        if (player.animIndex < frames.length - 1) {
          player.animIndex = (player.animIndex + 1) % frames.length;
        }
      } else { // This block handles 'walk' and other non-idle/non-jump/non-crouch animations
        console.log(`WALK ANIM: Before update - currentAnim: ${player.currentAnim}, animIndex: ${player.animIndex}, frames.length: ${frames.length}`);
        player.animIndex = (player.animIndex + 1) % frames.length;
        console.log(`WALK ANIM: After update - animIndex: ${player.animIndex}`);
      }
    }

    // Camera follows player
    const halfScreen = GAME_WIDTH / 2;
    scrollX = player.x + player.width / 2 - halfScreen;
    if (scrollX < 0) scrollX = 0;
    // Removed maxScroll clamping, world is infinite to the right

    // Procedural generation and clean up
    // Generate new objects when approaching the end of the generated world
    if (scrollX + GAME_WIDTH + GENERATION_BUFFER > lastGeneratedChunkX) {
      generateWorldObjects(lastGeneratedChunkX, scrollX + GAME_WIDTH + GENERATION_BUFFER + GAME_WIDTH);
      lastGeneratedChunkX = scrollX + GAME_WIDTH + GENERATION_BUFFER + GAME_WIDTH;
    }

    // Remove objects that are far behind the player or have been collected
    worldObjects = worldObjects.filter(obj => (obj.x + (obj.width || 0) > scrollX - VIEW_RANGE) && !obj.collected);

    // Check for collisions with collectibles.  When the player's
    // bounding box overlaps a collectible, mark it collected and
    // increment the appropriate counter.  We use simple AABB
    // collision detection.
    for (const item of worldObjects) {
      if (item.type === 'collectible' && !item.collected) {
        const px1 = player.x;
        const py1 = player.y;
        const px2 = player.x + player.width;
        const py2 = player.y + player.height;
        const ix1 = item.x;
        const iy1 = item.y;
        const ix2 = item.x + item.size;
        const iy2 = item.y + item.size;
        if (px1 < ix2 && px2 > ix1 && py1 < iy2 && py2 > iy1) {
          item.collected = true;
          if (difficulty !== 'easy') { // Only count scores if not in easy mode
            if (item.itemType === 'note') {
              noteCount++;
              questSystem.updateProgress('collect_note');
              adaptiveDifficulty.recordEvent('item_collected');
              visualEffects.onItemCollected(item.x, item.y);
            } else if (item.itemType === 'record') {
              recordCount++;
              questSystem.updateProgress('collect_record');
              adaptiveDifficulty.recordEvent('item_collected');
              visualEffects.onItemCollected(item.x, item.y);
            }
          }
        }
      }
    }
  }

  // Function to draw the main menu
  function drawMenu() {
    ctx.fillStyle = '#2c3e50'; // Dark blue-gray background
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#ecf0f1'; // Light gray text
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pepper Hat', GAME_WIDTH / 2, GAME_HEIGHT / 2 + MENU_TITLE_Y_OFFSET);

    // Easy Button
    const easyButtonWidth = BUTTON_WIDTH;
    const easyButtonHeight = BUTTON_HEIGHT;
    const easyButtonX = GAME_WIDTH / 2 - easyButtonWidth / 2;
    const easyButtonY = GAME_HEIGHT / 2 - easyButtonHeight / 2 + EASY_BUTTON_Y_OFFSET;

    ctx.fillStyle = '#27ae60'; // Green for Easy
    ctx.fillRect(easyButtonX, easyButtonY, easyButtonWidth, easyButtonHeight);
    ctx.strokeStyle = (selectedMenuItem === 0) ? '#FFFF00' : '#ecf0f1'; // Highlight if selected
    ctx.lineWidth = (selectedMenuItem === 0) ? 5 : 3;
    ctx.strokeRect(easyButtonX, easyButtonY, easyButtonWidth, easyButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('EASY', GAME_WIDTH / 2, easyButtonY + easyButtonHeight / 2);

    // Normal Button
    const normalButtonWidth = BUTTON_WIDTH;
    const normalButtonHeight = BUTTON_HEIGHT;
    const normalButtonX = GAME_WIDTH / 2 - normalButtonWidth / 2;
    const normalButtonY = GAME_HEIGHT / 2 - normalButtonHeight / 2 + NORMAL_BUTTON_Y_OFFSET;

    ctx.fillStyle = '#e74c3c'; // Red for Normal
    ctx.fillRect(normalButtonX, normalButtonY, normalButtonWidth, normalButtonHeight);
    ctx.strokeStyle = (selectedMenuItem === 1) ? '#FFFF00' : '#ecf0f1'; // Highlight if selected
    ctx.lineWidth = (selectedMenuItem === 1) ? 5 : 3;
    ctx.strokeRect(normalButtonX, normalButtonY, normalButtonWidth, normalButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('NORMAL', GAME_WIDTH / 2, normalButtonY + normalButtonHeight / 2);

    // Inclination Movement Button
    const inclinationButtonWidth = BUTTON_WIDTH;
    const inclinationButtonHeight = BUTTON_HEIGHT;
    const inclinationButtonX = GAME_WIDTH / 2 - inclinationButtonWidth / 2;
    const inclinationButtonY = GAME_HEIGHT / 2 - inclinationButtonHeight / 2 + INCLINATION_BUTTON_Y_OFFSET; // 30 pixels below Normal button

    ctx.fillStyle = '#3498db'; // Blue for Inclination
    ctx.fillRect(inclinationButtonX, inclinationButtonY, inclinationButtonWidth, inclinationButtonHeight);
    ctx.strokeStyle = (selectedMenuItem === 2) ? '#FFFF00' : '#ecf0f1'; // Highlight if selected
    ctx.lineWidth = (selectedMenuItem === 2) ? 5 : 3;
    ctx.strokeRect(inclinationButtonX, inclinationButtonY, inclinationButtonWidth, inclinationButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 25px Arial'; // Slightly smaller font to fit text
    ctx.fillText(`Inclination: ${isAccelerometerEnabled ? 'Enabled' : 'Disabled'}`, GAME_WIDTH / 2, inclinationButtonY + inclinationButtonHeight / 2);

    // Lock Right Movement Button
    const lockRightButtonWidth = BUTTON_WIDTH;
    const lockRightButtonHeight = BUTTON_HEIGHT;
    const lockRightButtonX = GAME_WIDTH / 2 - lockRightButtonWidth / 2;
    const lockRightButtonY = GAME_HEIGHT / 2 - lockRightButtonHeight / 2 + LOCK_RIGHT_BUTTON_Y_OFFSET; // Below Inclination button

    ctx.fillStyle = '#f1c40f'; // Yellow for Lock Right
    ctx.fillRect(lockRightButtonX, lockRightButtonY, lockRightButtonWidth, lockRightButtonHeight);
    ctx.strokeStyle = (selectedMenuItem === 3) ? '#FFFF00' : '#ecf0f1'; // Highlight if selected
    ctx.lineWidth = (selectedMenuItem === 3) ? 5 : 3;
    ctx.strokeRect(lockRightButtonX, lockRightButtonY, lockRightButtonWidth, lockRightButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 25px Arial'; // Slightly smaller font to fit text
    ctx.fillText(`Lock Right: ${isRightLocked ? 'Enabled' : 'Disabled'}`, GAME_WIDTH / 2, lockRightButtonY + lockRightButtonHeight / 2);
  }

  // Main drawing loop
  function render() {
    // Clear the canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save(); // Save the original canvas state for transformations

    // Apply zoom transformation
    const scaledWidth = GAME_WIDTH * currentZoomLevel;
    const scaledHeight = GAME_HEIGHT * currentZoomLevel;
    const offsetX = (GAME_WIDTH - scaledWidth) / 2; // Center horizontally
    const offsetY = (GAME_HEIGHT - scaledHeight) / 2; // Center vertically

    ctx.translate(offsetX, offsetY); // Translate to center for scaling
    ctx.scale(currentZoomLevel, currentZoomLevel); // Apply zoom

    if (currentGameState === 'menu') {
      drawMenu();
      ctx.restore(); // Restore before returning from menu
      return; // Stop rendering game elements if in menu
    }

    // Calculate parallax scroll for background
    const parallaxScrollX = -player.x * PARALLAX_FACTOR_BACKGROUND; // 20% scroll speed
    const cityParallaxScrollX = -player.x * PARALLAX_FACTOR_CITY; // 10% scroll speed for distant city

    if (isInHouse) {
      // Draw house interior
      drawRoom(GAME_WIDTH / 2, GAME_HEIGHT / 2 + (GAME_HEIGHT / 2)); // Pass exit door coords

      // Draw furniture
      for (const furniture of houseFurniture) {
        drawFurniture(furniture.type, furniture.x, furniture.y, furniture.width, furniture.height, furniture.color);
      }

      // Draw the player inside the house
      const activeFrames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
        ? player.animations[player.currentAnim]
        : player.animations.idle;
      const frameImage = activeFrames[player.animIndex % activeFrames.length];
      // console.log(`Rendering: Anim=${player.currentAnim}, Index=${player.animIndex}, FrameSrc=${frameImage ? frameImage.src : 'N/A'}`); // Removed console.log
      ctx.save();
      const drawX = player.x; // No scrollX when inside
      const drawY = player.y;
      if (player.facingRight) {
        ctx.drawImage(frameImage, drawX, drawY, player.width, player.height);
      } else {
        ctx.translate(drawX + player.width, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(frameImage, 0, 0, player.width, player.height);
      }
      ctx.restore();

    } else { // Not in house, draw exterior world
      ctx.fillStyle = '#87CEEB'; // Set background color to light blue
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Draw the ground as a repeating tile across the world
      const groundImg = images.ground;
      const numGroundTiles = Math.ceil(GAME_WIDTH / groundImg.width) + 1; // Changed WORLD_WIDTH to GAME_WIDTH
      for (let i = 0; i < numGroundTiles; i++) {
        const gx = i * groundImg.width - (scrollX % groundImg.width); // Added modulo for infinite ground
        ctx.drawImage(groundImg, gx, groundY, groundImg.width, groundImg.height);
      }

      // Draw all procedurally generated world objects
      for (const obj of worldObjects) {
        if (obj.x + (obj.width || 0) < scrollX - VIEW_RANGE || obj.x > scrollX + GAME_WIDTH + VIEW_RANGE) {
          continue; // Only draw objects within the view range
        }

        const parallaxFactor = obj.layer === 'background' ? PARALLAX_FACTOR_LAYER_BACKGROUND : 1; // Adjust parallax for background
        const effectiveScrollX = scrollX * parallaxFactor;

        if (obj.type === 'structure') {
          drawStructure(obj.x, obj.y, obj.width, obj.height, obj.bodyColor, obj.windowColor, obj.doorColor, obj.hasRoof, effectiveScrollX);
        } else if (obj.type === 'tree') {
          drawTree(obj.x, obj.y, obj.trunkHeight, obj.canopyRadius, obj.trunkColor, obj.canopyColor, effectiveScrollX);
        } else if (obj.type === 'pole') {
          drawPole(obj.x, obj.y, obj.height, obj.color, effectiveScrollX);
        } else if (obj.type === 'streetlight') {
          drawStreetlight(obj.x, obj.y, obj.width, obj.height, obj.color, obj.lightColor, effectiveScrollX);
        } else if (obj.type === 'fence') {
          drawFence(obj.x, obj.y, obj.width, obj.height, obj.color, effectiveScrollX);
        } else if (obj.type === 'bush') {
          drawBush(obj.x, obj.y, obj.size, obj.color, effectiveScrollX);
        } else if (obj.type === 'speed_boost') {
          drawSpeedBoost(obj.x, obj.y, obj.width, obj.height, obj.color, effectiveScrollX);
        } else if (obj.type === 'breakable_crate') {
          drawBreakableCrate(obj.x, obj.y, obj.width, obj.height, obj.color, effectiveScrollX, obj.broken);
        }
      }

      // Draw the enemy (only when outside the house)
      drawEnemy(enemy, scrollX);

      // Draw collectibles that have not yet been collected from worldObjects
      for (const obj of worldObjects) {
        if (obj.type === 'collectible' && !obj.collected) {
          if (obj.x + (obj.size || 0) < scrollX - VIEW_RANGE || obj.x > scrollX + GAME_WIDTH + VIEW_RANGE) {
            continue; // Only draw objects within the view range
          }
          const parallaxFactor = obj.layer === 'background' ? PARALLAX_FACTOR_LAYER_BACKGROUND : 1; // Adjust parallax for background
          const effectiveScrollX = scrollX * parallaxFactor;
          drawCollectible(obj.x, obj.y, obj.size, obj.itemType, effectiveScrollX);
        }
      }

      // Draw the player using the current animation frame.  If the
      // current animation has no frames loaded (e.g. walk/jump
      // animations aren't provided yet), fall back to the idle
      // animation.  When facing left we flip the image horizontally.
      const activeFrames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
        ? player.animations[player.currentAnim]
        : player.animations.idle;
      const frameImage = activeFrames[player.animIndex % activeFrames.length];
      // console.log(`Rendering: Anim=${player.currentAnim}, Index=${player.animIndex}, FrameSrc=${frameImage ? frameImage.src : 'N/A'}`); // Removed console.log
      ctx.save();
      const drawX = player.x - scrollX;
      const drawY = player.y;
      if (player.facingRight) {
        ctx.drawImage(frameImage, drawX, drawY, player.width, player.height);
      } else {
        ctx.translate(drawX + player.width, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(frameImage, 0, 0, player.width, player.height);
      }
      ctx.restore();
    }

    // Game Over overlay
    if (currentGameState === 'gameOver') { // Changed from isGameOver to currentGameState
      drawGameOverMenu(); // Call the new function to draw the game over menu
      ctx.restore(); // Restore before returning from game over
      return; // Stop further rendering of game elements
    }

    // Draw counters for collected items in the upper left corner.
    // We draw the icon at a small size followed by the count text.
    const iconSize = 24;
    var uiOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';

    // Draw note count
    ctx.drawImage(images.note, 10, uiOffsetY, iconSize, iconSize);
    ctx.fillText('x ' + noteCount, 10 + iconSize + 4, uiOffsetY + iconSize - 6);
    uiOffsetY += iconSize + 5;

    // Draw record count
    ctx.drawImage(images.record, 10, uiOffsetY, iconSize, iconSize);
    ctx.fillText('x ' + recordCount, 10 + iconSize + 4, uiOffsetY + iconSize - 6);
    uiOffsetY += iconSize + 5;

    // Draw distance walked counter
    ctx.textAlign = 'center'; // Center the text horizontally
    ctx.fillText(`Distance: ${Math.floor(playerDistanceWalked / 10)}m`, GAME_WIDTH / 2, animatedBar.y + animatedBar.height + 20); // Position below animatedBar with padding

    // Draw stamina bar
    ctx.fillStyle = '#333333'; // Dark grey background
    ctx.fillRect(staminaBar.x, staminaBar.y, staminaBar.width, staminaBar.height);

    ctx.fillStyle = staminaBar.color;
    ctx.fillRect(staminaBar.x, staminaBar.y, staminaBar.width * staminaBar.fill, staminaBar.height);

    ctx.strokeStyle = '#FFFFFF'; // White border
    ctx.lineWidth = 2;
    ctx.strokeRect(staminaBar.x, staminaBar.y, staminaBar.width, staminaBar.height);

    // Draw animated bar (Power Jump indicator)
    // Removed animatedBar.isVisible condition to keep it always visible
    // Draw bar background
    ctx.fillStyle = '#333333'; // Dark grey background
    ctx.fillRect(animatedBar.x, animatedBar.y, animatedBar.width, animatedBar.height);

    // Draw bar fill
    ctx.fillStyle = animatedBar.color;
    ctx.fillRect(animatedBar.x, animatedBar.y, animatedBar.width * animatedBar.fill, animatedBar.height);

    // Draw border for the bar
    ctx.strokeStyle = '#FFFFFF'; // White border
    ctx.lineWidth = 2;
    ctx.strokeRect(animatedBar.x, animatedBar.y, animatedBar.width, animatedBar.height);

    // Draw "POWER JUMP" text above the bar when available
    if (animatedBar.fill > GameConfig.ANIMATED_BAR.RED_THRESHOLD) {
      ctx.fillStyle = '#FFD700'; // Gold color
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('POWER JUMP READY', animatedBar.x + animatedBar.width / 2, animatedBar.y - 8);
    }

    // Draw sprint indicator when sprinting
    const isSprinting = input.right && input.crouch && player.vx > 0 && player.onGround && staminaBar.fill > 0.1;
    if (isSprinting) {
      ctx.fillStyle = '#00FF00'; // Green color for sprint indicator
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SPRINTING!', staminaBar.x + staminaBar.width / 2, staminaBar.y - 8);
    }

    // Render quest system
    questSystem.render(ctx);

    // Render adaptive difficulty system
    adaptiveDifficulty.render(ctx);

    // Render visual effects system
    visualEffects.render(ctx);

    ctx.restore(); // Restore the original canvas state
  }

  // Function to draw the Game Over menu with high scores and a restart button
  function drawGameOverMenu() {
    // Semi-transparent black overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Skull emoji
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Ensure text is vertically centered
    ctx.fillText('💀', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);

    // YOU DIED! Text
    ctx.fillStyle = 'red';
    ctx.font = '60px Arial';
    ctx.fillText('YOU DIED!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

    // Leaderboard Title
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('High Scores', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

    // Display top 10 high scores
    ctx.font = '20px Arial';
    var scoreY = GAME_HEIGHT / 2 + 90;
    highScores.forEach((score, index) => {
      ctx.fillText(`${index + 1}. ${score}m`, GAME_WIDTH / 2, scoreY);
      scoreY += 25;
    });

    // Restart Button
    const restartButtonWidth = RESTART_BUTTON_WIDTH;
    const restartButtonHeight = RESTART_BUTTON_HEIGHT;
    const restartButtonX = GAME_WIDTH / 2 - restartButtonWidth / 2;
    const restartButtonY = RESTART_BUTTON_Y_OFFSET_GAME_OVER; // Position from top

    ctx.fillStyle = '#008CBA'; // Blue
    ctx.fillRect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial'; // Fonte menor
    ctx.fillText('Restart', restartButtonX + restartButtonWidth / 2, restartButtonY + restartButtonHeight / 2 + 5);
  }

  // Main game loop using requestAnimationFrame
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;
    // Log key values for debugging mobile landscape issue
    console.log(`GameLoop: GAME_HEIGHT=${GAME_HEIGHT}, groundY=${groundY}, player.y=${player.y}`);
    // Reset one‑frame inputs
    // We do not reset left/right here because they can remain pressed
    pollGamepad();
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // Initialize the game once assets have loaded
  loadImages().then(() => {
    // Initialize systems
    visualEffects.init();
    // Calculate ground Y coordinate from the ground image height
    if (images.ground) {
      groundY = GAME_HEIGHT - images.ground.height;
    } else {
      console.error('Ground image not loaded! Using fallback groundY');
      groundY = GAME_HEIGHT - 50; // Fallback height
    }

    // Set initial player and enemy Y positions now that groundY is known
    player.y = groundY - player.initialHeight; // Use player.initialHeight
    player.x = GAME_WIDTH / 2 - GameConfig.PLAYER.INITIAL_X_OFFSET; // Center player horizontally
    enemy.y = groundY - enemy.height; // Set enemy on the ground
    enemy.x = -enemy.width; // Start enemy off-screen to the left

    // Build idle animation frames from the loaded images.  The frames
    // are kept in order.  If walking or jumping animations are added
    // later, push their frames into player.animations.walk or
    // player.animations.jump respectively.
    player.animations.idle = [
      images.parado // Only parado.png for idle
    ];
    // Assemble walking animation frames
    player.animations.walk = [
      images.wk1,
      images.wk2,
      images.wk3,
      images.wk4
    ];
    // Define jump animation frames
    player.animations.jump = [
      images.subindo,
      images.desacelerando,
      images.caindo
    ];
    // Define crouch animation frames
    player.animations.crouch = [
      images.abaixar1,
      images.abaixar2,
      images.abaixar3
    ];

    // Resize the canvas to fit the window FIRST
    resize();
    
    // Initialise collectible items AFTER resize.  Musical notes and vinyl records are
    // placed throughout the level for the player to collect.  When
    // collected they increase the appropriate counter and disappear.
    // Determine sizes based on the loaded icons.  We will draw all
    // collectibles at the same size for simplicity.
    const itemSize = 32;
    const noteImg = images.note;
    const recordImg = images.record;
    // Distribute 10 notes evenly across the world (excluding the
    // extreme edges) and 5 records.  The y coordinate is just above
    // the ground.
    const noteCountTotal = 10;
    const recordCountTotal = 5;
    for (let i = 1; i <= noteCountTotal; i++) {
      const x = i * (GAME_WIDTH / (noteCountTotal + 1));
      worldObjects.push({ type: 'collectible', itemType: 'note', x: x, y: groundY - itemSize, size: itemSize, collected: false });
    }
    for (let i = 1; i <= recordCountTotal; i++) {
      const x = i * (GAME_WIDTH / (recordCountTotal + 1));
      worldObjects.push({ type: 'collectible', itemType: 'record', x: x + (GAME_WIDTH / (recordCountTotal + 1)) / 2, y: groundY - itemSize, size: itemSize, collected: false });
    }
    
    // Generate world objects procedurally AFTER resize
    generateWorldObjects(0, GAME_WIDTH);
    window.addEventListener('resize', resize);
    // Set up input handlers
    setupKeyboard();
    createTouchControls();
    setupMenuInput(); // Call the new function to set up menu input
    setupAccelerometerControls(); // Setup accelerometer controls
    setupGameTouchControls(); // Setup game touch controls for jump/crouch

    updateBarPositions(); // Initialize bar positions

    // Start the loop
    requestAnimationFrame(gameLoop);
  }).catch((err) => {
    console.error('Error loading images', err);
  });

  // Function to draw a streetlight
  function drawStreetlight(x, y, width, height, color, lightColor, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    // Pole
    ctx.fillStyle = color;
    ctx.fillRect(drawX, y - height, width, height);
    // Light fixture
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(drawX + width / 2, y - height - 10, 15, 0, Math.PI * 2); // Simple circle for light
    ctx.fill();
  }

  // Function to draw a fence
  function drawFence(x, y, width, height, color, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    ctx.fillStyle = color;
    // Fence posts
    ctx.fillRect(drawX, y - height, 10, height); // Left post
    ctx.fillRect(drawX + width - 10, y - height, 10, height); // Right post
    // Fence horizontal planks
    ctx.fillRect(drawX, y - height, width, 10); // Top plank
    ctx.fillRect(drawX, y - height / 2, width, 10); // Middle plank
  }

  // Function to draw a bush
  function drawBush(x, y, size, color, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(drawX, y - size / 2, size / 2, 0, Math.PI * 2); // Simple circle for bush
    ctx.fill();
  }

  // Function to draw a speed boost platform
  function drawSpeedBoost(x, y, width, height, color, parallaxScrollX) {
    const drawX = x - parallaxScrollX;
    ctx.fillStyle = color;
    ctx.fillRect(drawX, y - height, width, height);

    // Draw glowing effect when not activated
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillRect(drawX, y - height, width, height);
    ctx.shadowBlur = 0; // Reset shadow

    // Draw arrow indicating speed boost
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(drawX + width * 0.3, y - height * 0.6);
    ctx.lineTo(drawX + width * 0.7, y - height * 0.6);
    ctx.lineTo(drawX + width * 0.5, y - height * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  // Function to draw a breakable crate
  function drawBreakableCrate(x, y, width, height, color, parallaxScrollX, broken) {
    const drawX = x - parallaxScrollX;
    if (broken) {
      // Draw broken crate pieces
      ctx.fillStyle = '#654321'; // Darker brown for broken pieces
      ctx.fillRect(drawX, y - height + 5, width * 0.4, height * 0.6);
      ctx.fillRect(drawX + width * 0.6, y - height, width * 0.3, height * 0.4);
    } else {
      // Draw intact crate
      ctx.fillStyle = color;
      ctx.fillRect(drawX, y - height, width, height);

      // Draw crate details
      ctx.strokeStyle = '#5A2D0C';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, y - height, width, height);

      // Draw planks
      ctx.fillStyle = '#5A2D0C';
      ctx.fillRect(drawX, y - height / 2 - 2, width, 4); // Horizontal plank
      ctx.fillRect(drawX + width / 2 - 2, y - height, 4, height); // Vertical plank
    }
  }
})();