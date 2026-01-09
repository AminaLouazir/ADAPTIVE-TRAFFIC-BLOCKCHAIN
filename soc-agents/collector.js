/**
 * SOC COLLECTOR AGENT
 * Centralizes and stores security events from Sensor
 * 
 * Role: Receive anomalies, store them, forward to Analyzer
 * Port: 6002
 * Input: Anomalies from Sensor (port 6001)
 * Output: Forwards to Analyzer (port 6003)
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain + SOC Agentique
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class Collector {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.events = [];
        this.logFile = path.join(__dirname, 'logs', 'events.json');
        this.ensureLogDirectory();
        this.setupRoutes();
    }

    ensureLogDirectory() {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                agent: 'COLLECTOR',
                port: 6002,
                eventsCollected: this.events.length,
                timestamp: new Date().toISOString()
            });
        });

        // Receive events from Sensor
        this.app.post('/collect', (req, res) => {
            // Verify token
            const token = req.headers['x-soc-token'];
            if (token !== 'blockchain-soc-2024') {
                console.log('[COLLECTOR] ❌ Unauthorized access attempt');
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const event = req.body;
            console.log(`[COLLECTOR] 📥 Received: ${event.type} | Severity: ${event.severity}`);
            
            // Store event
            this.storeEvent(event);
            
            // Forward to Analyzer
            this.forwardToAnalyzer(event);
            
            res.json({ 
                status: 'collected',
                eventId: this.events.length,
                timestamp: Date.now()
            });
        });

        // Query stored events
        this.app.get('/events', (req, res) => {
            const severity = req.query.severity;
            const type = req.query.type;
            
            let filtered = this.events;
            
            if (severity) {
                filtered = filtered.filter(e => e.severity === severity.toUpperCase());
            }
            
            if (type) {
                filtered = filtered.filter(e => e.type === type);
            }
            
            res.json({
                total: this.events.length,
                filtered: filtered.length,
                events: filtered.slice(-50) // Last 50 events
            });
        });

        // Get statistics
        this.app.get('/stats', (req, res) => {
            const stats = this.calculateStats();
            res.json(stats);
        });
    }

    /**
     * Store event in memory and disk
     */
    storeEvent(event) {
        // Add metadata
        event.collectedAt = new Date().toISOString();
        event.eventId = this.events.length + 1;
        
        // Store in memory
        this.events.push(event);
        
        // Persist to disk
        try {
            fs.appendFileSync(this.logFile, JSON.stringify(event) + '\n');
            console.log(`[COLLECTOR] 💾 Event saved to disk (ID: ${event.eventId})`);
        } catch (error) {
            console.error(`[COLLECTOR] ❌ Failed to save event: ${error.message}`);
        }
    }

    /**
     * Forward event to Analyzer for AI analysis
     */
    async forwardToAnalyzer(event) {
        try {
            const response = await axios.post('http://localhost:6003/analyze', event, {
                headers: { 
                    'X-SOC-Token': 'blockchain-soc-2024',
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30s timeout for LLM
            });
            
            console.log(`[COLLECTOR] ✅ Forwarded to Analyzer: ${event.type}`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error(`[COLLECTOR] ⚠️  Analyzer not available (port 6003)`);
            } else {
                console.error(`[COLLECTOR] ❌ Error forwarding to Analyzer: ${error.message}`);
            }
        }
    }

    /**
     * Calculate statistics on collected events
     */
    calculateStats() {
        const stats = {
            total: this.events.length,
            bySeverity: {},
            byType: {},
            last10: this.events.slice(-10).map(e => ({
                type: e.type,
                severity: e.severity,
                src: e.src,
                timestamp: e.timestamp
            }))
        };

        // Count by severity
        this.events.forEach(event => {
            stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;
            stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
        });

        return stats;
    }

    start(port = 6002) {
        this.app.listen(port, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║        SOC COLLECTOR AGENT - STARTED           ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log(`📡 Listening on port ${port}`);
            console.log(`📥 Receiving anomalies from Sensor (port 6001)`);
            console.log(`📤 Forwarding to Analyzer (port 6003)`);
            console.log(`💾 Logging to: ${this.logFile}`);
            console.log('');
        });
    }
}

// Start the collector
const collector = new Collector();
collector.start(6002);

module.exports = Collector;
