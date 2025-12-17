// ========================================
// COMPLETE EMERGENCY SYSTEM FIX
// FIXED: South and East emergency vehicles now move correctly
// ========================================

const canvas = document.getElementById("road");
const ctx = canvas.getContext("2d");

// State variables
let cars = [];
let light = "GREEN";
let emergencyMode = false;
let emergencyDirection = null;
let emergencyVehicle = null;

// WebSocket connection
const WS_URL = 'ws://localhost:3000';
let ws;
let reconnectAttempts = 0;

// ========================================
// WEBSOCKET CONNECTION
// ========================================
function connectWebSocket() {
  console.log('🔌 Connecting to WebSocket...');
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('📥 Message received:', message.type, message);

      // Handle different message types
      switch(message.type) {
        case 'state':
        case 'update':
          handleNormalUpdate(message.data);
          break;
        
        case 'emergency':
          handleEmergencyActivation(message.data);
          break;
        
        case 'emergency_cleared':
          handleEmergencyClear(message.data);
          break;
        
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('❌ WebSocket closed');
    
    // Attempt to reconnect
    if (reconnectAttempts < 5) {
      reconnectAttempts++;
      console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts}/5)`);
      setTimeout(connectWebSocket, 2000);
    }
  };
}

// ========================================
// MESSAGE HANDLERS
// ========================================
function handleNormalUpdate(data) {
  if (data.status) {
    light = data.status;
  }
  
  // Check if emergency mode is embedded in normal update
  if (data.emergencyMode && data.emergencyDirection) {
    handleEmergencyActivation(data);
  }
}

function handleEmergencyActivation(data) {
  console.log('🚨 EMERGENCY ACTIVATION RECEIVED');
  console.log('   Data:', data);
  
  // Set emergency state
  emergencyMode = true;
  light = 'EMERGENCY';
  emergencyDirection = data.emergencyDirection;
  emergencyVehicle = data.emergencyVehicle || 'AMBULANCE';
  
  console.log('📍 Emergency Direction:', emergencyDirection);
  console.log('🚑 Emergency Vehicle:', emergencyVehicle);
  
  // Clear all normal cars to make way
  const normalCars = cars.filter(c => !c.emergency);
  console.log(`🗑️ Clearing ${normalCars.length} normal cars`);
  cars = cars.filter(c => c.emergency);
  
  // Spawn emergency vehicle
  console.log('🚑 Spawning emergency vehicle...');
  spawnEmergencyVehicle(emergencyVehicle, emergencyDirection);
  
  console.log(`✅ Emergency vehicle spawned. Total cars: ${cars.length}`);
}

function handleEmergencyClear(data) {
  console.log('✅ EMERGENCY CLEARED');
  
  emergencyMode = false;
  light = 'GREEN';
  emergencyDirection = null;
  emergencyVehicle = null;
  
  console.log('▶️ Normal operation resumed');
}

// ========================================
// CAR SPAWNING
// ========================================
function spawnNormalCar(direction = null) {
  if (emergencyMode) {
    console.log('⏸️ Normal car spawn blocked - emergency active');
    return;
  }
  
  // Random direction if not specified
  const directions = ['north', 'south', 'east', 'west'];
  const dir = direction || directions[Math.floor(Math.random() * directions.length)];
  
  const position = getStartPosition(dir);
  
  cars.push({
    id: Date.now() + Math.random(),
    x: position.x,
    y: position.y,
    direction: dir,
    speed: 2,
    emergency: false,
    emoji: '🚗',
    color: '#38bdf8'
  });
  
  console.log(`🚗 Normal car spawned: ${dir}`);
}

function spawnEmergencyVehicle(vehicleType, direction) {
  console.log(`🚨 spawnEmergencyVehicle called`);
  console.log(`   Type: ${vehicleType}, Direction: ${direction}`);
  
  // Validate direction
  if (!direction) {
    console.error('❌ No direction provided!');
    return;
  }
  
  // Get emoji based on vehicle type
  const emoji = getEmergencyEmoji(vehicleType);
  
  // Get starting position based on direction
  const position = getStartPosition(direction);
  
  console.log(`   Start position: x=${position.x}, y=${position.y}`);
  
  // Create emergency vehicle object
  const emergencyVehicle = {
    id: 'EMERGENCY-' + Date.now(),
    x: position.x,
    y: position.y,
    direction: direction.toLowerCase(),
    speed: 6, // Faster than normal cars
    emergency: true,
    type: vehicleType,
    emoji: emoji,
    color: '#ef4444',
    flashTimer: 0
  };
  
  // Add to cars array
  cars.push(emergencyVehicle);
  
  console.log('✅ Emergency vehicle added to cars array');
  console.log('   Vehicle object:', emergencyVehicle);
  console.log('   Total cars:', cars.length);
}

function getEmergencyEmoji(vehicleType) {
  switch(vehicleType) {
    case 'AMBULANCE': return '🚑';
    case 'FIRE': return '🚒';
    case 'POLICE': return '🚓';
    default: return '🚑';
  }
}

function getStartPosition(direction) {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  switch(direction.toUpperCase()) {
    case 'NORTH':
      return { x: canvasWidth / 2 - 20, y: -50 };
    case 'SOUTH':
      return { x: canvasWidth / 2 - 20, y: canvasHeight + 50 };
    case 'EAST':
      return { x: canvasWidth + 50, y: canvasHeight / 2 - 20 };
    case 'WEST':
      return { x: -50, y: canvasHeight / 2 - 20 };
    default:
      return { x: -50, y: canvasHeight / 2 - 20 };
  }
}

// ========================================
// DRAWING FUNCTIONS
// ========================================
function drawRoad() {
  // Main road surface
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 170, canvas.width, 60);
  
  // Vertical road
  ctx.fillRect(canvas.width / 2 - 30, 0, 60, canvas.height);
  
  // Lane markings
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 15]);
  
  // Horizontal lane
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(canvas.width, 200);
  ctx.stroke();
  
  // Vertical lane
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

function drawTrafficLight() {
  const lightX = canvas.width / 2 + 50;
  const lightY = 50;
  
  // Light background
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(lightX, lightY, 40, 100);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(lightX, lightY, 40, 100);
  
  // Light states
  ctx.fillStyle = light === 'RED' ? '#ef4444' : '#2d3748';
  ctx.beginPath();
  ctx.arc(lightX + 20, lightY + 20, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = light === 'YELLOW' ? '#fbbf24' : '#2d3748';
  ctx.beginPath();
  ctx.arc(lightX + 20, lightY + 50, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = light === 'GREEN' ? '#4ade80' : '#2d3748';
  ctx.beginPath();
  ctx.arc(lightX + 20, lightY + 80, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Emergency indicator
  if (light === 'EMERGENCY') {
    ctx.fillStyle = 'orange';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🚨', lightX + 5, lightY + 120);
  }
}

function drawCars() {
  cars.forEach((car, index) => {
    if (!car) return;
    
    // Update position
    moveCar(car);
    
    // Draw based on type
    if (car.emergency) {
      drawEmergencyCar(car);
    } else {
      drawNormalCar(car);
    }
    
    // Remove cars that are off screen
    if (isOffScreen(car)) {
      console.log(`🗑️ Removing car ${car.id} (off screen)`);
      cars.splice(index, 1);
    }
  });
}

function drawEmergencyCar(car) {
  ctx.save();
  
  // Flash effect
  car.flashTimer = (car.flashTimer || 0) + 1;
  if (car.flashTimer % 10 < 5) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(car.x - 10, car.y - 10, 80, 80);
  }
  
  // Draw emoji (larger size)
  ctx.font = 'bold 50px Arial';
  ctx.fillText(car.emoji, car.x, car.y + 40);
  
  // Draw label
  ctx.fillStyle = 'red';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('EMERGENCY', car.x, car.y - 15);
  
  ctx.restore();
}

function drawNormalCar(car) {
  ctx.fillStyle = car.color;
  ctx.fillRect(car.x, car.y, 40, 30);
  
  // Car outline
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(car.x, car.y, 40, 30);
}

// ========================================
// 🔥 FIXED: Corrected movement logic for all directions
// ========================================
function moveCar(car) {
  // Emergency vehicles ALWAYS move regardless of light
  if (car.emergency) {
    switch(car.direction) {
      case 'north':
        // North: Moving DOWN (increasing Y)
        car.y += car.speed;
        break;
      case 'south':
        // South: Moving UP (decreasing Y) - THIS WAS THE BUG!
        car.y -= car.speed;
        break;
      case 'east':
        // East: Moving LEFT (decreasing X) - THIS WAS THE BUG!
        car.x -= car.speed;
        break;
      case 'west':
        // West: Moving RIGHT (increasing X)
        car.x += car.speed;
        break;
    }
    return;
  }
  
  // Normal cars obey traffic lights
  if (light === 'GREEN') {
    switch(car.direction) {
      case 'north':
        car.y += car.speed;
        break;
      case 'south':
        car.y -= car.speed;
        break;
      case 'east':
        car.x -= car.speed;
        break;
      case 'west':
        car.x += car.speed;
        break;
    }
  }
}

function isOffScreen(car) {
  return car.x < -100 || car.x > canvas.width + 100 ||
         car.y < -100 || car.y > canvas.height + 100;
}

// ========================================
// MAIN LOOP
// ========================================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawRoad();
  drawTrafficLight();
  drawCars();
  
  // Display emergency status
  if (emergencyMode) {
    ctx.fillStyle = 'red';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🚨 EMERGENCY MODE', 20, 30);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Vehicle: ${emergencyVehicle}`, 20, 55);
    ctx.fillText(`Direction: ${emergencyDirection}`, 20, 75);
  }
  
  // Display car count
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.fillText(`Cars: ${cars.length}`, canvas.width - 80, 20);
  ctx.fillText(`Emergency: ${emergencyMode ? 'YES' : 'NO'}`, canvas.width - 120, 40);
  
  requestAnimationFrame(draw);
}

