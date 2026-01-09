/**
 * SOC RESPONDER AGENT
 * Executes automated responses to security threats
 * 
 * Role: Execute actions based on Analyzer recommendations
 * Port: 6004
 * Input: Analysis + recommendations from Analyzer (port 6003)
 * Actions: Block, Alert, Investigate, Monitor, Quarantine
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain + SOC Agentique
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

class Responder {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.responses = [];
        this.blockedSources = new Set();
        this.quarantinedSources = new Set();
        this.alertsFile = path.join(__dirname, 'logs', 'alerts.json');
        this.blockedFile = path.join(__dirname, 'logs', 'blocked.txt');
        this.ticketsFile = path.join(__dirname, 'logs', 'tickets.json');
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                agent: 'RESPONDER',
                port: 6004,
                responsesExecuted: this.responses.length,
                blockedSources: this.blockedSources.size,
                quarantinedSources: this.quarantinedSources.size,
                timestamp: new Date().toISOString()
            });
        });

        // Execute response
        this.app.post('/respond', (req, res) => {
            const { event, analysis } = req.body;
            
            console.log(`[RESPONDER] 🎯 Executing action: ${analysis.recommended_action}`);
            console.log(`[RESPONDER] 📊 Threat Level: ${analysis.threat_level || analysis.severity}`);
            
            this.executeAction(event, analysis);
            
            res.json({
                status: 'executed',
                action: analysis.recommended_action,
                timestamp: Date.now()
            });
        });

        // Get blocked sources
        this.app.get('/blocked', (req, res) => {
            res.json({
                count: this.blockedSources.size,
                sources: Array.from(this.blockedSources)
            });
        });

        // Get all responses
        this.app.get('/responses', (req, res) => {
            res.json({
                total: this.responses.length,
                recent: this.responses.slice(-20)
            });
        });

        // Unblock source
        this.app.post('/unblock', (req, res) => {
            const { source } = req.body;
            if (this.blockedSources.has(source)) {
                this.blockedSources.delete(source);
                console.log(`[RESPONDER] ✅ Unblocked: ${source}`);
                res.json({ status: 'unblocked', source });
            } else {
                res.status(404).json({ error: 'Source not blocked' });
            }
        });
    }

    /**
     * Execute security action based on analysis
     */
    executeAction(event, analysis) {
        const action = analysis.recommended_action.toLowerCase();
        
        const response = {
            timestamp: new Date().toISOString(),
            event,
            analysis,
            action,
            status: 'executed'
        };

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
            
            case 'quarantine':
                this.quarantineSource(event, analysis);
                break;
            
            case 'monitor':
            default:
                this.monitorSource(event, analysis);
                break;
        }

        this.responses.push(response);
    }

    /**
     * ACTION 1: Block malicious source
     */
    blockSource(event, analysis) {
        const source = event.src;
        this.blockedSources.add(source);
        
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║              🚫 BLOCKED SOURCE                 ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log(`Source: ${source}`);
        console.log(`Reason: ${event.type}`);
        console.log(`Threat: ${analysis.threat_level || analysis.severity}`);
        console.log(`Details: ${event.details}`);
        console.log('');
        
        // Persist to file
        const blockEntry = `${new Date().toISOString()} | ${source} | ${event.type} | ${analysis.explanation}\n`;
        fs.appendFileSync(this.blockedFile, blockEntry);
        
        // In production, this would:
        // - Add iptables rule
        // - Update firewall
        // - Revoke blockchain certificates
        // - Disable peer connection
    }

    /**
     * ACTION 2: Send alert to security team
     */
    sendAlert(event, analysis) {
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║              ⚠️  SECURITY ALERT                ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log(`Type: ${event.type}`);
        console.log(`Source: ${event.src}`);
        console.log(`Severity: ${analysis.severity}`);
        console.log(`Explanation: ${analysis.explanation}`);
        console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log('');
        
        const alert = {
            timestamp: new Date().toISOString(),
            type: event.type,
            source: event.src,
            severity: analysis.severity,
            details: event.details,
            analysis: analysis.explanation,
            confidence: analysis.confidence,
            requires_review: analysis.requires_human_review
        };
        
        // Persist alert
        fs.appendFileSync(this.alertsFile, JSON.stringify(alert) + '\n');
        
        // In production, this would:
        // - Send email to security team
        // - Post to Slack/Teams
        // - Trigger PagerDuty
        // - Update SIEM dashboard
    }

    /**
     * ACTION 3: Create investigation ticket
     */
    createTicket(event, analysis) {
        const ticket = {
            id: `TICKET-${Date.now()}`,
            timestamp: new Date().toISOString(),
            title: `${event.type}: ${event.src}`,
            description: event.details,
            severity: analysis.severity,
            category: analysis.category,
            analysis: analysis.explanation,
            status: 'open',
            assignee: 'unassigned',
            event
        };
        
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║           🎫 INVESTIGATION TICKET              ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log(`Ticket ID: ${ticket.id}`);
        console.log(`Title: ${ticket.title}`);
        console.log(`Severity: ${ticket.severity}`);
        console.log(`Category: ${ticket.category}`);
        console.log(`Status: ${ticket.status}`);
        console.log('');
        
        // Persist ticket
        fs.appendFileSync(this.ticketsFile, JSON.stringify(ticket) + '\n');
        
        // In production, this would:
        // - Create Jira ticket
        // - Create GitHub issue
        // - Add to incident tracking system
        // - Assign to security analyst
    }

    /**
     * ACTION 4: Quarantine suspicious source (temporary block)
     */
    quarantineSource(event, analysis) {
        const source = event.src;
        this.quarantinedSources.add(source);
        
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║            🔒 QUARANTINED SOURCE              ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log(`Source: ${source}`);
        console.log(`Reason: ${event.type}`);
        console.log(`Duration: 1 hour (auto-release)`);
        console.log(`Details: ${event.details}`);
        console.log('');
        
        // Auto-release after 1 hour
        setTimeout(() => {
            this.quarantinedSources.delete(source);
            console.log(`[RESPONDER] ✅ Auto-released from quarantine: ${source}`);
        }, 60 * 60 * 1000);
        
        // In production, this would:
        // - Rate limit the source
        // - Require additional authentication
        // - Enable enhanced logging
        // - Set up temporary firewall rule
    }

    /**
     * ACTION 5: Monitor (passive observation)
     */
    monitorSource(event, analysis) {
        console.log(`[RESPONDER] 👁️  MONITORING: ${event.src} | ${event.type}`);
        console.log(`[RESPONDER] 📝 Note: ${analysis.explanation}`);
        
        // Just log, no action taken
        // Useful for low-confidence detections
    }

    start(port = 6004) {
        this.app.listen(port, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║        SOC RESPONDER AGENT - STARTED           ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log(`📡 Listening on port ${port}`);
            console.log(`📥 Receiving actions from Analyzer (port 6003)`);
            console.log(`🎯 Available actions: Block, Alert, Investigate, Quarantine, Monitor`);
            console.log(`📁 Logs directory: ${path.join(__dirname, 'logs')}`);
            console.log('');
        });
    }
}

// Start the responder
const responder = new Responder();
responder.start(6004);

module.exports = Responder;
