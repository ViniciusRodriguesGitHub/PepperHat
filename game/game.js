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

  // Asset paths relative to this script.  In addition to the city
  // background and ground tile, we load a sequence of frames for the
  // pepper’s idle animation.  Additional animations (walk, jump) can
  // easily be added later by including more frames here and pushing
  // them into the appropriate player.animations arrays.
  const assets = {
    ground: 'ground_tile.png',
    // An unused single frame is kept for backwards compatibility but
    // won’t be drawn once animations are in place.
    pepper: 'pepper.png',
    pepper_idle_0: 'pepper_idle_0.png',
    pepper_idle_1: 'pepper_idle_1.png',
    pepper_idle_2: 'pepper_idle_2.png',
    pepper_idle_3: 'pepper_idle_3.png',
    pepper_idle_4: 'pepper_idle_4.png',
    pepper_idle_5: 'pepper_idle_5.png',
    wk1: 'wk1.png',
    wk2: 'wk2.png',
    wk3: 'wk3.png',
    wk4: 'wk4.png',
    subindo: '1subindo.png',
    desacelerando: '2desacelerando.png',
    caindo: '3caindo.png',
    parado: 'parado.png',
    note: 'note.png',
    record: 'record.png',
    ground_tile: 'ground_tile.png'
  };

  const images = {};

  // Pastel color palettes
  const pastelLightColors = [
    '#B3E5FC', // Light Blue
    '#C8E6C9', // Light Green
    '#FFF9C4', // Light Yellow
    '#FFCCBC', // Light Orange
    '#F8BBD0', // Light Pink
  ];
  const pastelDesaturatedColors = [
    '#90CAF9', // Desaturated Blue
    '#A5D6A7', // Desaturated Green
    '#FFECB3', // Desaturated Yellow
    '#FFAB91', // Desaturated Orange
    '#F48FB1', // Desaturated Pink
  ];
  const windowColors = [
    '#E3F2FD', // Very Light Blue
    '#BBDEFB', // Light Blue
  ];
  const doorColors = [
    '#D7CCC8', // Light Brown
    '#BCAAA4', // Medium Brown
  ];

  let noteCount = 0; // Redeclare noteCount as a global variable
  let recordCount = 0; // Redeclare recordCount as a global variable

  // Player state
  const player = {
    x: 100,
    y: 0,
    width: 50, // Reduced from 100 to 50
    height: 60, // Reduced from 120 to 60
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

  // World objects for procedural generation
  let worldObjects = [];

  let groundY = 0;
  let lastTime = 0;
  let scrollX = 0;

  // Procedural generation parameters
  const VIEW_RANGE = GAME_WIDTH * 1.5; // How far ahead/behind the player to generate/keep objects
  const GENERATION_BUFFER = GAME_WIDTH / 2; // How far past the view range to generate
  let lastGeneratedChunkX = 0; // Tracks the furthest X-coordinate generated

  // Load all images and start the game loop once complete
  function loadImages() {
    const promises = Object.keys(assets).map(key => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = assets[key];
        img.onload = () => {
          images[key] = img;
          console.log(`Image loaded: ${key} -> ${assets[key]}`); // Log image loading
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Error loading image: ${key} -> ${assets[key]}`, err); // Log image loading errors
          reject(err);
        };
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

  // Function to generate world objects procedurally
  function generateWorldObjects(startX, endX) {
    const segmentWidth = 200; // Average spacing between objects
    let currentX = startX;
    while (currentX < endX) {
      const rand = Math.random();
      if (rand < 0.4) { // 40% chance for a house (structure)
        const isBackground = Math.random() < 0.3; // 30% chance to be a background house
        const scale = isBackground ? 0.6 + Math.random() * 0.2 : 1; // Smaller for background
        const houseWidth = (150 + Math.random() * 100) * scale; // Random width between 150-250, scaled
        const houseHeight = (100 + Math.random() * 100) * scale; // Random height between 100-200, scaled
        const hasWindow = Math.random() > 0.3;
        const hasDoor = Math.random() > 0.2;
        const hasRoof = Math.random() > 0.1;

        const bodyColors = isBackground ? pastelDesaturatedColors : pastelLightColors;
        const selectedBodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
        const selectedWindowColor = hasWindow ? windowColors[Math.floor(Math.random() * windowColors.length)] : null;
        const selectedDoorColor = hasDoor ? doorColors[Math.floor(Math.random() * doorColors.length)] : null;

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
        });
      } else if (rand < 0.7) { // 30% chance for a tree
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
      } else { // 30% chance for a pole
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
      }
      currentX += segmentWidth + Math.random() * 100; // Advance position with some randomness

      // 20% chance to place a collectible
      if (Math.random() < 0.2) {
        const itemType = Math.random() < 0.5 ? 'note' : 'record';
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
    leftBtn.style.left = '30px'; // Increased padding from left
    leftBtn.style.top = (GAME_HEIGHT - 100) + 'px'; // Pushed slightly higher
    rightBtn.style.left = '120px'; // Adjusted relative to leftBtn
    rightBtn.style.top = (GAME_HEIGHT - 100) + 'px'; // Pushed slightly higher
    actionBtn.style.left = (GAME_WIDTH - 100) + 'px'; // Increased padding from right
    actionBtn.style.top = (GAME_HEIGHT - 100) + 'px'; // Pushed slightly higher
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

    // Handle idle animation logic
    if (player.vx === 0 && player.onGround) {
      player.idleTime += dt;
    } else {
      player.idleTime = 0;
      // Removed: player.animIndex = 0; // Reset to the first (and only) idle frame when moving or not on ground
    }

    // Apply horizontal velocity
    player.x += player.vx * dt;
    // Clamp within world bounds (now only left side)
    if (player.x < 0) player.x = 0;
    // Removed right-side clamping, world is infinite to the right

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

    // Check for collisions with collidable world objects (e.g., poles)
    for (const obj of worldObjects) {
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
    }

    // Select appropriate animation based on current state. You can
    // expand this logic when you implement walking or jumping
    if (!player.onGround) {
      if (player.vy < 0) {
        player.currentAnim = 'jump';
        player.animIndex = 0; // 1subindo.png
      } else if (player.vy >= 200 && player.vy <= 400) { // Adjusted from === 0 to a range around 0
        player.currentAnim = 'jump';
        player.animIndex = 1; // 2desacelerando.png
      } else {
        player.currentAnim = 'jump';
        player.animIndex = 2; // 3caindo.png
      }
    } else if (input.left || input.right) { // Changed from player.vx !== 0 to direct input check
      player.currentAnim = 'walk';
    } else {
      player.currentAnim = 'idle';
    }

    // Reset animIndex if the animation changes
    if (player.currentAnim !== player.lastAnim) {
      player.animIndex = 0;
    }
    player.lastAnim = player.currentAnim;

    // Advance the frame timer.  When enough time has passed, move to
    // the next frame in the current animation.  If the selected
    // animation has no frames (e.g., walk/jump not yet implemented),
    // fallback to using the idle animation.
    const frames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
      ? player.animations[player.currentAnim]
      : player.animations.idle;
    const animSpeed = 0.15; // Doubled animation speed (reduced from 0.3 to 0.15 seconds per frame)

    player.animTimer += dt;
    if (player.animTimer >= animSpeed) {
      player.animTimer = 0;
      if (player.currentAnim === 'idle') {
        player.animIndex = 0; // Always use the single idle frame (parado.png)
      } else if (player.currentAnim === 'jump') {
        // For jump animation, animIndex is set based on vy, so no need to advance here
      } else { // This block handles 'walk' and other non-idle/non-jump animations
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

    // Remove objects that are far behind the player
    worldObjects = worldObjects.filter(obj => obj.x + (obj.width || 0) > scrollX - VIEW_RANGE);

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
          if (item.itemType === 'note') {
            noteCount++;
          } else if (item.itemType === 'record') {
            recordCount++;
          }
        }
      }
    }
  }

  // Render loop
  function render() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
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

      const parallaxFactor = obj.layer === 'background' ? 0.5 : 1; // Adjust parallax for background
      const effectiveScrollX = scrollX * parallaxFactor;

      if (obj.type === 'structure') {
        drawStructure(obj.x, obj.y, obj.width, obj.height, obj.bodyColor, obj.windowColor, obj.doorColor, obj.hasRoof, effectiveScrollX);
      } else if (obj.type === 'tree') {
        drawTree(obj.x, obj.y, obj.trunkHeight, obj.canopyRadius, obj.trunkColor, obj.canopyColor, effectiveScrollX);
      } else if (obj.type === 'pole') {
        drawPole(obj.x, obj.y, obj.height, obj.color, effectiveScrollX);
      }
    }

    // Draw collectibles that have not yet been collected from worldObjects
    for (const obj of worldObjects) {
      if (obj.type === 'collectible' && !obj.collected) {
        if (obj.x + (obj.size || 0) < scrollX - VIEW_RANGE || obj.x > scrollX + GAME_WIDTH + VIEW_RANGE) {
          continue; // Only draw objects within the view range
        }
        const parallaxFactor = obj.layer === 'background' ? 0.5 : 1; // Adjust parallax for background
        const effectiveScrollX = scrollX * parallaxFactor;
        drawCollectible(obj.x, obj.y, obj.size, obj.itemType, effectiveScrollX);
      }
    }

    // Draw the player using the current animation frame.  If the
    // current animation has no frames loaded (e.g. walk/jump
    // animations aren’t provided yet), fall back to the idle
    // animation.  When facing left we flip the image horizontally.
    const activeFrames = player.animations[player.currentAnim] && player.animations[player.currentAnim].length
      ? player.animations[player.currentAnim]
      : player.animations.idle;
    const frameImage = activeFrames[player.animIndex % activeFrames.length];
    console.log(`Rendering: Anim=${player.currentAnim}, Index=${player.animIndex}, FrameSrc=${frameImage ? frameImage.src : 'N/A'}`); // Log current animation frame
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

    // Draw counters for collected items in the upper left corner.
    // We draw the icon at a small size followed by the count text.
    const iconSize = 24;
    let offsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    // Note counter
    ctx.drawImage(images.note, 10, offsetY, iconSize, iconSize);
    noteCount = worldObjects.filter(obj => obj.type === 'collectible' && obj.itemType === 'note' && !obj.collected).length;
    ctx.fillText('x ' + noteCount, 10 + iconSize + 4, offsetY + iconSize - 6);
    offsetY += iconSize + 4;
    // Record counter
    ctx.drawImage(images.record, 10, offsetY, iconSize, iconSize);
    recordCount = worldObjects.filter(obj => obj.type === 'collectible' && obj.itemType === 'record' && !obj.collected).length;
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

    // Initialise collectible items.  Musical notes and vinyl records are
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
    // Generate world objects procedurally
    generateWorldObjects(0, GAME_WIDTH);

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