/**
 * SOC SENSOR AGENT
 * Detects anomalies in blockchain traffic management transactions
 * 
 * Role: Monitor blockchain events and detect suspicious patterns
 * Port: 6001
 * Output: Forwards anomalies to Collector
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain + SOC Agentique
 */

'use strict';

const express = require('express');
const axios = require('axios');

class BlockchainSensor {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.events = [];
        this.emergencyCount = {}; // Track emergency triggers per intersection
        this.stateTransitions = {}; // Track recent state transitions
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                agent: 'SENSOR',
                port: 6001,
                eventsReceived: this.events.length,
                timestamp: new Date().toISOString()
            });
        });

        // Receive events from simulator/blockchain
        this.app.post('/event', (req, res) => {
            const event = req.body;
            console.log(`[SENSOR] 📥 Received event: ${event.type} from ${event.src || event.lightId}`);
            
            this.events.push(event);
            this.analyzeEvent(event);
            
            res.json({ status: 'received', timestamp: Date.now() });
        });

        // Query all events
        this.app.get('/events', (req, res) => {
            res.json({
                total: this.events.length,
                events: this.events
            });
        });
    }

    /**
     * Analyze incoming event for anomalies
     */
    analyzeEvent(event) {
        let suspicious = null;

        switch (event.type) {
            case 'stateChange':
                suspicious = this.detectInvalidStateTransition(event);
                break;
            
            case 'densityUpdate':
                suspicious = this.detectDensityManipulation(event);
                break;
            
            case 'emergency':
                suspicious = this.detectEmergencyAbuse(event);
                break;
            
            case 'intersectionCreate':
                suspicious = this.detectUnauthorizedCreation(event);
                break;
            
            case 'rapidChanges':
                suspicious = this.detectRapidChanges(event);
                break;
        }

        if (suspicious) {
            console.log(`[SENSOR] 🚨 ANOMALY DETECTED: ${suspicious.type}`);
            this.forwardToCollector(suspicious);
        } else {
            console.log(`[SENSOR] ✅ Event OK: ${event.type}`);
        }
    }

    /**
     * RULE 1: Detect invalid state transitions
     * Valid: GREEN→YELLOW→RED→GREEN (cycle)
     * Emergency can bypass
     */
    detectInvalidStateTransition(event) {
        const validTransitions = {
            'GREEN': ['YELLOW', 'EMERGENCY'],
            'YELLOW': ['RED', 'EMERGENCY'],
            'RED': ['GREEN', 'EMERGENCY'],
            'EMERGENCY': ['GREEN', 'YELLOW', 'RED']
        };

        const { oldState, newState, lightId } = event;

        // Check if transition is valid
        if (newState !== 'EMERGENCY' && 
            validTransitions[oldState] && 
            !validTransitions[oldState].includes(newState)) {
            
            return {
                type: 'invalid_state_transition',
                severity: 'HIGH',
                src: lightId,
                details: `Invalid transition: ${oldState} → ${newState}`,
                oldState,
                newState,
                timestamp: event.timestamp || Date.now(),
                reason: `Traffic light violated state machine rules`
            };
        }

        return null;
    }

    /**
     * RULE 2: Detect density manipulation
     * Valid range: 0.0 - 1.0
     */
    detectDensityManipulation(event) {
        const { density, vehicleCount, lightId } = event;

        // Invalid density value
        if (density < 0 || density > 1.0) {
            return {
                type: 'density_manipulation',
                severity: 'CRITICAL',
                src: lightId,
                details: `Density out of range: ${density} (must be 0.0-1.0)`,
                density,
                vehicleCount,
                timestamp: event.timestamp || Date.now(),
                reason: 'Data integrity violation'
            };
        }

        // Impossible vehicle count vs density mismatch
        const expectedDensity = Math.min(vehicleCount / 20.0, 1.0);
        const densityDiff = Math.abs(density - expectedDensity);
        
        if (densityDiff > 0.5 && vehicleCount > 0) {
            return {
                type: 'density_vehicle_mismatch',
                severity: 'MEDIUM',
                src: lightId,
                details: `Density ${density} doesn't match vehicle count ${vehicleCount}`,
                density,
                vehicleCount,
                expectedDensity,
                timestamp: event.timestamp || Date.now(),
                reason: 'Inconsistent traffic data'
            };
        }

        return null;
    }

    /**
     * RULE 3: Detect emergency mode abuse
     * Max 3 emergency triggers per intersection without clearing
     */
    detectEmergencyAbuse(event) {
        const { intersectionId } = event;

        if (!this.emergencyCount[intersectionId]) {
            this.emergencyCount[intersectionId] = 0;
        }

        this.emergencyCount[intersectionId]++;

        // Check if too many emergencies
        if (this.emergencyCount[intersectionId] > 3) {
            return {
                type: 'emergency_abuse',
                severity: 'HIGH',
                src: intersectionId,
                details: `Emergency triggered ${this.emergencyCount[intersectionId]} times without clearing`,
                count: this.emergencyCount[intersectionId],
                timestamp: event.timestamp || Date.now(),
                reason: 'Possible DoS attack or system malfunction'
            };
        }

        return null;
    }

    /**
     * RULE 4: Detect unauthorized intersection creation
     */
    detectUnauthorizedCreation(event) {
        const { userId, orgMSP } = event;

        // Only Org1 can create intersections
        if (orgMSP !== 'Org1MSP') {
            return {
                type: 'unauthorized_creation',
                severity: 'CRITICAL',
                src: userId || 'unknown',
                details: `Org ${orgMSP} attempted to create intersection (only Org1MSP allowed)`,
                orgMSP,
                timestamp: event.timestamp || Date.now(),
                reason: 'Authorization policy violation'
            };
        }

        return null;
    }

    /**
     * RULE 5: Detect rapid state changes (potential attack)
     */
    detectRapidChanges(event) {
        const { lightId, changeCount, timeWindow } = event;

        // More than 10 changes per minute is suspicious
        if (changeCount > 10 && timeWindow <= 60000) {
            return {
                type: 'rapid_state_changes',
                severity: 'HIGH',
                src: lightId,
                details: `${changeCount} state changes in ${Math.round(timeWindow/1000)}s`,
                changeCount,
                timeWindow,
                timestamp: event.timestamp || Date.now(),
                reason: 'Possible flooding attack or malfunction'
            };
        }

        return null;
    }

    /**
     * Forward suspicious event to Collector
     */
    async forwardToCollector(anomaly) {
        try {
            const response = await axios.post('http://localhost:6002/collect', anomaly, {
                headers: { 
                    'X-SOC-Token': 'blockchain-soc-2024',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            console.log(`[SENSOR] ✅ Forwarded to Collector: ${anomaly.type}`);
        } catch (error) {
            console.error(`[SENSOR] ❌ Failed to forward to Collector: ${error.message}`);
        }
    }

    start(port = 6001) {
        this.app.listen(port, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║         SOC SENSOR AGENT - STARTED             ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log(`📡 Listening on port ${port}`);
            console.log(`🔍 Monitoring blockchain transactions for anomalies`);
            console.log(`📤 Forwarding alerts to Collector (port 6002)`);
            console.log('');
        });
    }
}

// Start the sensor
const sensor = new BlockchainSensor();
sensor.start(6001);

module.exports = BlockchainSensor;
