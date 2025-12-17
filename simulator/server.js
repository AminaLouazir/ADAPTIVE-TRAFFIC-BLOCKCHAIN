'use strict';

/**
 * Traffic Management Backend Server
 * INTÉGRÉ AVEC HYPERLEDGER FABRIC
 * FIXED: Emergency mode uses correct chaincode functions and Org2
 */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const FabricClient = require('./fabric-client');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Client Fabric for Org1 (Traffic Management)
const fabricClient = new FabricClient();
let fabricConnected = false;

// Client Fabric for Org2 (Emergency Services) - created on demand
let emergencyClient = null;
let emergencyConnected = false;

let isUpdating = false;

function getNextValidState(oldState, desiredState) {
  const transitions = {
    GREEN: ['YELLOW'],
    YELLOW: ['RED'],
    RED: ['GREEN']
  };

  if (transitions[oldState] && transitions[oldState].includes(desiredState)) {
    return desiredState;
  }

  return oldState;
}

// État local (synchronisé avec blockchain)
let trafficState = {
  id: 'TL001',
  intersectionId: 'Main_1st',
  direction: 'NORTH',
  lightId: 'LIGHT-001',
  vehicleCount: 8,
  waitTime: 45,
  density: 40,
  status: 'GREEN',
  timestamp: new Date().toISOString(),
  queueLength: 5,
  avgWaitTime: 30,
  emergencyMode: false
};

function mapSimulatorToFabricLightId(trafficState) {
    const intersectionMap = {
        'Main_1st': 'INT-001',
        'Zerktouni_Sebou': 'INT-002'
    };

    if (!intersectionMap[trafficState.intersectionId]) {
        throw new Error(`Unknown intersectionId ${trafficState.intersectionId}`);
    }

    if (!trafficState.direction) {
        throw new Error('trafficState.direction is missing');
    }

    return `${intersectionMap[trafficState.intersectionId]}-${trafficState.direction}`;
}

function mapSimulatorToIntersectionId(trafficState) {
    const intersectionMap = {
        'Main_1st': 'INT-001',
        'Zerktouni_Sebou': 'INT-002'
    };

    return intersectionMap[trafficState.intersectionId] || 'INT-001';
}

// Historique des changements
let stateHistory = [];

