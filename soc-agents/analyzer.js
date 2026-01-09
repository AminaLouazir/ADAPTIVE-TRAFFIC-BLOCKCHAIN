/**
 * SOC ANALYZER AGENT
 * AI-powered threat analysis using LM Studio
 * 
 * Role: Analyze anomalies using local LLM and recommend actions
 * Port: 6003
 * Input: Anomalies from Collector (port 6002)
 * Output: Analysis + recommendations to Responder (port 6004)
 * AI: LM Studio API (http://127.0.0.1:1234/v1/chat/completions)
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain + SOC Agentique
 */

'use strict';

const express = require('express');
const axios = require('axios');

class Analyzer {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.lmStudioUrl = 'http://127.0.0.1:1234/v1/chat/completions';
        this.analyses = [];
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            const lmStatus = await this.checkLMStudio();
            res.json({
                status: 'healthy',
                agent: 'ANALYZER',
                port: 6003,
                analysesPerformed: this.analyses.length,
                lmStudio: lmStatus ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString()
            });
        });

        // Analyze event
        this.app.post('/analyze', async (req, res) => {
            const event = req.body;
            console.log(`[ANALYZER] 🔍 Analyzing: ${event.type} | Severity: ${event.severity}`);
            
            try {
                const analysis = await this.analyzeWithLLM(event);
                console.log(`[ANALYZER] ✅ Analysis complete: ${analysis.recommended_action}`);
                
                // Store analysis
                this.analyses.push({
                    event,
                    analysis,
                    timestamp: new Date().toISOString()
                });
                
                // Forward to Responder
                await this.forwardToResponder(event, analysis);
                
                res.json({
                    status: 'analyzed',
                    analysis
                });
            } catch (error) {
                console.error(`[ANALYZER] ❌ Analysis failed: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });

        // Get recent analyses
        this.app.get('/analyses', (req, res) => {
            res.json({
                total: this.analyses.length,
                recent: this.analyses.slice(-20)
            });
        });
    }

    /**
     * Check if LM Studio is available
     */
    async checkLMStudio() {
        try {
            await axios.get('http://127.0.0.1:1234/v1/models', { timeout: 2000 });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Analyze event using LM Studio (local LLM)
     */
    async analyzeWithLLM(event) {
        const prompt = this.buildPrompt(event);
        
        try {
            console.log(`[ANALYZER] 🤖 Querying LM Studio...`);
            
            const response = await axios.post(this.lmStudioUrl, {
                model: 'local-model',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a blockchain security analyst for a smart city traffic management system. Analyze security events and respond ONLY with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 300,
                stream: false
            }, {
                timeout: 25000
            });

            const content = response.data.choices[0].message.content;
            console.log(`[ANALYZER] 📄 LLM Response:\n${content}`);
            
            // Try to parse JSON from response
            const analysis = this.parseAnalysis(content);
            return analysis;
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error(`[ANALYZER] ⚠️  LM Studio not available, using rule-based fallback`);
                return this.ruleBasedAnalysis(event);
            }
            throw error;
        }
    }

    /**
     * Build analysis prompt for LLM
     */
    buildPrompt(event) {
        return `Analyze this blockchain security event and provide a threat assessment.

EVENT DETAILS:
- Type: ${event.type}
- Severity: ${event.severity}
- Source: ${event.src}
- Details: ${event.details}
- Timestamp: ${event.timestamp}
- Reason: ${event.reason || 'Not specified'}

CONTEXT:
This is a Hyperledger Fabric blockchain managing traffic lights.
- Org1MSP = Traffic Management Authority
- Org2MSP = Emergency Services

RESPONSE FORMAT (JSON only):
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "string (e.g., state_violation, data_integrity, authorization, dos_attack)",
  "recommended_action": "monitor|alert|block|investigate|quarantine",
  "explanation": "Brief technical explanation",
  "confidence": 0.0-1.0,
  "threat_level": "Low|Medium|High|Critical",
  "requires_human_review": true/false
}

Respond with ONLY the JSON object, no other text.`;
    }

    /**
     * Parse LLM response and extract JSON
     */
    parseAnalysis(content) {
        try {
            // Try direct JSON parse
            const analysis = JSON.parse(content);
            return analysis;
        } catch (error) {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            
            // Try to extract any JSON object
            const objectMatch = content.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }
            
            throw new Error('Could not parse JSON from LLM response');
        }
    }

    /**
     * Fallback rule-based analysis when LM Studio is unavailable
     */
    ruleBasedAnalysis(event) {
        const rules = {
            'invalid_state_transition': {
                category: 'state_violation',
                recommended_action: 'alert',
                threat_level: 'High'
            },
            'density_manipulation': {
                category: 'data_integrity',
                recommended_action: 'investigate',
                threat_level: 'Critical'
            },
            'emergency_abuse': {
                category: 'dos_attack',
                recommended_action: 'block',
                threat_level: 'High'
            },
            'unauthorized_creation': {
                category: 'authorization',
                recommended_action: 'block',
                threat_level: 'Critical'
            },
            'rapid_state_changes': {
                category: 'dos_attack',
                recommended_action: 'quarantine',
                threat_level: 'High'
            }
        };

        const rule = rules[event.type] || {
            category: 'unknown',
            recommended_action: 'monitor',
            threat_level: 'Medium'
        };

        return {
            severity: event.severity,
            category: rule.category,
            recommended_action: rule.recommended_action,
            explanation: `Rule-based analysis: ${event.details}`,
            confidence: 0.7,
            threat_level: rule.threat_level,
            requires_human_review: event.severity === 'CRITICAL',
            fallback: true
        };
    }

    /**
     * Forward analysis to Responder
     */
    async forwardToResponder(event, analysis) {
        try {
            await axios.post('http://localhost:6004/respond', {
                event,
                analysis
            }, {
                headers: { 
                    'X-SOC-Token': 'blockchain-soc-2024',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            console.log(`[ANALYZER] ✅ Forwarded to Responder: ${analysis.recommended_action}`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error(`[ANALYZER] ⚠️  Responder not available (port 6004)`);
            } else {
                console.error(`[ANALYZER] ❌ Error forwarding to Responder: ${error.message}`);
            }
        }
    }

    start(port = 6003) {
        this.app.listen(port, async () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║         SOC ANALYZER AGENT - STARTED           ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log(`📡 Listening on port ${port}`);
            console.log(`🤖 LM Studio API: ${this.lmStudioUrl}`);
            console.log(`📥 Receiving from Collector (port 6002)`);
            console.log(`📤 Forwarding to Responder (port 6004)`);
            
            // Check LM Studio connection
            const lmConnected = await this.checkLMStudio();
            if (lmConnected) {
                console.log(`✅ LM Studio connected`);
            } else {
                console.log(`⚠️  LM Studio not available - using rule-based fallback`);
            }
            console.log('');
        });
    }
}

// Start the analyzer
const analyzer = new Analyzer();
analyzer.start(6003);

module.exports = Analyzer;
