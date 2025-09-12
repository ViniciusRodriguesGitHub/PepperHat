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

  // Asset paths relative to this script.  In addition to the city
  // background and ground tile, we load a sequence of frames for the
  // pepper's idle animation.  Additional animations (walk, jump) can
  // easily be added later by including more frames here and pushing
  // them into the appropriate player.animations arrays.
  const assets = {
    ground: 'ground_tile.png',
    // An unused single frame is kept for backwards compatibility but
    // won't be drawn once animations are in place.
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
    abaixar1: 'l0_abaixar1.png',
    abaixar2: 'l0_abaixar2.png',
    abaixar3: 'l0_abaixar3.png',
    note: 'note.png',
    record: 'record.png',
    ground_tile: 'ground_tile.png'
  };

  const animatedBar = {
    // x: GAME_WIDTH / 2 - 100, // Will be calculated in updateBarPositions
    y: 50, // Positioned near the top (initial value, will be updated)
    width: 200,
    height: 20,
    fill: 0.0, // Current fill level (0.0 to 1.0)
    fillDirection: 1, // 1 for increasing, -1 for decreasing
    speed: 2.0, // How fast it oscillates (0.5 * 4 = 2.0)
    isVisible: false,
    color: '#00FF00', // Default to green
  };

  const staminaBar = {
    // x: animatedBar.x, // Will be calculated in updateBarPositions
    // y: animatedBar.y - animatedBar.height - 10, // Will be calculated in updateBarPositions
    width: animatedBar.width,
    height: animatedBar.height,
    fill: 1.0, // Start fully filled
    drainSpeed: 0.2, // Speed at which stamina drains (per second)
    recoverSpeed: 0.2, // Speed at which stamina recovers (per second)
    color: '#FFA500', // Orange
  };

  let images = {};

  // Pastel color palettes
  const pastelLightColors = [
    '#B3E5FC', // Light Blue
    '#C8E6C9', // Light Green
    '#FFF9C4', // Light Yellow
    '#FFCCBC', // Light Orange
    '#F8BBD0', // Light Pink
  ];
  const softPastelLightColors = [
    '#FDFD96', // Light Yellow
    '#84B6F4', // Light Blue
    '#FF6961', // Light Red
    '#77DD77', // Light Green
    '#FFD1DC', // Light Pink
    '#B19CD9', // Light Purple
  ];
  const furnitureTypes = [
    { type: 'refrigerator', minWidth: 40, maxWidth: 50, minHeight: 90, maxHeight: 120 },
    { type: 'cabinet', minWidth: 60, maxWidth: 100, minHeight: 70, maxHeight: 100 },
    { type: 'table', minWidth: 80, maxWidth: 150, minHeight: 40, maxHeight: 60 },
    { type: 'television', minWidth: 50, maxWidth: 80, minHeight: 40, maxHeight: 60 },
    { type: 'sofa', minWidth: 100, maxWidth: 180, minHeight: 30, maxHeight: 50 }, // New: Sofa
    { type: 'plant', minWidth: 20, maxWidth: 40, minHeight: 50, maxHeight: 80 }, // New: Plant
    { type: 'painting', minWidth: 30, maxWidth: 60, minHeight: 40, maxHeight: 70 }, // New: Painting
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
  let playerDistanceWalked = 0; // New global variable to track player's distance walked
  let maxPlayerX = 0; // New global variable to store the maximum x-coordinate reached by the player
  let houseFurniture = []; // Stores furniture objects when inside a house
  let isInHouse = false; // New state to track if player is inside a house
  let lastEntranceDoor = null; // Stores the door object the player last entered through

  // Enemy state
  const enemy = {
    x: GAME_WIDTH - 50, // Initial position on the right side of the screen
    y: 0, // Will be set correctly after groundY is calculated
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 150, // Slightly slower than player's moveSpeed (200) - Adjusted from 180
    onGround: false,
  };

  const enemyHitboxOffset = 10; // Offset to reduce the enemy's collision box size

  let isGameOver = false; // New global variable to track game over state
  let currentGameState = 'menu'; // 'menu', 'playing', 'gameOver'
  let difficulty = 'normal'; // 'easy', 'normal'
  let highScores = JSON.parse(localStorage.getItem('highScores') || '[]'); // Load high scores from localStorage

  // New: Variables for enemy proximity effect
  let enemyPlayerDistance = Infinity; // Stores the calculated distance between enemy and player
  const pulsationEffect = {
    opacity: 0,
    speed: 0,
    normalizedDistance: 1 // New: Stores the normalized distance for border width calculation
  }; // Stores opacity and speed for the pulsating border effect

  // Player state
  const player = {
    x: GAME_WIDTH / 2 - 25, // Centered horizontally using a direct value (50 / 2 = 25)
    y: 0, // Will be set correctly after groundY is calculated
    width: 50, // Reduced from 100 to 50
    initialHeight: 60, // Store initial height
    crouchHeight: 30, // Crouching height (half of initialHeight)
    height: 60, // Reduced from 120 to 60. This will change when crouching.
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
    baseMoveSpeed: 200, // pixels per second - Moved to player object
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
  const VIEW_RANGE = GAME_WIDTH * 1.5; // How far ahead/behind the player to generate/keep objects
  const GENERATION_BUFFER = GAME_WIDTH / 2; // How far past the view range to generate
  let lastGeneratedChunkX = 0; // Tracks the furthest X-coordinate generated

  // Function to update the positions of the stamina and animated bars
  function updateBarPositions() {
    animatedBar.x = GAME_WIDTH / 2 - animatedBar.width / 2;
    staminaBar.x = GAME_WIDTH / 2 - staminaBar.width / 2;
    staminaBar.y = animatedBar.y - animatedBar.height - 10; // 10 pixels above animatedBar
  }

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

  // Resize the canvas to fill the whole window
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Log dimensions for debugging
    console.log(`Resize: window.innerWidth=${window.innerWidth}, window.innerHeight=${window.innerHeight}`);
    console.log(`Resize: canvas.width=${canvas.width}, canvas.height=${canvas.height}`);

    // Update GAME_WIDTH and GAME_HEIGHT to reflect the new canvas dimensions
    // This will ensure game elements scale correctly with the new canvas size
    GAME_WIDTH = canvas.width;
    GAME_HEIGHT = canvas.height;
    updateBarPositions(); // Update bar positions on resize
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

        const doorWidth_val = houseWidth / 4;
        const doorHeight_val = houseHeight / 2;
        let doorX_offset_val;
        if (hasWindow) {
          doorX_offset_val = houseWidth - doorWidth_val - (houseWidth / 8);
        } else {
          doorX_offset_val = (houseWidth / 2) - (doorWidth_val / 2);
        }
        const doorY_offset_val = houseHeight - doorHeight_val;

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
          // Add door collision area if it has a door
          doorArea: hasDoor ? {
            x_offset: doorX_offset_val,
            y_offset: doorY_offset_val,
            width: doorWidth_val,
            height: doorHeight_val,
          } : null,
          houseInterior: hasDoor ? null : null, // New: Stores generated furniture for this house
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
      const furnitureType = furnitureTypes[Math.floor(Math.random() * furnitureTypes.length)];
      const color = softPastelLightColors[Math.floor(Math.random() * softPastelLightColors.length)];

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
      btn.style.fontSize = '32px';
      btn.style.borderRadius = '8px';
      btn.style.border = '2px solid #fff';
      btn.style.userSelect = 'none';
      btn.style.zIndex = '10';
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'grab'; // Indicate draggable
      return btn;
    }
    // Existing makeButton function remains, but its usage will be for other buttons

    // Create buttons for movement and actions
    const leftBtn = makeButton('◀', 'leftBtn');
    leftBtn.style.left = '10px';
    leftBtn.style.bottom = '10px';
    container.appendChild(leftBtn);

    const rightBtn = makeButton('▶', 'rightBtn');
    rightBtn.style.left = '90px';
    rightBtn.style.bottom = '10px';
    container.appendChild(rightBtn);

    const jumpBtn = makeButton('A', 'jumpBtn');
    jumpBtn.style.right = '10px';
    jumpBtn.style.bottom = '90px';
    container.appendChild(jumpBtn);

    const crouchBtn = makeButton('B', 'crouchBtn');
    crouchBtn.style.right = '10px';
    crouchBtn.style.bottom = '10px';
    container.appendChild(crouchBtn);

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

    // Drag functionality for buttons (simplified, no lock button)
    const controlButtons = [leftBtn, rightBtn, jumpBtn, crouchBtn]; // Only game control buttons
    let activeDragBtn = null;
    let initialX, initialY;

    // Load saved positions if they exist
    const savedPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
    if (Object.keys(savedPositions).length > 0) {
      controlButtons.forEach(btn => {
        const pos = savedPositions[btn.dataset.id];
        if (pos) {
          btn.style.left = pos.left;
          btn.style.top = pos.top;
        }
      });
    }

    controlButtons.forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        activeDragBtn = btn;
        initialX = e.clientX - btn.getBoundingClientRect().left;
        initialY = e.clientY - btn.getBoundingClientRect().top;
        btn.style.zIndex = '11'; // Bring dragged button to front
        btn.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      });

      btn.addEventListener('pointermove', (e) => {
        if (!activeDragBtn || activeDragBtn !== btn) return;

        const newX = e.clientX - initialX;
        const newY = e.clientY - initialY;

        activeDragBtn.style.left = `${newX}px`;
        activeDragBtn.style.top = `${newY}px`;
        e.preventDefault();
      });

      btn.addEventListener('pointerup', (e) => {
        if (!activeDragBtn || activeDragBtn !== btn) return;
        activeDragBtn.style.zIndex = '10';
        activeDragBtn.releasePointerCapture(e.pointerId);
        activeDragBtn = null;
        e.stopPropagation();
        // Save positions after dragging any button (auto-save)
        const currentPositions = {};
        controlButtons.forEach(btn => {
          if (btn.dataset.id) {
            currentPositions[btn.dataset.id] = { left: btn.style.left, top: btn.style.top };
          }
        });
        localStorage.setItem('controlPositions', JSON.stringify(currentPositions));
      });

      btn.addEventListener('pointercancel', (e) => {
        if (!activeDragBtn || activeDragBtn !== btn) return;
        activeDragBtn.style.zIndex = '10';
        activeDragBtn.releasePointerCapture(e.pointerId);
        activeDragBtn = null;
        e.stopPropagation();
      });
    });
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
        case 'ControlLeft': // New case for 'Ctrl' key for crouching
        case 'ControlRight':
        case 'KeyS': // New case for 'S' key for crouching
          input.crouch = true;
          break;
        case 'ArrowDown': // New case for 'ArrowDown' key for crouching
          input.crouch = true;
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
        const easyButtonWidth = 200;
        const easyButtonHeight = 60;
        const easyButtonX = GAME_WIDTH / 2 - easyButtonWidth / 2;
        const easyButtonY = GAME_HEIGHT / 2 - easyButtonHeight / 2 - 30;

        // Normal Button coordinates (defined in drawMenu)
        const normalButtonWidth = 200;
        const normalButtonHeight = 60;
        const normalButtonX = GAME_WIDTH / 2 - normalButtonWidth / 2;
        const normalButtonY = GAME_HEIGHT / 2 - normalButtonHeight / 2 + 60;

        // Check if Easy button clicked/touched
        if (x >= easyButtonX && x <= easyButtonX + easyButtonWidth &&
            y >= easyButtonY && y <= easyButtonY + easyButtonHeight) {
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
          difficulty = 'normal';
          if (lastDeviceOrientationEvent) {
            neutralGamma = lastDeviceOrientationEvent.gamma;
            neutralBeta = lastDeviceOrientationEvent.beta;
          }
          resetGame(); // Starts the game in normal mode
        }
      }
      // Check for Restart button click/touch if in game over state
      else if (currentGameState === 'gameOver') {
        // Restart Button coordinates (defined in drawGameOverMenu)
        // Removed scoreY calculation as it's not needed for the restart button's fixed position
        const restartButtonWidth = 120; // Diminuído (match drawGameOverMenu)
        const restartButtonHeight = 40; // Diminuído (match drawGameOverMenu)
        const restartButtonX = GAME_WIDTH / 2 - restartButtonWidth / 2;
        const restartButtonY = 10; // Mais próximo do topo (match drawGameOverMenu)

        // Debugging: Log click coordinates and button bounds
        console.log(`Click: x=${x}, y=${y}`);
        console.log(`Restart Button: x=${restartButtonX}, y=${restartButtonY}, width=${restartButtonWidth}, height=${restartButtonHeight}`);

        if (x >= restartButtonX && x <= restartButtonX + restartButtonWidth &&
            y >= restartButtonY && y <= restartButtonY + restartButtonHeight) {
          currentGameState = 'menu'; // Change to menu state
        }
      }
    };
    canvas.addEventListener('mousedown', handleMenuInteraction, false);
    canvas.addEventListener('touchstart', handleMenuInteraction, false);
  }

  // Setup accelerometer controls for mobile devices
  function setupAccelerometerControls() {
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

    function handleOrientation(event) {
      lastDeviceOrientationEvent = event; // Store the latest orientation event
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

      const tiltThreshold = 7; // Degrees to start moving (ajuste este valor para calibrar a sensibilidade)
      const maxTilt = 45; // Max tilt for full speed (e.g., 45 degrees)

      input.left = false;
      input.right = false;
      input.accelerometerSpeedFactor = 0;

      if (effectiveTilt > tiltThreshold) {
        // Tilt right
        input.right = true;
        // No need for tiltFactor here, as we want full speed
        input.accelerometerSpeedFactor = 1; // Always full speed
      } else if (effectiveTilt < -tiltThreshold) {
        // Tilt left
        input.left = true;
        // No need for tiltFactor here, as we want full speed
        input.accelerometerSpeedFactor = 1; // Always full speed
      } else {
        // Neutral position, input.left/right are already false, speedFactor is 0
      }
    }
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

    player.x = GAME_WIDTH / 2 - player.width / 2; // Center player horizontally
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
  }

  // Game update loop
  function update(dt) {
    if (currentGameState === 'menu' || currentGameState === 'gameOver') {
      return; // Stop all game updates if in menu or game over state
    }

    // dt is delta time in seconds
    // Horizontal movement
    const baseMoveSpeed = 200; // pixels per second
    let moveSpeed = baseMoveSpeed; // Initialize with base speed
    const gravity = 1200; // pixels per second squared

    // Adjust move speed based on stamina
    if (staminaBar.fill < 1.0) {
      moveSpeed = player.baseMoveSpeed * (0.5 + 0.5 * staminaBar.fill); // Scales from 50% to 100% of baseMoveSpeed
    } else {
      moveSpeed = player.baseMoveSpeed; // Use baseMoveSpeed if stamina is full
    }

    // Apply accelerated jump factor if active
    if (player.isAcceleratedJump) {
      moveSpeed *= player.jumpAccelerationFactor;
      // Gradually decay the acceleration factor
      player.jumpAccelerationFactor = Math.max(1.0, player.jumpAccelerationFactor - (0.8 * dt)); // Decay from 1.8 to 1.0 over time
    }

    player.vx = 0;
    if (!input.crouch) { // Only allow horizontal movement if not crouching
      // Prioritize accelerometer input if it's active and detecting movement
      if (input.accelerometerActive && input.accelerometerSpeedFactor > 0) {
        if (input.left) player.vx = -moveSpeed;
        else if (input.right) player.vx = moveSpeed;
      } else { // Fallback to keyboard/gamepad
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
      const maxEffectDistance = GAME_WIDTH / 2; // e.g., half screen width
      const normalizedDistance = Math.min(1, enemyPlayerDistance / maxEffectDistance);

      pulsationEffect.opacity = (1 - normalizedDistance) * 0.7; // Max opacity 70%
      pulsationEffect.speed = 0.5 + (1 - normalizedDistance) * 1.5; // Speed from 0.5 (far) to 2 (close) - Slower pulse
      pulsationEffect.normalizedDistance = normalizedDistance; // Store normalized distance for border width

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
              // Reposition player inside the house, in front of the exit door
              player.x = GAME_WIDTH / 2;
              player.y = groundY - player.initialHeight; // Ensure player is on the ground inside
              input.crouch = false; // Reset crouch input to prevent immediate re-entry/exit
              return; // Exit update early to prevent further movement/animation issues
            }
          }
        }
      }
    } else { // isInHouse === true
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
        playerDistanceWalked = Math.floor(maxPlayerX / 10); // Display distance in meters based on max x
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
        player.vy = -600; // jump impulse
        player.onGround = false;
        // Reset jump flag so holding the button doesn't cause repeated jumps
        input.jump = false;

        // Check for accelerated jump condition (red animated bar)
        if (animatedBar.fill > 0.9) {
          player.isAcceleratedJump = true;
          player.jumpAccelerationFactor = 1.8; // Initial acceleration factor
        }
      }
    }

    // Apply vertical velocity
    player.y += player.vy * dt;
    // Ground collision
    const groundTolerance = 1; // Small tolerance for ground detection
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
        player.animIndex = 0; // 1subindo.png
      } else if (player.vy >= 200 && player.vy <= 400) { // Adjusted from === 0 to a range around 0
        player.currentAnim = 'jump';
        player.animIndex = 1; // 2desacelerando.png
      } else {
        player.currentAnim = 'jump';
        player.animIndex = 2; // 3caindo.png
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
      if (animatedBar.fill > 0.9) {
        animatedBar.color = '#FF0000'; // Red
      } else {
        animatedBar.color = '#00FF00'; // Green
      }
    }

    // Update stamina bar
    if (player.vx !== 0 && !isInHouse) { // Player is moving and not in house
      staminaBar.fill -= staminaBar.drainSpeed * dt;
    } else { // Player is idle or in house
      let recoveryRate = staminaBar.recoverSpeed;
      if (input.crouch) {
        recoveryRate *= 2; // Double recovery rate if crouching
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
    const animSpeed = 0.15; // Doubled animation speed (reduced from 0.3 to 0.15 seconds per frame)

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
            } else if (item.itemType === 'record') {
              recordCount++;
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
    ctx.fillText('Pepper Hat', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150);

    // Easy Button
    const easyButtonWidth = 200;
    const easyButtonHeight = 60;
    const easyButtonX = GAME_WIDTH / 2 - easyButtonWidth / 2;
    const easyButtonY = GAME_HEIGHT / 2 - easyButtonHeight / 2 - 30;

    ctx.fillStyle = '#27ae60'; // Green for Easy
    ctx.fillRect(easyButtonX, easyButtonY, easyButtonWidth, easyButtonHeight);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 3;
    ctx.strokeRect(easyButtonX, easyButtonY, easyButtonWidth, easyButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('EASY', GAME_WIDTH / 2, easyButtonY + easyButtonHeight / 2);

    // Normal Button
    const normalButtonWidth = 200;
    const normalButtonHeight = 60;
    const normalButtonX = GAME_WIDTH / 2 - normalButtonWidth / 2;
    const normalButtonY = GAME_HEIGHT / 2 - normalButtonHeight / 2 + 60;

    ctx.fillStyle = '#e74c3c'; // Red for Normal
    ctx.fillRect(normalButtonX, normalButtonY, normalButtonWidth, normalButtonHeight);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 3;
    ctx.strokeRect(normalButtonX, normalButtonY, normalButtonWidth, normalButtonHeight);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('NORMAL', GAME_WIDTH / 2, normalButtonY + normalButtonHeight / 2);
  }

  // Main drawing loop
  function render() {
    // Clear the canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (currentGameState === 'menu') {
      drawMenu();
      return; // Stop rendering game elements if in menu
    }

    // Calculate parallax scroll for background
    const parallaxScrollX = -player.x * 0.2; // 20% scroll speed
    const cityParallaxScrollX = -player.x * 0.1; // 10% scroll speed for distant city

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
      console.log(`Rendering: Anim=${player.currentAnim}, Index=${player.animIndex}, FrameSrc=${frameImage ? frameImage.src : 'N/A'}`);
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

      // Draw the enemy (only when outside the house)
      drawEnemy(enemy, scrollX);

      // Draw the pulsating proximity warning
      drawProximityWarning(performance.now());

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
      // animations aren't provided yet), fall back to the idle
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
    }

    // Game Over overlay
    if (currentGameState === 'gameOver') { // Changed from isGameOver to currentGameState
      drawGameOverMenu(); // Call the new function to draw the game over menu
      return; // Stop further rendering of game elements
    }

    // Draw counters for collected items in the upper left corner.
    // We draw the icon at a small size followed by the count text.
    const iconSize = 24;
    let offsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';

    // Draw note count
    ctx.drawImage(images.note, 10, offsetY, iconSize, iconSize);
    ctx.fillText('x ' + noteCount, 10 + iconSize + 4, offsetY + iconSize - 6);
    offsetY += iconSize + 5;

    // Draw record count
    ctx.drawImage(images.record, 10, offsetY, iconSize, iconSize);
    ctx.fillText('x ' + recordCount, 10 + iconSize + 4, offsetY + iconSize - 6);
    offsetY += iconSize + 5;

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

    // Draw animated bar if visible
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
    let scoreY = GAME_HEIGHT / 2 + 90;
    highScores.forEach((score, index) => {
      ctx.fillText(`${index + 1}. ${score}m`, GAME_WIDTH / 2, scoreY);
      scoreY += 25;
    });

    // Restart Button
    const restartButtonWidth = 120; // Diminuído (match drawGameOverMenu)
    const restartButtonHeight = 40; // Diminuído (match drawGameOverMenu)
    const restartButtonX = GAME_WIDTH / 2 - restartButtonWidth / 2;
    const restartButtonY = 10; // Mais próximo do topo (match drawGameOverMenu)

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

    // Set initial player and enemy Y positions now that groundY is known
    player.y = groundY - player.height;
    player.x = GAME_WIDTH / 2 - player.width / 2; // Center player horizontally
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
    setupMenuInput(); // Call the new function to set up menu input
    setupAccelerometerControls(); // Setup accelerometer controls
    setupGameTouchControls(); // Setup game touch controls for jump/crouch

    updateBarPositions(); // Initialize bar positions

    // Start the loop
    requestAnimationFrame(gameLoop);
  }).catch((err) => {
    console.error('Error loading images', err);
  });

  // New: Function to draw the pulsating proximity warning
  function drawProximityWarning(timestamp) {
    if (pulsationEffect.opacity > 0) {
      const pulse = Math.sin(timestamp / 100 * pulsationEffect.speed) * 0.5 + 0.5; // 0.0 to 1.0 pulse
      const currentOpacity = pulsationEffect.opacity * pulse;
      // Calculate border width dynamically based on enemy proximity
      const minBorderWidth = 20; // Minimum border width
      const maxBorderWidth = 80; // Maximum border width
      const borderWidth = minBorderWidth + (1 - pulsationEffect.normalizedDistance) * (maxBorderWidth - minBorderWidth);

      ctx.save();
      ctx.globalAlpha = currentOpacity; // Apply the calculated opacity for the whole effect

      // Top border
      let gradient = ctx.createLinearGradient(0, 0, 0, borderWidth);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, borderWidth);

      // Bottom border
      gradient = ctx.createLinearGradient(0, GAME_HEIGHT - borderWidth, 0, GAME_HEIGHT);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, GAME_HEIGHT - borderWidth, GAME_WIDTH, borderWidth);

      // Left border
      gradient = ctx.createLinearGradient(0, 0, borderWidth, 0);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, borderWidth, GAME_HEIGHT);

      // Right border
      gradient = ctx.createLinearGradient(GAME_WIDTH - borderWidth, 0, GAME_WIDTH, 0);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(GAME_WIDTH - borderWidth, 0, borderWidth, GAME_HEIGHT);

      ctx.restore();
    }
  }
})();