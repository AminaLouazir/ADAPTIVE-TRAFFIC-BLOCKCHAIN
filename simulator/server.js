'use strict';

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let trafficState = {
  intersectionId: 'Main_1st',
  density: 40,
  status: 'GREEN',
  timestamp: new Date().toISOString(),
  queueLength: 5,
  avgWaitTime: 30
};

const server = app.listen(PORT, () => {
  console.log('🚦 Traffic Backend Server Started');
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ New WebSocket client connected');
  ws.send(JSON.stringify({ type: 'state', data: trafficState }));
  ws.on('close', () => console.log('❌ WebSocket client disconnected'));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

setInterval(() => {
  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  trafficState.density = isRushHour 
    ? Math.floor(Math.random() * 40) + 60
    : Math.floor(Math.random() * 60) + 10;
  
  trafficState.queueLength = Math.floor(trafficState.density / 10);
  trafficState.avgWaitTime = Math.floor(trafficState.density * 0.8);
  
  if (trafficState.density > 70) {
    trafficState.status = 'RED';
  } else if (trafficState.density > 40) {
    trafficState.status = 'YELLOW';
  } else {
    trafficState.status = 'GREEN';
  }
  
  trafficState.timestamp = new Date().toISOString();
  broadcast({ type: 'update', data: trafficState });
  console.log(`📊 ${trafficState.status} | Density: ${trafficState.density}% | Queue: ${trafficState.queueLength}`);
}, 3000);

app.get('/api/traffic/current', (req, res) => {
  res.json({ success: true, data: trafficState });
});

app.post('/api/traffic/override', (req, res) => {
  const { status, density } = req.body;
  if (status) trafficState.status = status;
  if (density !== undefined) trafficState.density = density;
  broadcast({ type: 'override', data: trafficState });
  res.json({ success: true, message: 'Traffic state updated', data: trafficState });
});

app.post('/api/traffic/emergency', (req, res) => {
  trafficState.status = 'EMERGENCY';
  trafficState.priority = 10;
  broadcast({ type: 'emergency', data: trafficState });
  console.log('🚨 EMERGENCY MODE ACTIVATED');
  res.json({ success: true, message: 'Emergency mode activated', data: trafficState });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    websocketConnections: wss.clients.size
  });
});