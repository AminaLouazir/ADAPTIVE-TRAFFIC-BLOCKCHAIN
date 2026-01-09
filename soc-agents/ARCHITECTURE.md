# Architecture Diagram - Mini SOC Agentique

## Flux Complet d'un Événement de Sécurité

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN TRAFFIC SIMULATOR                         │
│                         (Port 3000)                                     │
│                                                                         │
│  • Gère feux de circulation (Hyperledger Fabric)                       │
│  • Génère transactions: stateChange, densityUpdate, emergency          │
│  • Envoie événements HTTP → SOC SENSOR                                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ POST /event
                             │ {type, src, details, timestamp}
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT 1: SENSOR                                  │
│                         (Port 6001)                                     │
│                                                                         │
│  RÔLE: Détection d'anomalies                                           │
│                                                                         │
│  RÈGLES DE DÉTECTION:                                                  │
│  ├─ Invalid state transition (GREEN→RED sans YELLOW)                   │
│  ├─ Density manipulation (< 0 ou > 1.0)                                │
│  ├─ Emergency abuse (>3 en 5 minutes)                                  │
│  ├─ Rapid state changes (>10 en 1 minute)                              │
│  └─ Unauthorized organization (Org1 trigger emergency)                 │
│                                                                         │
│  ENTRÉE: Événement brut                                                │
│  SORTIE: Anomalie enrichie avec severity                               │
│                                                                         │
│  EXEMPLE:                                                              │
│  IN:  {type: "stateChange", oldState: "GREEN", newState: "RED"}       │
│  OUT: {type: "invalid_transition", severity: "HIGH", src: "LIGHT-N"}  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ POST /collect
                             │ {type, severity, src, details, timestamp}
                             │ Header: X-SOC-Token
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AGENT 2: COLLECTOR                                 │
│                         (Port 6002)                                     │
│                                                                         │
│  RÔLE: Centralisation et stockage                                      │
│                                                                         │
│  FONCTIONS:                                                            │
│  ├─ Authentification (vérification token SOC)                          │
│  ├─ Stockage persistant (logs/collected-events.json)                   │
│  ├─ Statistiques (par sévérité, type, période)                        │
│  └─ Forwarding vers Analyzer                                           │
│                                                                         │
│  ENTRÉE: Anomalie du Sensor                                            │
│  SORTIE: Événement horodaté et stocké                                  │
│                                                                         │
│  STOCKAGE:                                                             │
│  ┌──────────────────────────────────────────────────┐                 │
│  │ {"timestamp": "2026-01-09T...",                  │                 │
│  │  "type": "invalid_transition",                   │                 │
│  │  "severity": "HIGH",                             │                 │
│  │  "src": "LIGHT-N",                               │                 │
│  │  "collectedAt": 1704801234000}                   │                 │
│  └──────────────────────────────────────────────────┘                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ POST /analyze
                             │ {type, severity, src, details}
                             │ Header: X-SOC-Token
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       AGENT 3: ANALYZER                                 │
│                         (Port 6003)                                     │
│                            🧠 IA                                        │
│                                                                         │
│  RÔLE: Analyse intelligente avec LM Studio                             │
│                                                                         │
│  PROCESSUS:                                                            │
│  1. Réception événement du Collector                                   │
│  2. Construction du prompt contextualisé                               │
│  3. Appel LM Studio (Mistral 7B) ou règles fallback                    │
│  4. Parsing réponse JSON du LLM                                        │
│  5. Extraction: severity, category, action, confidence                 │
│                                                                         │
│  ┌──────────────── LM STUDIO ────────────────┐                        │
│  │ http://127.0.0.1:1234/v1/chat/completions │                        │
│  │                                            │                        │
│  │ PROMPT:                                    │                        │
│  │ "Analyser événement blockchain:            │                        │
│  │  Type: invalid_transition                  │                        │
│  │  Détails: GREEN→RED bypass YELLOW          │                        │
│  │  Recommander action JSON"                  │                        │
│  │                                            │                        │
│  │ RÉPONSE LLM:                               │                        │
│  │ {                                          │                        │
│  │   "severity": "HIGH",                      │                        │
│  │   "category": "state_manipulation",        │                        │
│  │   "recommended_action": "alert",           │                        │
│  │   "explanation": "Invalid bypass detected",│                        │
│  │   "confidence": 0.92                       │                        │
│  │ }                                          │                        │
│  └────────────────────────────────────────────┘                        │
│                                                                         │
│  FALLBACK (si LM Studio indisponible):                                 │
│  • CRITICAL → block                                                    │
│  • HIGH → alert/escalate                                               │
│  • MEDIUM → investigate                                                │
│  • LOW → monitor                                                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ POST /respond
                             │ {event: {...}, analysis: {...}}
                             │ Header: X-SOC-Token
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AGENT 4: RESPONDER                                 │
│                         (Port 6004)                                     │
│                                                                         │
│  RÔLE: Exécution automatique des actions                               │
│                                                                         │
│  ACTIONS DISPONIBLES:                                                  │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │   BLOCK     │ → Bloquer source + blacklist blockchain               │
│  └─────────────┘   Log: logs/blocked.json                              │
│                    Output: 🚫 BLOCKED: INT-001-NORTH                   │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │   ALERT     │ → Générer alerte sécurité                             │
│  └─────────────┘   Log: logs/alerts.json                               │
│                    Output: ⚠️ SECURITY ALERT                           │
│                    Simule: Email/Slack/SMS                             │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │ INVESTIGATE │ → Créer ticket investigation                          │
│  └─────────────┘   Log: logs/tickets.json                              │
│                    Output: 🎫 TICKET-1704801234                        │
│                    Simule: Jira/GitHub Issue                           │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │  ESCALATE   │ → Escalade équipe sécurité                            │
│  └─────────────┘   Log: logs/escalations.json                          │
│                    Output: 🚨 ESCALATION                               │
│                    Action: ALERT + TICKET                              │
│                                                                         │
│  ┌─────────────┐                                                       │
│  │   MONITOR   │ → Surveillance passive                                │
│  └─────────────┘   Log: logs/monitoring.json                           │
│                    Output: 👁️ MONITORING                              │
│                                                                         │
│  EXEMPLE D'EXÉCUTION:                                                  │
│  Analysis: {recommended_action: "block"}                               │
│  →                                                                     │
│  ═══════════════════════════════════════════════════                   │
│  🚫 BLOCKING ACTION EXECUTED                                          │
│  ═══════════════════════════════════════════════════                   │
│  Source: INT-001-NORTH                                                 │
│  Reason: invalid_state_transition                                      │
│  Details: Invalid bypass detected                                      │
│  Confidence: 92.0%                                                     │
│  ═══════════════════════════════════════════════════                   │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                        CHRONOLOGIE COMPLÈTE
═══════════════════════════════════════════════════════════════════════════

