'use strict';

/**
 * Traffic Management Backend Server
 * INTÉGRÉ AVEC HYPERLEDGER FABRIC
 * 
 * Chaque changement de feu = Transaction sur la blockchain
 */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const FabricClient = require('./fabric-client');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Client Fabric
const fabricClient = new FabricClient();
let fabricConnected = false;

let isUpdating = false;

function getNextValidState(oldState, desiredState) {
  const transitions = {
    GREEN: ['YELLOW'],
    YELLOW: ['RED'],
    RED: ['GREEN']
  };

  // If the desired state is allowed, return it
  if (transitions[oldState].includes(desiredState)) {
    return desiredState;
  }

  // Otherwise, just stay in current state
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
const fabricLightId = mapSimulatorToFabricLightId(trafficState);

// Historique des changements (pour debugging)
let stateHistory = [];

// Create HTTP server
const server = app.listen(PORT, async () => {
  console.log('🚦 Traffic Backend Server Started');
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  
  // Connexion à Fabric au démarrage
  fabricConnected = await fabricClient.connect();
  
  if (fabricConnected) {
    console.log('✅ CONNECTÉ À LA BLOCKCHAIN HYPERLEDGER FABRIC');
    console.log('📝 Toutes les transactions seront enregistrées sur le ledger');
    
    // Initialiser le ledger si nécessaire
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

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('✅ New WebSocket client connected');
  
  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'state',
    data: trafficState,
    blockchainConnected: fabricConnected
  }));

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * Fonction principale: Mettre à jour l'état ET écrire sur blockchain
 */
async function updateTrafficStateOnBlockchain(newState, newDensity, newVehicleCount, newWaitTime) {
  if (isUpdating) return;
  isUpdating = true;
  try {
    newState = getNextValidState(trafficState.status, newState);
    const oldState = trafficState.status;
  
    // Mettre à jour l'état local
    trafficState.status = newState;
    trafficState.density = newDensity;
    trafficState.vehicleCount = newVehicleCount;
    trafficState.waitTime = newWaitTime;
    trafficState.timestamp = new Date().toISOString();
  
    // Sauvegarder dans l'historique
    stateHistory.push({
      ...trafficState,
      timestamp: trafficState.timestamp
    });
  
    // Si connecté à Fabric, écrire la TRANSACTION sur la blockchain
    if (fabricConnected) {
      try {
        // 🔥 TRANSACTION BLOCKCHAIN 🔥
        //console.log('🚦 trafficState object:', trafficState);
        const fabricLightId = mapSimulatorToFabricLightId(trafficState);
        // 1. Mettre à jour la densité
        await fabricClient.updateTrafficDensity(
          fabricLightId,
          trafficState.status,  // e.g., "YELLOW"
          'Traffic density update',
          newVehicleCount,
          newDensity,
          newWaitTime
        );
      
        // 2. Si l'état change, mettre à jour le signal
        if (newState !== oldState) {
          const reason = `Automatic adjustment based on density ${Math.round(newDensity * 100)}%`;
          const result = await fabricClient.updateSignalState(
            fabricLightId,
            newState,
            reason
          );
          console.log(`📝 ✅ TRANSACTION BLOCKCHAIN: ${oldState} → ${newState} (Densité: ${Math.round(newDensity * 100)}%)`);
        }
      
      } catch (error) {
        console.error('❌ Erreur lors de l\'écriture sur blockchain:', error.message);
      // Continue en mode simulation si erreur
      }
    } else {
      console.log(`📊 SIMULATION: ${oldState} → ${newState} (Densité: ${Math.round(newDensity * 100)}%)`);
    }
  
  // Diffuser aux clients WebSocket
    broadcast({
      type: 'update',
      data: trafficState,
      blockchainConfirmed: fabricConnected
    });

  } catch (err) {
    console.error('❌ Erreur updateTrafficDensity:', err.message);
  } finally {
    isUpdating = false; // Always release lock
  }
}

/**
 * Simulation de trafic avec transactions blockchain
 */
let simulationInterval = setInterval(async () => {
  // Simulation réaliste basée sur l'heure
  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  // Calculer la nouvelle densité (0.0 - 1.0)
  const newDensity = isRushHour 
    ? (Math.random() * 0.4 + 0.6)  // 0.6-1.0 heures de pointe
    : (Math.random() * 0.6 + 0.1); // 0.1-0.7 normal
  
  const newVehicleCount = Math.floor(newDensity * 20); // 0-20 véhicules
  const newWaitTime = Math.floor(newDensity * 80); // 0-80 secondes
  
  // Déterminer le nouvel état du feu
  let newState;
  if (trafficState.emergencyMode) {
    newState = 'RED'; // Urgence = tous au rouge
  } else if (newDensity > 0.7) {
    newState = 'RED';
  } else if (newDensity > 0.4) {
    newState = 'YELLOW';
  } else {
    newState = 'GREEN';
  }
  
  // ⚡ Écrire sur blockchain SEULEMENT si l'état change
  if (newState !== trafficState.status) {
    await updateTrafficStateOnBlockchain(newState, newDensity, newVehicleCount, newWaitTime);
  } else {
    // Mise à jour silencieuse (pas de transaction si feu ne change pas)
    trafficState.density = newDensity;
    trafficState.vehicleCount = newVehicleCount;
    trafficState.waitTime = newWaitTime;
    
    broadcast({
      type: 'update',
      data: trafficState,
      blockchainConfirmed: false // Pas de transaction
    });
  }
  
}, 3000); // Vérification toutes les 3 secondes

// REST API Endpoints

/**
 * Obtenir l'état actuel (depuis blockchain si connecté)
 */
app.get('/api/traffic/current', async (req, res) => {
  try {
    if (fabricConnected) {
      // Lire depuis la blockchain
      const blockchainData = await fabricClient.getTrafficLight('TL001');
      res.json({
        success: true,
        data: blockchainData,
        source: 'blockchain'
      });
    } else {
      // Mode simulation
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

/**
 * Obtenir l'historique depuis la blockchain
 */
app.get('/api/traffic/history', async (req, res) => {
  try {
    if (fabricConnected) {
      // Lire l'historique depuis la blockchain
      const history = await fabricClient.getTrafficHistory('TL001');
      res.json({
        success: true,
        data: history,
        source: 'blockchain'
      });
    } else {
      // Historique local
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

/**
 * Override manuel (TRANSACTION)
 */
app.post('/api/traffic/override', async (req, res) => {
  const { status, density } = req.body;
  
  try {
    const newDensity = density !== undefined ? density : trafficState.density;
    const newStatus = status || trafficState.status;
    const newQueueLength = Math.floor(newDensity / 10);
    const newWaitTime = Math.floor(newDensity * 0.8);
    
    // ⚡ Transaction blockchain
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
 * Mode urgence (TRANSACTION)
 */
app.post('/api/traffic/emergency', async (req, res) => {
  try {
    trafficState.emergencyMode = true;
    
    if (fabricConnected) {
      // Transaction blockchain pour mode urgence
      await fabricClient.activateEmergency('TL001');
      console.log('🚨 MODE URGENCE ENREGISTRÉ SUR LA BLOCKCHAIN');
    }
    
    // Forcer tous les feux au rouge
    await updateTrafficStateOnBlockchain(
      'RED',
      95,
      10,
      80
    );
    
    broadcast({
      type: 'emergency',
      data: trafficState
    });
    
    res.json({
      success: true,
      message: 'Emergency mode activated' + (fabricConnected ? ' (blockchain)' : ' (simulation)'),
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
 * Désactiver mode urgence
 */
app.post('/api/traffic/emergency/clear', async (req, res) => {
  try {
    trafficState.emergencyMode = false;
    
    await updateTrafficStateOnBlockchain(
      'GREEN',
      30,
      3,
      20
    );
    
    res.json({
      success: true,
      message: 'Emergency mode cleared',
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
 * Health check + statut blockchain
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    websocketConnections: wss.clients.size,
    blockchainConnected: fabricConnected,
    fabricStatus: fabricClient.isConnected() ? 'connected' : 'disconnected',
    transactionCount: stateHistory.length
  });
});

/**
 * Statistiques blockchain
 */
app.get('/api/blockchain/stats', async (req, res) => {
  try {
    if (!fabricConnected) {
      return res.json({
        success: false,
        message: 'Not connected to blockchain'
      });
    }
    
    const allLights = await fabricClient.queryAllLights();
    const history = await fabricClient.getTrafficHistory('TL001');
    
    res.json({
      success: true,
      data: {
        totalLights: allLights.length,
        transactionCount: history.length,
        connected: true
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
  
  // Arrêter la simulation
  clearInterval(simulationInterval);
  
  // Déconnecter de Fabric
  if (fabricConnected) {
    await fabricClient.disconnect();
  }
  
  // Fermer le serveur
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
  
  process.exit(0);
});

module.exports = { app, server, wss, fabricClient };