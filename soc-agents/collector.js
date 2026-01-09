/**
 * SOC COLLECTOR AGENT
 * Centralizes security events from Sensor
 * Stores events and forwards to Analyzer
 * 
 * @author Mini SOC Project - Master IASD
 */

'use strict';

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const PORT = 6002;
const ANALYZER_URL = 'http://localhost:6003/analyze';
const SOC_TOKEN = 'blockchain-soc-2024';

class Collector {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.events = [];
        this.setupRoutes();
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const dir = 'soc-agents/logs';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                agent: 'COLLECTOR',
                status: 'running',
                port: PORT,
                eventsCollected: this.events.length
            });
        });

        // Collect events from Sensor
        this.app.post('/collect', (req, res) => {
            const token = req.headers['x-soc-token'];
            
            // Verify authorization
            if (token !== SOC_TOKEN) {
                console.log(`[COLLECTOR] 🔒 Unauthorized access attempt`);
                return res.status(403).json({ 
                    error: 'Unauthorized',
                    message: 'Invalid SOC token' 
                });
            }

            const event = req.body;
            console.log(`[COLLECTOR] 📥 Received: ${event.type} | Severity: ${event.severity} | Source: ${event.src}`);
            
            // Store event
            this.events.push({
                ...event,
                collectedAt: Date.now()
            });

            // Persist to disk
            this.saveEvent(event);

            // Forward to Analyzer for AI processing
            this.forwardToAnalyzer(event);

            res.json({ 
                status: 'collected',
                agent: 'collector',
                eventCount: this.events.length
            });
        });

        // Query collected events
        this.app.get('/events', (req, res) => {
            const limit = parseInt(req.query.limit) || 50;
            const severity = req.query.severity;

            let filtered = this.events;
            if (severity) {
                filtered = filtered.filter(e => e.severity === severity.toUpperCase());
            }

            res.json({
                total: this.events.length,
                filtered: filtered.length,
                events: filtered.slice(-limit)
            });
        });

        // Get statistics
        this.app.get('/stats', (req, res) => {
            const stats = {
                totalEvents: this.events.length,
                bySeverity: {
                    CRITICAL: this.events.filter(e => e.severity === 'CRITICAL').length,
                    HIGH: this.events.filter(e => e.severity === 'HIGH').length,
                    MEDIUM: this.events.filter(e => e.severity === 'MEDIUM').length,
                    LOW: this.events.filter(e => e.severity === 'LOW').length
                },
                byType: this.countByType(),
                last24Hours: this.events.filter(e => 
                    e.timestamp > Date.now() - 86400000
                ).length
            };

            res.json(stats);
        });
    }

    countByType() {
        const types = {};
        this.events.forEach(event => {
            types[event.type] = (types[event.type] || 0) + 1;
        });
        return types;
    }

    saveEvent(event) {
        const logFile = 'soc-agents/logs/collected-events.json';
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...event
        };

        try {
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error(`[COLLECTOR] ❌ Failed to save event: ${err.message}`);
        }
    }

    async forwardToAnalyzer(event) {
        try {
            const response = await axios.post(ANALYZER_URL, event, {
                headers: { 
                    'X-SOC-Token': SOC_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30s timeout for AI processing
            });

            console.log(`[COLLECTOR] ✅ Forwarded to Analyzer: ${event.type}`);
            console.log(`[COLLECTOR] 🤖 AI Action: ${response.data.recommended_action}`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error(`[COLLECTOR] ⚠️  Analyzer not available - event stored locally`);
            } else {
                console.error(`[COLLECTOR] ❌ Failed to forward to Analyzer: ${error.message}`);
            }
        }
    }

    start() {
        this.app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║         SOC COLLECTOR AGENT - STARTED                  ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`[COLLECTOR] 🟢 Listening on http://localhost:${PORT}`);
            console.log(`[COLLECTOR] 📊 Health check: GET /health`);
            console.log(`[COLLECTOR] 📥 Collection endpoint: POST /collect`);
            console.log(`[COLLECTOR] 📋 Query events: GET /events?limit=50&severity=HIGH`);
            console.log(`[COLLECTOR] 📈 Statistics: GET /stats`);
            console.log(`[COLLECTOR] 💾 Logs: soc-agents/logs/collected-events.json`);
            console.log('');
        });
    }
}

// Start the collector
const collector = new Collector();
collector.start();

module.exports = Collector;
