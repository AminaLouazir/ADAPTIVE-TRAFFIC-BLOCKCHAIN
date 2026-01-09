/**
 * SOC ANALYZER AGENT
 * AI-powered threat analysis using LM Studio (Mistral 7B)
 * Classifies anomalies and recommends actions
 * 
 * @author Mini SOC Project - Master IASD
 */

'use strict';

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const PORT = 6003;
const RESPONDER_URL = 'http://localhost:6004/respond';
const LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';
const SOC_TOKEN = 'blockchain-soc-2024';

class Analyzer {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.analysisCount = 0;
        this.llmAvailable = false;
        this.setupRoutes();
        this.checkLMStudio();
    }

    async checkLMStudio() {
        try {
            const response = await axios.get('http://127.0.0.1:1234/v1/models', { timeout: 2000 });
            this.llmAvailable = true;
            console.log(`[ANALYZER] 🤖 LM Studio connected: ${response.data.data?.[0]?.id || 'model loaded'}`);
        } catch (error) {
            this.llmAvailable = false;
            console.log(`[ANALYZER] ⚠️  LM Studio not available - using rule-based fallback`);
            console.log(`[ANALYZER] 💡 Start LM Studio and load a model to enable AI analysis`);
        }
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                agent: 'ANALYZER',
                status: 'running',
                port: PORT,
                llmAvailable: this.llmAvailable,
                analysisCount: this.analysisCount
            });
        });

        // Analyze events
        this.app.post('/analyze', async (req, res) => {
            const token = req.headers['x-soc-token'];
            
            if (token !== SOC_TOKEN) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const event = req.body;
            console.log(`[ANALYZER] 🔍 Analyzing: ${event.type} | Severity: ${event.severity}`);
            
            this.analysisCount++;

            try {
                // Perform AI analysis
                const analysis = await this.analyzeWithAI(event);
                
                console.log(`[ANALYZER] 📊 Analysis complete:`);
                console.log(`           Category: ${analysis.category}`);
                console.log(`           Action: ${analysis.recommended_action}`);
                console.log(`           Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

                // Log analysis
                this.logAnalysis(event, analysis);

                // Forward to Responder
                await this.forwardToResponder(event, analysis);

                res.json(analysis);
            } catch (error) {
                console.error(`[ANALYZER] ❌ Analysis failed: ${error.message}`);
                res.status(500).json({ 
                    error: 'Analysis failed',
                    message: error.message 
                });
            }
        });

        // Manual analysis request
        this.app.post('/analyze-manual', async (req, res) => {
            const { event } = req.body;
            const analysis = await this.analyzeWithAI(event);
            res.json(analysis);
        });

        // Check LM Studio connection
        this.app.get('/llm-status', async (req, res) => {
            await this.checkLMStudio();
            res.json({
                available: this.llmAvailable,
                url: LM_STUDIO_URL
            });
        });
    }

    async analyzeWithAI(event) {
        if (this.llmAvailable) {
            try {
                return await this.analyzeWithLLM(event);
            } catch (error) {
                console.log(`[ANALYZER] ⚠️  LLM failed, using rule-based fallback`);
                return this.analyzeRuleBased(event);
            }
        } else {
            return this.analyzeRuleBased(event);
        }
    }

    async analyzeWithLLM(event) {
        const prompt = this.buildPrompt(event);

        const response = await axios.post(LM_STUDIO_URL, {
            model: 'local-model',
            messages: [
                {
                    role: 'system',
                    content: 'You are a cybersecurity analyst for a blockchain-based smart traffic system. Analyze security events and respond with structured JSON only. Be concise and precise.'
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
        
        // Try to parse JSON response
        try {
            // Extract JSON if wrapped in markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(content);
        } catch (parseError) {
            console.log(`[ANALYZER] ⚠️  Failed to parse LLM response, using fallback`);
            return this.analyzeRuleBased(event);
        }
    }

    buildPrompt(event) {
        return `Analyze this blockchain security event and respond ONLY with valid JSON:

EVENT DETAILS:
- Type: ${event.type}
- Severity: ${event.severity}
- Source: ${event.src}
- Details: ${event.details}
- Timestamp: ${new Date(event.timestamp).toISOString()}

CONTEXT:
This is a Hyperledger Fabric blockchain managing smart traffic lights. Events include state changes, density updates, and emergency triggers.

RESPOND WITH THIS EXACT JSON FORMAT:
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "brief_category_name",
  "recommended_action": "monitor|alert|block|investigate|escalate",
  "explanation": "1-2 sentence explanation",
  "confidence": 0.85
}

Requirements:
- severity: Must match or adjust from input severity
- category: Single word or short phrase (e.g., "state_manipulation", "emergency_abuse")
- recommended_action: One of: monitor, alert, block, investigate, escalate
- explanation: Brief reason for the recommendation
- confidence: Float 0.0-1.0

Provide ONLY the JSON, no additional text.`;
    }

    analyzeRuleBased(event) {
        // Fallback rule-based analysis when LLM unavailable
        const analysis = {
            severity: event.severity,
            category: event.type,
            explanation: 'Rule-based analysis (LLM unavailable)',
            confidence: 0.6,
            method: 'rule-based'
        };

        // Determine action based on severity and type
        switch (event.severity) {
            case 'CRITICAL':
                analysis.recommended_action = 'block';
                analysis.explanation = 'Critical severity - immediate blocking required';
                break;
            case 'HIGH':
                if (event.type.includes('emergency') || event.type.includes('unauthorized')) {
                    analysis.recommended_action = 'escalate';
                } else {
                    analysis.recommended_action = 'alert';
                }
                break;
            case 'MEDIUM':
                analysis.recommended_action = 'investigate';
                break;
            case 'LOW':
                analysis.recommended_action = 'monitor';
                break;
            default:
                analysis.recommended_action = 'monitor';
        }

        return analysis;
    }

    logAnalysis(event, analysis) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: {
                type: event.type,
                severity: event.severity,
                src: event.src
            },
            analysis: analysis,
            llmUsed: this.llmAvailable
        };

        const logFile = 'soc-agents/logs/analyzer-results.json';
        try {
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error(`[ANALYZER] Failed to log: ${err.message}`);
        }
    }

    async forwardToResponder(event, analysis) {
        try {
            await axios.post(RESPONDER_URL, {
                event,
                analysis
            }, {
                headers: { 
                    'X-SOC-Token': SOC_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            console.log(`[ANALYZER] ✅ Forwarded to Responder`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`[ANALYZER] ⚠️  Responder not available`);
            } else {
                console.error(`[ANALYZER] ❌ Failed to forward: ${error.message}`);
            }
        }
    }

    start() {
        this.app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║         SOC ANALYZER AGENT - STARTED                   ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`[ANALYZER] 🟢 Listening on http://localhost:${PORT}`);
            console.log(`[ANALYZER] 🤖 LM Studio: ${this.llmAvailable ? 'CONNECTED' : 'NOT AVAILABLE'}`);
            console.log(`[ANALYZER] 📊 Health check: GET /health`);
            console.log(`[ANALYZER] 🔍 Analysis endpoint: POST /analyze`);
            console.log(`[ANALYZER] 🧠 AI-powered threat classification active`);
            console.log('');
        });
    }
}

// Start the analyzer
const analyzer = new Analyzer();
analyzer.start();

module.exports = Analyzer;
