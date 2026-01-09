/**
 * SOC RESPONDER AGENT
 * Executes automated responses based on Analyzer recommendations
 * Actions: block, alert, investigate, monitor
 * 
 * @author Mini SOC Project - Master IASD
 */

'use strict';

const express = require('express');
const fs = require('fs');
const axios = require('axios');

const PORT = 6004;
const SOC_TOKEN = 'blockchain-soc-2024';

class Responder {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.actionsExecuted = 0;
        this.blockedSources = new Set();
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                agent: 'RESPONDER',
                status: 'running',
                port: PORT,
                actionsExecuted: this.actionsExecuted,
                blockedSources: Array.from(this.blockedSources)
            });
        });

        // Execute response
        this.app.post('/respond', (req, res) => {
            const token = req.headers['x-soc-token'];
            
            if (token !== SOC_TOKEN) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const { event, analysis } = req.body;
            
            console.log(`[RESPONDER] 🎯 Executing action: ${analysis.recommended_action}`);
            console.log(`             Event: ${event.type} | Source: ${event.src}`);
            console.log(`             Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
            
            this.executeAction(event, analysis);
            this.actionsExecuted++;

            res.json({ 
                status: 'executed',
                action: analysis.recommended_action,
                agent: 'responder'
            });
        });

        // Get blocked sources
        this.app.get('/blocked', (req, res) => {
            res.json({
                count: this.blockedSources.size,
                sources: Array.from(this.blockedSources)
            });
        });

        // Manual unblock
        this.app.post('/unblock', (req, res) => {
            const { source } = req.body;
            if (this.blockedSources.has(source)) {
                this.blockedSources.delete(source);
                console.log(`[RESPONDER] 🔓 Unblocked: ${source}`);
                res.json({ status: 'unblocked', source });
            } else {
                res.status(404).json({ error: 'Source not blocked' });
            }
        });

        // Get response statistics
        this.app.get('/stats', (req, res) => {
            res.json({
                totalActions: this.actionsExecuted,
                blockedCount: this.blockedSources.size,
                alertsFile: 'soc-agents/logs/alerts.json',
                ticketsFile: 'soc-agents/logs/tickets.json'
            });
        });
    }

    executeAction(event, analysis) {
        const action = analysis.recommended_action;

        switch (action) {
            case 'block':
                this.blockSource(event, analysis);
                break;
            case 'alert':
                this.sendAlert(event, analysis);
                break;
            case 'investigate':
                this.createTicket(event, analysis);
                break;
            case 'escalate':
                this.escalate(event, analysis);
                break;
            case 'monitor':
                this.monitor(event, analysis);
                break;
            default:
                console.log(`[RESPONDER] ⚠️  Unknown action: ${action} - defaulting to monitor`);
                this.monitor(event, analysis);
        }
    }

    blockSource(event, analysis) {
        const source = event.src;
        this.blockedSources.add(source);

        console.log('');
        console.log('═'.repeat(60));
        console.log(`  🚫 BLOCKING ACTION EXECUTED`);
        console.log('═'.repeat(60));
        console.log(`  Source: ${source}`);
        console.log(`  Reason: ${event.type}`);
        console.log(`  Details: ${analysis.explanation}`);
        console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log('═'.repeat(60));
        console.log('');

        // Log to file
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'BLOCK',
            source: source,
            event: event,
            analysis: analysis
        };

        fs.appendFileSync('soc-agents/logs/blocked.json', JSON.stringify(logEntry) + '\n');

        // Simulate: Add iptables rule (in real system)
        // exec(`iptables -A INPUT -s ${source} -j DROP`);
        
        // Simulate: Update blockchain blacklist
        this.updateBlockchainBlacklist(source, event);
    }

    sendAlert(event, analysis) {
        console.log('');
        console.log('⚠️  '.repeat(30));
        console.log(`  🔔 SECURITY ALERT`);
        console.log('⚠️  '.repeat(30));
        console.log(`  Type: ${event.type}`);
        console.log(`  Severity: ${analysis.severity}`);
        console.log(`  Source: ${event.src}`);
        console.log(`  Reason: ${analysis.explanation}`);
        console.log(`  Time: ${new Date().toISOString()}`);
        console.log('⚠️  '.repeat(30));
        console.log('');

        const alert = {
            timestamp: new Date().toISOString(),
            action: 'ALERT',
            severity: analysis.severity,
            event: event,
            analysis: analysis
        };

        fs.appendFileSync('soc-agents/logs/alerts.json', JSON.stringify(alert) + '\n');

        // Simulate: Send email/SMS/Slack notification
        // this.sendNotification(alert);
    }

    createTicket(event, analysis) {
        const ticketId = `TICKET-${Date.now()}`;
        
        console.log('');
        console.log('🎫 '.repeat(30));
        console.log(`  📋 INVESTIGATION TICKET CREATED`);
        console.log('🎫 '.repeat(30));
        console.log(`  Ticket ID: ${ticketId}`);
        console.log(`  Type: ${event.type}`);
        console.log(`  Source: ${event.src}`);
        console.log(`  Priority: ${analysis.severity}`);
        console.log(`  Reason: ${analysis.explanation}`);
        console.log(`  Assigned to: SOC Analyst`);
        console.log('🎫 '.repeat(30));
        console.log('');

        const ticket = {
            id: ticketId,
            timestamp: new Date().toISOString(),
            action: 'INVESTIGATE',
            status: 'OPEN',
            priority: analysis.severity,
            event: event,
            analysis: analysis,
            assignedTo: 'SOC_ANALYST'
        };

        fs.appendFileSync('soc-agents/logs/tickets.json', JSON.stringify(ticket) + '\n');

        // Simulate: Create Jira/GitHub issue
        // this.createJiraTicket(ticket);
    }

    escalate(event, analysis) {
        console.log('');
        console.log('🚨 '.repeat(30));
        console.log(`  ⬆️  ESCALATION TO SECURITY TEAM`);
        console.log('🚨 '.repeat(30));
        console.log(`  Event: ${event.type}`);
        console.log(`  Severity: CRITICAL - ${analysis.severity}`);
        console.log(`  Source: ${event.src}`);
        console.log(`  Reason: ${analysis.explanation}`);
        console.log(`  Action Required: Immediate attention needed`);
        console.log('🚨 '.repeat(30));
        console.log('');

        // Both create ticket AND send alert
        this.createTicket(event, analysis);
        this.sendAlert(event, analysis);

        // Log escalation
        const escalation = {
            timestamp: new Date().toISOString(),
            action: 'ESCALATE',
            event: event,
            analysis: analysis,
            notifiedTeams: ['SOC_MANAGER', 'SECURITY_TEAM', 'BLOCKCHAIN_ADMIN']
        };

        fs.appendFileSync('soc-agents/logs/escalations.json', JSON.stringify(escalation) + '\n');
    }

    monitor(event, analysis) {
        console.log(`[RESPONDER] 👁️  MONITORING: ${event.type} from ${event.src}`);
        console.log(`             ${analysis.explanation}`);

        const monitorEntry = {
            timestamp: new Date().toISOString(),
            action: 'MONITOR',
            event: event,
            analysis: analysis
        };

        fs.appendFileSync('soc-agents/logs/monitoring.json', JSON.stringify(monitorEntry) + '\n');
    }

    updateBlockchainBlacklist(source, event) {
        // Simulate updating blockchain state
        console.log(`[RESPONDER] 📝 Updating blockchain blacklist...`);
        console.log(`             Added: ${source} (${event.type})`);
        
        // In real implementation, would call:
        // await fabricClient.submitTransaction('addToBlacklist', source, event.type);
    }

    start() {
        this.app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║         SOC RESPONDER AGENT - STARTED                  ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`[RESPONDER] 🟢 Listening on http://localhost:${PORT}`);
            console.log(`[RESPONDER] 📊 Health check: GET /health`);
            console.log(`[RESPONDER] 🎯 Response endpoint: POST /respond`);
            console.log(`[RESPONDER] 🚫 View blocked: GET /blocked`);
            console.log(`[RESPONDER] 📁 Logs directory: soc-agents/logs/`);
            console.log(`[RESPONDER] 🛡️  Ready to execute automated responses`);
            console.log('');
        });
    }
}

// Start the responder
const responder = new Responder();
responder.start();

module.exports = Responder;
