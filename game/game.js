/*
 * Minimalist platform game implemented without any external libraries.
 *
 * The game displays a pixel art city backdrop, a ground plane and a
 * single pepper character that you can move left and right across a
 * scrolling world.  Use the left/right arrow keys on a keyboard, the
 * on‑screen buttons on touch devices or a connected gamepad’s D‑pad
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
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 450;
  const WORLD_WIDTH = GAME_WIDTH * 3;

  // Asset paths relative to this script.  In addition to the city
  // background and ground tile, we load a sequence of frames for the
  // pepper’s idle animation.  Additional animations (walk, jump) can
  // easily be added later by including more frames here and pushing
  // them into the appropriate player.animations arrays.
  const assets = {
    background: 'city_background.png',
    ground: 'ground_tile.png',
    // An unused single frame is kept for backwards compatibility but
    // won’t be drawn once animations are in place.
    pepper: 'pepper.png',
    pepper_idle_0: 'pepper_idle_0.png',
    pepper_idle_1: 'pepper_idle_1.png',
    pepper_idle_2: 'pepper_idle_2.png',
    pepper_idle_3: 'pepper_idle_3.png',
    pepper_idle_4: 'pepper_idle_4.png',
    pepper_idle_5: 'pepper_idle_5.png'
    ,
    // Frames for walking animation
    pepper_walk_0: 'pepper_walk_0.png',
    pepper_walk_1: 'pepper_walk_1.png',
    pepper_walk_2: 'pepper_walk_2.png',
    pepper_walk_3: 'pepper_walk_3.png'
    ,
    // Collectible sprites
    note: 'note.png',
    record: 'record.png'
  };

  const images = {};

  // Collectible items and counters.  Items are inserted once the
  // images and world geometry are known.
  let collectibles = [];
  let noteCount = 0;
  let recordCount = 0;

  // Player state
  const player = {
    x: 100,
    y: 0,
    width: 100,
    height: 120,
    vx: 0,
    vy: 0,
    onGround: false,
    facingRight: true,
    // Animation data.  Each key holds an array of Image objects
    animations: {
      idle: [],
      walk: [],
      jump: []
    },
    currentAnim: 'idle',
    animIndex: 0,
    animTimer: 0
  };

  // Input state
  const input = {
    left: false,
    right: false,
    jump: false
  };

  let groundY = 0;
  let lastTime = 0;
  let scrollX = 0;

  // Load all images and start the game loop once complete
  function loadImages() {
    const promises = Object.keys(assets).map(key => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = assets[key];
        img.onload = () => {
          images[key] = img;
          resolve();
        };
        img.onerror = reject;
      });
    });
    return Promise.all(promises);
  }

  // Resize the canvas to maintain aspect ratio based on the window size
  function resize() {
    const ratio = GAME_WIDTH / GAME_HEIGHT;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (w / h > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
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
    function makeButton(label) {
      const btn = document.createElement('div');
      btn.textContent = label;
      btn.style.position = 'absolute';
      btn.style.width = '70px';
      btn.style.height = '70px';
      btn.style.background = 'rgba(0,0,0,0.35)';
      btn.style.color = '#fff';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.fontSize = '32px';
      btn.style.borderRadius = '8px';
      btn.style.border = '2px solid #fff';
      btn.style.userSelect = 'none';
      btn.style.zIndex = '10';
      btn.style.pointerEvents = 'auto';
      return btn;
    }
    const leftBtn = makeButton('◄');
    const rightBtn = makeButton('►');
    const actionBtn = makeButton('A');
    // Position buttons relative to the game resolution.  Since the canvas
    // is scaled, absolute positions based on GAME_WIDTH/HEIGHT still
    // align visually.
    leftBtn.style.left = '20px';
    leftBtn.style.top = (GAME_HEIGHT - 90) + 'px';
    rightBtn.style.left = '110px';
    rightBtn.style.top = (GAME_HEIGHT - 90) + 'px';
    actionBtn.style.left = (GAME_WIDTH - 90) + 'px';
    actionBtn.style.top = (GAME_HEIGHT - 90) + 'px';
    container.appendChild(leftBtn);
    container.appendChild(rightBtn);
    container.appendChild(actionBtn);
    // Attach pointer listeners
    const set = (btn, prop) => {
      btn.addEventListener('pointerdown', () => { input[prop] = true; });
      btn.addEventListener('pointerup', () => { input[prop] = false; });
      btn.addEventListener('pointercancel', () => { input[prop] = false; });
      btn.addEventListener('pointerout', () => { input[prop] = false; });
    };
    set(leftBtn, 'left');
    set(rightBtn, 'right');
    // Jump button uses the jump flag
    actionBtn.addEventListener('pointerdown', () => { input.jump = true; });
    actionBtn.addEventListener('pointerup', () => { input.jump = false; });
    actionBtn.addEventListener('pointercancel', () => { input.jump = false; });
    actionBtn.addEventListener('pointerout', () => { input.jump = false; });
  }

  // Keyboard controls
  function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          input.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          input.right = true;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          input.jump = true;
          break;
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
      }
    });
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
      }
    }
  }

  // Game update loop
  function update(dt) {
    // dt is delta time in seconds
    // Horizontal movement
    const moveSpeed = 200; // pixels per second
    player.vx = 0;
    if (input.left && !input.right) player.vx = -moveSpeed;
    if (input.right && !input.left) player.vx = moveSpeed;

    // Apply horizontal velocity
    player.x += player.vx * dt;
    // Clamp within world bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > WORLD_WIDTH) player.x = WORLD_WIDTH - player.width;

    // Gravity
    const gravity = 1200; // pixels per second squared
    player.vy += gravity * dt;

    // Jump
    if (input.jump && player.onGround) {
      player.vy = -600; // jump impulse
      player.onGround = false;
      // Reset jump flag so holding the button doesn't cause repeated jumps
      input.jump = false;
    }

    // Apply vertical velocity
    player.y += player.vy * dt;
    // Ground collision
    if (player.y + player.height > groundY) {
      player.y = groundY - player.height;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Determine facing direction for drawing
    if (player.vx < 0) player.facingRight = false;
    if (player.vx > 0) player.facingRight = true;

    // Select appropriate animation based on current state.  You can
    // expand this logic when you implement walking or jumping
    if (!player.onGround) {
      player.currentAnim = 'jump';
    } else if (player.vx !== 0) {
      player.currentAnim = 'walk';
    } else {
      player.currentAnim = 'idle';
    }
    // Advance the frame timer.  When enough time has passed, move to
    // the next frame in the current animation.  If the selected
    // animation has no frames (e.g., walk/jump not yet implemented),
    // fallback to using the idle animation.
    const frames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
      ? player.animations[player.currentAnim]
      : player.animations.idle;
    const animSpeed = 0.15; // seconds per frame
    player.animTimer += dt;
    if (player.animTimer >= animSpeed) {
      player.animTimer = 0;
      player.animIndex = (player.animIndex + 1) % frames.length;
    }

    // Camera follows player
    const halfScreen = GAME_WIDTH / 2;
    scrollX = player.x + player.width / 2 - halfScreen;
    if (scrollX < 0) scrollX = 0;
    const maxScroll = WORLD_WIDTH - GAME_WIDTH;
    if (scrollX > maxScroll) scrollX = maxScroll;

    // Check for collisions with collectibles.  When the player's
    // bounding box overlaps a collectible, mark it collected and
    // increment the appropriate counter.  We use simple AABB
    // collision detection.
    for (const item of collectibles) {
      if (item.collected) continue;
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
        if (item.type === 'note') noteCount++;
        if (item.type === 'record') recordCount++;
      }
    }
  }

  // Render loop
  function render() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Draw the city background in repeating segments with a slower
    // parallax factor to simulate depth
    const bgImg = images.background;
    const bgHeight = bgImg.height;
    const bgScaleY = (GAME_HEIGHT - images.ground.height) / bgHeight;
    const scaledBgHeight = bgHeight * bgScaleY;
    const parallaxX = scrollX * 0.3;
    // Determine how many repetitions of the background we need to cover the world
    const numBgTiles = Math.ceil(WORLD_WIDTH / bgImg.width) + 1;
    for (let i = 0; i < numBgTiles; i++) {
      const sx = i * bgImg.width - parallaxX;
      ctx.drawImage(bgImg, sx, 0, bgImg.width, bgImg.height,
        i * bgImg.width - parallaxX - scrollX, 0,
        bgImg.width, scaledBgHeight);
    }
    // Draw the ground as a repeating tile across the world
    const groundImg = images.ground;
    const numGroundTiles = Math.ceil(WORLD_WIDTH / groundImg.width) + 1;
    for (let i = 0; i < numGroundTiles; i++) {
      const gx = i * groundImg.width - scrollX;
      ctx.drawImage(groundImg, gx, groundY, groundImg.width, groundImg.height);
    }
    // Draw the player using the current animation frame.  If the
    // current animation has no frames loaded (e.g. walk/jump
    // animations aren’t provided yet), fall back to the idle
    // animation.  When facing left we flip the image horizontally.
    const activeFrames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
      ? player.animations[player.currentAnim]
      : player.animations.idle;
    const frameImage = activeFrames[player.animIndex % activeFrames.length];
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

    // Draw collectibles that have not yet been collected
    for (const item of collectibles) {
      if (item.collected) continue;
      const img = item.type === 'note' ? images.note : images.record;
      const drawX = item.x - scrollX;
      ctx.drawImage(img, drawX, item.y, item.size, item.size);
    }

    // Draw counters for collected items in the upper left corner.
    // We draw the icon at a small size followed by the count text.
    const iconSize = 24;
    let offsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    // Note counter
    ctx.drawImage(images.note, 10, offsetY, iconSize, iconSize);
    ctx.fillText('x ' + noteCount, 10 + iconSize + 4, offsetY + iconSize - 6);
    offsetY += iconSize + 4;
    // Record counter
    ctx.drawImage(images.record, 10, offsetY, iconSize, iconSize);
    ctx.fillText('x ' + recordCount, 10 + iconSize + 4, offsetY + iconSize - 6);
  }

  // Main game loop using requestAnimationFrame
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;
    // Reset one‑frame inputs
    // We do not reset left/right here because they can remain pressed
    pollGamepad();
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // Initialize the game once assets have loaded
  loadImages().then(() => {
    // Calculate ground Y coordinate from the ground image height
    groundY = GAME_HEIGHT - images.ground.height;
    // Build idle animation frames from the loaded images.  The frames
    // are kept in order.  If walking or jumping animations are added
    // later, push their frames into player.animations.walk or
    // player.animations.jump respectively.
    player.animations.idle = [
      images.pepper_idle_0,
      images.pepper_idle_1,
      images.pepper_idle_2,
      images.pepper_idle_3,
      images.pepper_idle_4,
      images.pepper_idle_5
    ];
    // Assemble walking animation frames
    player.animations.walk = [
      images.pepper_walk_0,
      images.pepper_walk_1,
      images.pepper_walk_2,
      images.pepper_walk_3
    ];
    // Initially we have no dedicated jump frames; jumping will use the idle frames
    player.animations.jump = player.animations.jump.length ? player.animations.jump : player.animations.idle;

    // Initialise collectible items.  Musical notes and vinyl records are
    // placed throughout the level for the player to collect.  When
    // collected they increase the appropriate counter and disappear.
    collectibles = [];
    noteCount = 0;
    recordCount = 0;
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
      const x = i * (WORLD_WIDTH / (noteCountTotal + 1));
      collectibles.push({ type: 'note', x: x, y: groundY - itemSize, size: itemSize, collected: false });
    }
    for (let i = 1; i <= recordCountTotal; i++) {
      const x = i * (WORLD_WIDTH / (recordCountTotal + 1));
      collectibles.push({ type: 'record', x: x + (WORLD_WIDTH / (recordCountTotal + 1)) / 2, y: groundY - itemSize, size: itemSize, collected: false });
    }
    // Resize the canvas to fit the window
    resize();
    window.addEventListener('resize', resize);
    // Set up input handlers
    setupKeyboard();
    createTouchControls();
    // Start the loop
    requestAnimationFrame(gameLoop);
  }).catch((err) => {
    console.error('Error loading images', err);
  });
})();