T=0ms     │ Simulator: Changement état GREEN → RED (invalide)
          │
T=10ms    │ SENSOR: 🔍 Détecte invalid_state_transition
          │         Severity: HIGH
          │         Forward → COLLECTOR
          │
T=15ms    │ COLLECTOR: 📦 Reçoit anomalie
          │            Stocke: collected-events.json
          │            Forward → ANALYZER
          │
T=20ms    │ ANALYZER: 🤖 Analyse avec LM Studio
          │           Prompt: "Analyser invalid transition..."
          │           
T=2000ms  │ ANALYZER: ✓ Réponse LLM reçue
          │           Category: state_manipulation
          │           Action: alert
          │           Confidence: 0.92
          │           Forward → RESPONDER
          │
T=2010ms  │ RESPONDER: ⚡ Exécute action ALERT
          │            Génère: logs/alerts.json
          │            Console: ⚠️ SECURITY ALERT
          │            Status: COMPLETED
          │
T=2015ms  │ FIN: Événement traité avec succès
          │      Durée totale: 2.015 secondes


═══════════════════════════════════════════════════════════════════════════
                    COMMUNICATION INTER-AGENTS
═══════════════════════════════════════════════════════════════════════════

Protocol: HTTP REST
Format: JSON
Security: X-SOC-Token header
Timeout: 5-30s (selon agent)

Message Type 1: SENSOR → COLLECTOR
┌────────────────────────────────────┐
│ POST /collect                      │
│ Header: X-SOC-Token: xxx           │
│ Body: {                            │
│   "type": "invalid_transition",    │
│   "severity": "HIGH",              │
│   "src": "LIGHT-N",                │
│   "details": "GREEN→RED",          │
│   "timestamp": 1704801234000       │
│ }                                  │
└────────────────────────────────────┘

Message Type 2: COLLECTOR → ANALYZER
┌────────────────────────────────────┐
│ POST /analyze                      │
│ Header: X-SOC-Token: xxx           │
│ Body: {                            │
│   "type": "invalid_transition",    │
│   "severity": "HIGH",              │
│   "src": "LIGHT-N",                │
│   "details": "GREEN→RED",          │
│   "timestamp": 1704801234000,      │
│   "collectedAt": 1704801234015     │
│ }                                  │
└────────────────────────────────────┘

Message Type 3: ANALYZER → RESPONDER
┌────────────────────────────────────┐
│ POST /respond                      │
│ Header: X-SOC-Token: xxx           │
│ Body: {                            │
│   "event": {                       │
│     "type": "invalid_transition",  │
│     "src": "LIGHT-N"               │
│   },                               │
│   "analysis": {                    │
│     "severity": "HIGH",            │
│     "category": "state_manip",     │
│     "recommended_action": "alert", │
│     "confidence": 0.92             │
│   }                                │
│ }                                  │
└────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                    STATISTIQUES & MONITORING
═══════════════════════════════════════════════════════════════════════════

Health Checks:
  GET http://localhost:6001/health → SENSOR status
  GET http://localhost:6002/health → COLLECTOR status
  GET http://localhost:6003/health → ANALYZER status
  GET http://localhost:6004/health → RESPONDER status

Statistics:
  GET http://localhost:6001/stats → Events processed
  GET http://localhost:6002/stats → Events by severity/type
  GET http://localhost:6004/stats → Actions executed

Blocked Sources:
  GET http://localhost:6004/blocked → List of blocked IPs/IDs
  POST http://localhost:6004/unblock → Unblock a source

Logs Files:
  soc-agents/logs/sensor-anomalies.json → All detected anomalies
  soc-agents/logs/collected-events.json → All centralized events
  soc-agents/logs/analyzer-results.json → AI analysis results
  soc-agents/logs/alerts.json → Security alerts generated
  soc-agents/logs/tickets.json → Investigation tickets
  soc-agents/logs/blocked.json → Blocked sources
  soc-agents/logs/escalations.json → Escalated incidents
  soc-agents/logs/monitoring.json → Passive monitoring


═══════════════════════════════════════════════════════════════════════════
                    INTÉGRATION BLOCKCHAIN
═══════════════════════════════════════════════════════════════════════════

Le SOC surveille ces transactions Hyperledger Fabric:

1. updateSignalState() → stateChange event
   Détecte: Transitions invalides, changements rapides

2. updateTrafficDensity() → densityUpdate event
   Détecte: Valeurs hors limites, pics suspects

3. triggerEmergency() → emergency event
   Détecte: Abus mode urgence, organisation non autorisée

4. Manual overrides → manualOverride event
   Détecte: Modifications suspectes

Tous les événements sont interceptés et analysés en temps réel!
```