// ========================================
// INITIALIZATION
// ========================================
function init() {
  console.log('🚦 Initializing traffic simulation...');
  console.log('   Canvas:', canvas.width, 'x', canvas.height);
  
  // Connect to WebSocket
  connectWebSocket();
  
  // Start animation loop
  draw();
  
  // Spawn normal cars periodically (only when not in emergency mode)
  setInterval(() => {
    if (!emergencyMode && Math.random() > 0.5) {
      spawnNormalCar();
    }
  }, 3000);
  
  console.log('✅ Simulation initialized');
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ========================================
// DEBUG HELPERS (remove in production)
// ========================================
window.debugEmergency = () => {
  console.log('=== EMERGENCY DEBUG ===');
  console.log('Mode:', emergencyMode);
  console.log('Direction:', emergencyDirection);
  console.log('Vehicle:', emergencyVehicle);
  console.log('Light:', light);
  console.log('Cars:', cars);
  console.log('WebSocket state:', ws?.readyState);
};

window.testEmergencySpawn = (direction = 'NORTH', vehicle = 'AMBULANCE') => {
  console.log('🧪 Testing emergency spawn...');
  emergencyMode = true;
  spawnEmergencyVehicle(vehicle, direction);
};

// Test all directions
window.testAllDirections = () => {
  console.log('🧪 Testing all emergency directions...');
  emergencyMode = true;
  
  setTimeout(() => spawnEmergencyVehicle('AMBULANCE', 'NORTH'), 0);
  setTimeout(() => spawnEmergencyVehicle('FIRE', 'SOUTH'), 1000);
  setTimeout(() => spawnEmergencyVehicle('POLICE', 'EAST'), 2000);
  setTimeout(() => spawnEmergencyVehicle('AMBULANCE', 'WEST'), 3000);
};