// Create HTTP server
const server = app.listen(PORT, async () => {
  console.log('🚦 Traffic Backend Server Started');
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  
  // Connexion à Fabric au démarrage (Org1 - Traffic Management)
  fabricConnected = await fabricClient.connect('Org1');
  
  if (fabricConnected) {
    console.log('✅ CONNECTÉ À LA BLOCKCHAIN (ORG1 - Traffic Management)');
    console.log('📝 Toutes les transactions seront enregistrées sur le ledger');
    
    try {
      await fabricClient.initLedger();
      console.log('ℹ️  Ledger initialisé (intersections INT-001 et INT-002 créées)');
    } catch (error) {
      console.log('ℹ️  Ledger déjà initialisé');
    }
  } else {
    console.log('⚠️  MODE SIMULATION UNIQUEMENT - Pas de connexion blockchain');
  }
  console.log('');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ New WebSocket client connected');
  
  ws.send(JSON.stringify({
    type: 'state',
    data: trafficState,
    blockchainConnected: fabricConnected
  }));

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * Connect to Org2 for emergency operations
 */
async function ensureEmergencyConnection() {
  if (!emergencyClient) {
    emergencyClient = new FabricClient();
  }
  
  if (!emergencyConnected) {
    emergencyConnected = await emergencyClient.connect('Org2');
    if (emergencyConnected) {
      console.log('🚨 Emergency Services (Org2) connecté');
    } else {
      throw new Error('Cannot connect as Org2 (Emergency Services)');
    }
  }
  
  return emergencyClient;
}

/**
 * Mettre à jour l'état ET écrire sur blockchain
 */
async function updateTrafficStateOnBlockchain(newState, newDensity, newVehicleCount, newWaitTime) {
  if (isUpdating) return;
  isUpdating = true;
  
  try {
    newState = getNextValidState(trafficState.status, newState);
    const oldState = trafficState.status;
  
    trafficState.status = newState;
    trafficState.density = newDensity;
    trafficState.vehicleCount = newVehicleCount;
    trafficState.waitTime = newWaitTime;
    trafficState.timestamp = new Date().toISOString();
  
    stateHistory.push({
      ...trafficState,
      timestamp: trafficState.timestamp
    });
  
    if (fabricConnected) {
      try {
        const fabricLightId = mapSimulatorToFabricLightId(trafficState);
        
        // 1. Update traffic density
        await fabricClient.updateTrafficDensity(
          fabricLightId,
          newVehicleCount,
          newDensity,
          newWaitTime
        );
      
        // 2. If state changed, update signal
        if (newState !== oldState) {
          const reason = `Automatic adjustment based on density ${Math.round(newDensity * 100)}%`;
          await fabricClient.updateSignalState(
            fabricLightId,
            newState,
            reason
          );
          console.log(`📝 ✅ TRANSACTION BLOCKCHAIN: ${oldState} → ${newState} (Densité: ${Math.round(newDensity * 100)}%)`);
        }
      
      } catch (error) {
        console.error('❌ Erreur blockchain:', error.message);
      }
    } else {
      console.log(`📊 SIMULATION: ${oldState} → ${newState} (Densité: ${Math.round(newDensity * 100)}%)`);
    }
  
    broadcast({
      type: 'update',
      data: trafficState,
      blockchainConfirmed: fabricConnected
    });

  } catch (err) {
    console.error('❌ Erreur updateTrafficState:', err.message);
  } finally {
    isUpdating = false;
  }
}

/**
 * Simulation de trafic
 * PAUSED during emergency mode to prevent MVCC conflicts
 */
let simulationInterval = setInterval(async () => {
  // 🚨 CRITICAL: Skip simulation during emergency to prevent MVCC conflicts
  if (trafficState.emergencyMode) {
    console.log('⏸️  Simulation paused (emergency mode active)');
    return;
  }
  
  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  const newDensity = isRushHour 
    ? (Math.random() * 0.4 + 0.6)
    : (Math.random() * 0.6 + 0.1);
  
  const newVehicleCount = Math.floor(newDensity * 20);
  const newWaitTime = Math.floor(newDensity * 80);
  
  let newState;
  if (newDensity > 0.7) {
    newState = 'RED';
  } else if (newDensity > 0.4) {
    newState = 'YELLOW';
  } else {
    newState = 'GREEN';
  }
  
  if (newState !== trafficState.status) {
    await updateTrafficStateOnBlockchain(newState, newDensity, newVehicleCount, newWaitTime);
  } else {
    trafficState.density = newDensity;
    trafficState.vehicleCount = newVehicleCount;
    trafficState.waitTime = newWaitTime;
    
    broadcast({
      type: 'update',
      data: trafficState,
      blockchainConfirmed: false
    });
  }
  
}, 3000);

// REST API Endpoints

app.get('/api/traffic/current', async (req, res) => {
  try {
    if (fabricConnected) {
      const fabricLightId = mapSimulatorToFabricLightId(trafficState);
      const blockchainData = await fabricClient.getTrafficLight(fabricLightId);
      res.json({
        success: true,
        data: blockchainData,
        source: 'blockchain'
      });
    } else {
      res.json({
        success: true,
        data: trafficState,
        source: 'simulation'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/traffic/history', async (req, res) => {
  try {
    if (fabricConnected) {
      const intersectionId = mapSimulatorToIntersectionId(trafficState);
      const history = await fabricClient.getDecisionHistory(intersectionId);
      res.json({
        success: true,
        data: history,
        source: 'blockchain'
      });
    } else {
      res.json({
        success: true,
        data: stateHistory,
        source: 'simulation'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/traffic/override', async (req, res) => {
  const { status, density } = req.body;
  
  try {
    const newDensity = density !== undefined ? density : trafficState.density;
    const newStatus = status || trafficState.status;
    const newQueueLength = Math.floor(newDensity / 10);
    const newWaitTime = Math.floor(newDensity * 0.8);
    
    await updateTrafficStateOnBlockchain(
      newStatus,
      newDensity,
      newQueueLength,
      newWaitTime
    );
    
    res.json({
      success: true,
      message: 'Traffic state updated' + (fabricConnected ? ' (blockchain)' : ' (simulation)'),
      data: trafficState
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🚨 EMERGENCY MODE - Uses Org2 and correct chaincode function
 */
app.post('/api/traffic/emergency', async (req, res) => {
  try {
    // 🔍 DEBUG: Log incoming request
    console.log('📥 Emergency request received:', req.body);
    
    const { direction, vehicleType } = req.body;
    
    // Validate direction
    const validDirections = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    const emergencyDirection = direction && validDirections.includes(direction) 
      ? direction 
      : 'NORTH'; // fallback
    const emergencyVehicle = vehicleType || 'AMBULANCE';
    
    console.log(`📍 Using direction: ${emergencyDirection}`);
    console.log(`🚑 Using vehicle: ${emergencyVehicle}`);
    
    // 🔒 STOP SIMULATION to prevent MVCC conflicts
    trafficState.emergencyMode = true;
    console.log('⏸️  Simulation paused for emergency');
    
    // Wait a bit for any pending transactions to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (fabricConnected) {
      // Connect as Org2 (Emergency Services)
      const emergClient = await ensureEmergencyConnection();
      
      const intersectionId = mapSimulatorToIntersectionId(trafficState);
      
      // Call chaincode triggerEmergency
      const result = await emergClient.triggerEmergency(
        intersectionId,
        emergencyDirection,
        emergencyVehicle
      );
      
      console.log('🚨 MODE URGENCE ENREGISTRÉ SUR LA BLOCKCHAIN');
      console.log(`   Intersection: ${intersectionId}`);
      console.log(`   Direction: ${emergencyDirection}`);
      console.log(`   Vehicle: ${emergencyVehicle}`);
      console.log(`   ✅ ${emergencyDirection} should now be GREEN/EMERGENCY`);
      console.log(`   ✅ All other directions should be RED`);
      
      // Update local state
      trafficState.status = 'EMERGENCY';
      trafficState.emergencyDirection = emergencyDirection;
      trafficState.emergencyVehicle = emergencyVehicle;
      trafficState.density = 95;
      trafficState.vehicleCount = 10;
      trafficState.waitTime = 80;
      
      broadcast({
        type: 'emergency',
        data: {
          ...trafficState,
          emergencyDirection,
          emergencyVehicle
        },
        blockchainData: result
      });

      
      res.json({
        success: true,
        message: 'Emergency mode activated (blockchain)',
        data: trafficState,
        blockchain: result
      });
    } else {
      // Simulation mode
      trafficState.status = 'RED';
      trafficState.density = 95;
      trafficState.vehicleCount = 10;
      trafficState.waitTime = 80;
      
      broadcast({
        type: 'emergency',
        data: trafficState
      });
      
      res.json({
        success: true,
        message: 'Emergency mode activated (simulation)',
        data: trafficState
      });
    }
  } catch (error) {
    console.error('❌ Emergency activation failed:', error.message);
    
    // Restore simulation on error
    trafficState.emergencyMode = false;

    delete trafficState.emergencyDirection;
    delete trafficState.emergencyVehicle;
    trafficState.status = 'GREEN';

    
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Emergency mode requires Org2 connection. Make sure Org2 identity exists.'
    });
  }
});

/**
 * 🟢 CLEAR EMERGENCY - Uses Org2
 */
// 🚨 FIXED EMERGENCY ENDPOINT - Replace your existing /api/traffic/emergency endpoint

app.post('/api/traffic/emergency', async (req, res) => {
  try {
    console.log('📥 Emergency request received:', req.body);
    
    const { direction, vehicleType } = req.body;
    
    // Validate direction
    const validDirections = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    const emergencyDirection = direction && validDirections.includes(direction) 
      ? direction 
      : 'NORTH';
    const emergencyVehicle = vehicleType || 'AMBULANCE';
    
    console.log(`📍 Using direction: ${emergencyDirection}`);
    console.log(`🚑 Using vehicle: ${emergencyVehicle}`);
    
    // 🔒 STOP SIMULATION to prevent MVCC conflicts
    trafficState.emergencyMode = true;
    console.log('⏸️  Simulation paused for emergency');
    
    // Wait for pending transactions
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (fabricConnected) {
      // Connect as Org2 (Emergency Services)
      const emergClient = await ensureEmergencyConnection();
      
      const intersectionId = mapSimulatorToIntersectionId(trafficState);
      
      // Call chaincode triggerEmergency
      const result = await emergClient.triggerEmergency(
        intersectionId,
        emergencyDirection,
        emergencyVehicle
      );
      
      console.log('🚨 MODE URGENCE ENREGISTRÉ SUR LA BLOCKCHAIN');
      
      // Update local state
      trafficState.status = 'EMERGENCY';
      trafficState.emergencyMode = true;
      trafficState.emergencyDirection = emergencyDirection;
      trafficState.emergencyVehicle = emergencyVehicle;
      trafficState.density = 95;
      trafficState.vehicleCount = 10;
      trafficState.waitTime = 80;
      
      // 🔥 CRITICAL FIX: Include ALL emergency data in broadcast
      broadcast({
        type: 'emergency',
        data: {
          ...trafficState,
          emergencyMode: true,
          emergencyDirection: emergencyDirection,
          emergencyVehicle: emergencyVehicle,
          status: 'EMERGENCY'
        },
        blockchainData: result
      });

      console.log('📡 Emergency broadcast sent to all WebSocket clients');
      
      res.json({
        success: true,
        message: 'Emergency mode activated (blockchain)',
        data: trafficState,
        blockchain: result
      });
    } else {
      // Simulation mode
      trafficState.status = 'EMERGENCY';
      trafficState.emergencyMode = true;
      trafficState.emergencyDirection = emergencyDirection;
      trafficState.emergencyVehicle = emergencyVehicle;
      trafficState.density = 95;
      trafficState.vehicleCount = 10;
      trafficState.waitTime = 80;
      
      // 🔥 CRITICAL: Same broadcast structure for simulation mode
      broadcast({
        type: 'emergency',
        data: {
          ...trafficState,
          emergencyMode: true,
          emergencyDirection: emergencyDirection,
          emergencyVehicle: emergencyVehicle,
          status: 'EMERGENCY'
        }
      });
      
      console.log('📡 Emergency broadcast sent (simulation mode)');
      
      res.json({
        success: true,
        message: 'Emergency mode activated (simulation)',
        data: trafficState
      });
    }
  } catch (error) {
    console.error('❌ Emergency activation failed:', error.message);
    
    // Restore simulation on error
    trafficState.emergencyMode = false;
    delete trafficState.emergencyDirection;
    delete trafficState.emergencyVehicle;
    trafficState.status = 'GREEN';
    
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Emergency mode requires Org2 connection'
    });
  }
});

// 🟢 FIXED CLEAR EMERGENCY ENDPOINT
app.post('/api/traffic/emergency/clear', async (req, res) => {
  try {
    console.log('🟢 Clearing emergency mode...');
    
    if (fabricConnected && emergencyConnected) {
      const emergClient = await ensureEmergencyConnection();
      const intersectionId = mapSimulatorToIntersectionId(trafficState);
      
      const result = await emergClient.clearEmergency(intersectionId);
      
      console.log('✅ MODE URGENCE DÉSACTIVÉ');
      
      // Clean up emergency state
      trafficState.status = 'GREEN';
      trafficState.emergencyMode = false;
      delete trafficState.emergencyDirection;
      delete trafficState.emergencyVehicle;
      trafficState.density = 30;
      trafficState.vehicleCount = 3;
      trafficState.waitTime = 20;
      
      // 🔥 CRITICAL: Broadcast with clear signal
      broadcast({
        type: 'emergency_cleared',
        data: {
          ...trafficState,
          emergencyMode: false,
          status: 'GREEN'
        },
        blockchainData: result
      });
      
      console.log('▶️  Simulation resumed');
      
      res.json({
        success: true,
        message: 'Emergency mode cleared (blockchain)',
        data: trafficState,
        blockchain: result
      });
    } else {
      // Simulation mode clear
      trafficState.status = 'GREEN';
      trafficState.emergencyMode = false;
      delete trafficState.emergencyDirection;
      delete trafficState.emergencyVehicle;
      trafficState.density = 30;
      trafficState.vehicleCount = 3;
      trafficState.waitTime = 20;
      
      broadcast({
        type: 'emergency_cleared',
        data: {
          ...trafficState,
          emergencyMode: false,
          status: 'GREEN'
        }
      });
      
      console.log('▶️  Simulation resumed');
      
      res.json({
        success: true,
        message: 'Emergency mode cleared (simulation)',
        data: trafficState
      });
    }
  } catch (error) {
    console.error('❌ Emergency clear failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    websocketConnections: wss.clients.size,
    blockchainConnected: fabricConnected,
    fabricOrg1: fabricClient.isConnected() ? 'connected' : 'disconnected',
    fabricOrg2: emergencyConnected ? 'connected' : 'disconnected',
    transactionCount: stateHistory.length,
    emergencyMode: trafficState.emergencyMode
  });
});

app.get('/api/blockchain/stats', async (req, res) => {
  try {
    if (!fabricConnected) {
      return res.json({
        success: false,
        message: 'Not connected to blockchain'
      });
    }
    
    const allLights = await fabricClient.getAllTrafficLights();
    const intersectionId = mapSimulatorToIntersectionId(trafficState);
    const history = await fabricClient.getDecisionHistory(intersectionId);
    
    res.json({
      success: true,
      data: {
        totalLights: allLights.length,
        decisionCount: history.length,
        connected: true,
        currentOrg: fabricClient.getCurrentOrg(),
        emergencyServicesAvailable: emergencyConnected
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  clearInterval(simulationInterval);
  
  if (fabricConnected) {
    await fabricClient.disconnect();
  }
  
  if (emergencyConnected) {
    await emergencyClient.disconnect();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 CTRL+C détecté, arrêt...');
  
  clearInterval(simulationInterval);
  
  if (fabricConnected) {
    await fabricClient.disconnect();
  }
  
  if (emergencyConnected) {
    await emergencyClient.disconnect();
  }
  
  process.exit(0);
});

module.exports = { app, server, wss, fabricClient, emergencyClient };