/**
 * SOC SENSOR AGENT
 * Detects anomalies in blockchain traffic transactions
 * Monitors suspicious patterns and forwards to Collector
 * 
 * @author Mini SOC Project - Master IASD
 */

'use strict';

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const PORT = 6001;
const COLLECTOR_URL = 'http://localhost:6002/collect';
const SOC_TOKEN = 'blockchain-soc-2024';

class BlockchainSensor {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.recentEvents = []; // Store recent events for pattern analysis
        this.emergencyCount = {}; // Track emergency triggers per intersection
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                agent: 'SENSOR',
                status: 'running',
                port: PORT,
                eventsProcessed: this.recentEvents.length
            });
        });

        // Receive events from simulator
        this.app.post('/event', (req, res) => {
            const event = req.body;
            console.log(`[SENSOR] 📡 Received event: ${event.type} from ${event.src || event.lightId}`);
            
            this.analyzeEvent(event);
            res.json({ status: 'received', agent: 'sensor' });
        });

        // Manual anomaly injection (for testing)
        this.app.post('/inject-anomaly', (req, res) => {
            const anomaly = req.body;
            console.log(`[SENSOR] 💉 Manual anomaly injection: ${anomaly.type}`);
            this.forwardToCollector(anomaly);
            res.json({ status: 'injected' });
        });

        // Get statistics
        this.app.get('/stats', (req, res) => {
            res.json({
                totalEvents: this.recentEvents.length,
                emergencyTracking: this.emergencyCount,
                recentAnomalies: this.recentEvents.filter(e => e.isAnomaly).slice(-10)
            });
        });
    }

    analyzeEvent(event) {
        // Store event for pattern analysis
        this.recentEvents.push({
            ...event,
            timestamp: Date.now()
        });

        // Keep only last 100 events in memory
        if (this.recentEvents.length > 100) {
            this.recentEvents.shift();
        }

        // Detect anomalies
        const anomaly = this.detectAnomaly(event);
        
        if (anomaly) {
            console.log(`[SENSOR] 🚨 ANOMALY DETECTED: ${anomaly.type} - Severity: ${anomaly.severity}`);
            anomaly.isAnomaly = true;
            this.forwardToCollector(anomaly);
            this.logAnomaly(anomaly);
        }
    }

    detectAnomaly(event) {
        // RULE 1: Invalid State Transition
        if (event.type === 'stateChange') {
            const validTransitions = {
                'GREEN': ['YELLOW', 'EMERGENCY'],
                'YELLOW': ['RED', 'EMERGENCY'],
                'RED': ['GREEN', 'EMERGENCY'],
                'EMERGENCY': ['GREEN', 'YELLOW', 'RED']
            };

            const valid = validTransitions[event.oldState]?.includes(event.newState);
            
            if (!valid && event.newState !== 'EMERGENCY') {
                return {
                    type: 'invalid_state_transition',
                    severity: 'HIGH',
                    src: event.lightId || 'unknown',
                    details: `Invalid transition: ${event.oldState} → ${event.newState}`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }
        }

        // RULE 2: Density Manipulation
        if (event.type === 'densityUpdate') {
            if (event.density > 1.0 || event.density < 0) {
                return {
                    type: 'density_manipulation',
                    severity: 'CRITICAL',
                    src: event.lightId || 'unknown',
                    details: `Invalid density value: ${event.density} (must be 0.0-1.0)`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }

            // Detect impossible jumps (>50% density change in one update)
            const previousEvent = this.recentEvents
                .filter(e => e.type === 'densityUpdate' && e.lightId === event.lightId)
                .slice(-1)[0];

            if (previousEvent && Math.abs(event.density - previousEvent.density) > 0.5) {
                return {
                    type: 'density_spike',
                    severity: 'MEDIUM',
                    src: event.lightId,
                    details: `Density spike: ${previousEvent.density} → ${event.density}`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }
        }

        // RULE 3: Emergency Mode Abuse
        if (event.type === 'emergency') {
            const intersectionId = event.intersectionId;
            
            // Initialize counter
            if (!this.emergencyCount[intersectionId]) {
                this.emergencyCount[intersectionId] = { count: 0, lastTrigger: 0 };
            }

            const timeSinceLastEmergency = Date.now() - this.emergencyCount[intersectionId].lastTrigger;
            this.emergencyCount[intersectionId].count++;
            this.emergencyCount[intersectionId].lastTrigger = Date.now();

            // Alert if >3 emergencies in 5 minutes
            if (this.emergencyCount[intersectionId].count > 3 && timeSinceLastEmergency < 300000) {
                return {
                    type: 'emergency_abuse',
                    severity: 'HIGH',
                    src: intersectionId,
                    details: `Emergency triggered ${this.emergencyCount[intersectionId].count} times in 5 minutes`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }

            // Alert if emergency triggered too quickly (<30 seconds)
            if (timeSinceLastEmergency > 0 && timeSinceLastEmergency < 30000) {
                return {
                    type: 'rapid_emergency_trigger',
                    severity: 'MEDIUM',
                    src: intersectionId,
                    details: `Emergency triggered ${Math.floor(timeSinceLastEmergency/1000)}s after previous`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }
        }

        // RULE 4: Rapid State Changes (>10 per minute from same light)
        if (event.type === 'stateChange') {
            const oneMinuteAgo = Date.now() - 60000;
            const recentChanges = this.recentEvents.filter(e => 
                e.type === 'stateChange' && 
                e.lightId === event.lightId && 
                e.timestamp > oneMinuteAgo
            );

            if (recentChanges.length > 10) {
                return {
                    type: 'rapid_state_changes',
                    severity: 'HIGH',
                    src: event.lightId,
                    details: `${recentChanges.length} state changes in 1 minute`,
                    timestamp: Date.now(),
                    rawEvent: event
                };
            }
        }

        // RULE 5: Unauthorized Organization Activity
        if (event.type === 'emergency' && event.org !== 'Org2MSP') {
            return {
                type: 'unauthorized_emergency',
                severity: 'CRITICAL',
                src: event.intersectionId,
                details: `Emergency triggered by ${event.org || 'unknown'} (only Org2MSP allowed)`,
                timestamp: Date.now(),
                rawEvent: event
            };
        }

        return null; // No anomaly detected
    }

    async forwardToCollector(anomaly) {
        try {
            await axios.post(COLLECTOR_URL, anomaly, {
                headers: { 
                    'X-SOC-Token': SOC_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            console.log(`[SENSOR] ✅ Forwarded to Collector: ${anomaly.type}`);
        } catch (error) {
            console.error(`[SENSOR] ❌ Failed to forward: ${error.message}`);
        }
    }

    logAnomaly(anomaly) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...anomaly
        };
        
        const logFile = 'soc-agents/logs/sensor-anomalies.json';
        try {
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error(`[SENSOR] Failed to write log: ${err.message}`);
        }
    }

    start() {
        this.app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║         SOC SENSOR AGENT - STARTED                     ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`[SENSOR] 🟢 Listening on http://localhost:${PORT}`);
            console.log(`[SENSOR] 📊 Health check: GET /health`);
            console.log(`[SENSOR] 📡 Event endpoint: POST /event`);
            console.log(`[SENSOR] 🔍 Monitoring blockchain transactions for anomalies...`);
            console.log('');
        });
    }
}

// Start the sensor
const sensor = new BlockchainSensor();
sensor.start();

module.exports = BlockchainSensor;
