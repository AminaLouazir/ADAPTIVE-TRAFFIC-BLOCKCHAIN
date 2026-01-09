# SOC Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ADAPTIVE TRAFFIC BLOCKCHAIN                         │
│                                                                         │
│  ┌─────────────────┐      ┌──────────────────┐                        │
│  │  Hyperledger    │      │   Simulator      │                        │
│  │    Fabric       │◄─────┤   (Node.js)      │                        │
│  │   Chaincode     │      │   Port: 3000     │                        │
│  │                 │      └────────┬─────────┘                        │
│  └─────────────────┘               │                                   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ Events (HTTP POST)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SOC AGENTS SYSTEM                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                        SENSOR (Port 6001)                        │ │
│  │  ┌────────────────────────────────────────────────────────────┐ │ │
│  │  │  Detection Rules:                                          │ │ │
│  │  │  • Invalid state transitions (RED → YELLOW)                │ │ │
│  │  │  • Density manipulation (density > 1.0 or < 0.0)          │ │ │
│  │  │  • Emergency abuse (>3 triggers without clear)             │ │ │
│  │  │  • Unauthorized operations (wrong Org)                     │ │ │
│  │  │  • DoS attacks (rapid changes)                             │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                           │                                       │ │
│  │                           │ Anomalies (JSON)                      │ │
│  │                           ▼                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      COLLECTOR (Port 6002)                       │ │
│  │  ┌────────────────────────────────────────────────────────────┐ │ │
│  │  │  Functions:                                                │ │ │
│  │  │  • Centralize events from Sensor                           │ │ │
│  │  │  • Store to logs/events.json                               │ │ │
│  │  │  • Generate statistics                                      │ │ │
│  │  │  • Token authentication (X-SOC-Token)                      │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                           │                                       │ │
│  │                           │ Stored Events                          │ │
│  │                           ▼                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      ANALYZER (Port 6003)                        │ │
│  │  ┌────────────────────────────────────────────────────────────┐ │ │
│  │  │  AI Analysis (LM Studio):                                  │ │ │
│  │  │  ┌──────────────────────────────────────────────────────┐ │ │ │
│  │  │  │  LM Studio (Port 1234)                               │ │ │ │
│  │  │  │  Model: Mistral 7B Instruct                          │ │ │ │
│  │  │  │  API: /v1/chat/completions                           │ │ │ │
│  │  │  └──────────────────────────────────────────────────────┘ │ │ │
│  │  │                                                            │ │ │
│  │  │  Output:                                                   │ │ │
│  │  │  {                                                         │ │ │
│  │  │    "severity": "LOW|MEDIUM|HIGH|CRITICAL",                │ │ │
│  │  │    "category": "state_violation|data_integrity|...",      │ │ │
│  │  │    "recommended_action": "block|alert|investigate|...",   │ │ │
│  │  │    "confidence": 0.0-1.0,                                 │ │ │
│  │  │    "explanation": "..."                                   │ │ │
│  │  │  }                                                         │ │ │
│  │  │                                                            │ │ │
│  │  │  Fallback: Rule-based analysis if LM Studio unavailable   │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                           │                                       │ │
│  │                           │ Analysis + Recommendations             │ │
│  │                           ▼                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      RESPONDER (Port 6004)                       │ │
│  │  ┌────────────────────────────────────────────────────────────┐ │ │
│  │  │  Actions:                                                  │ │ │
│  │  │                                                            │ │ │
│  │  │  1. 🚫 BLOCK                                               │ │ │
│  │  │     → Add to blocklist (logs/blocked.txt)                 │ │ │
│  │  │     → Simulate iptables/firewall rule                     │ │ │
│  │  │                                                            │ │ │
│  │  │  2. ⚠️  ALERT                                              │ │ │
│  │  │     → Send to security team                               │ │ │
│  │  │     → Log to logs/alerts.json                             │ │ │
│  │  │                                                            │ │ │
│  │  │  3. 🎫 INVESTIGATE                                         │ │ │
│  │  │     → Create incident ticket                              │ │ │
│  │  │     → Log to logs/tickets.json                            │ │ │
│  │  │                                                            │ │ │
│  │  │  4. 🔒 QUARANTINE                                          │ │ │
│  │  │     → Temporary isolation (1 hour)                        │ │ │
│  │  │     → Auto-release after timeout                          │ │ │
│  │  │                                                            │ │ │
│  │  │  5. 👁️  MONITOR                                            │ │ │
│  │  │     → Passive logging                                     │ │ │
│  │  │     → No action taken                                     │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Flow Sequence

```
┌──────────────┐
│  Blockchain  │ 1. Transaction occurs
│  Transaction │    (state change, density update, emergency)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Simulator   │ 2. Simulator detects event
│              │    notifySOC(eventType, data)
└──────┬───────┘
       │
       │ HTTP POST
       │ localhost:6001/event
       ▼
┌──────────────┐
│   SENSOR     │ 3. Sensor analyzes event
│   Port 6001  │    - Check 5 detection rules
│              │    - If anomaly: forward to Collector
└──────┬───────┘
       │
       │ If anomaly detected
       ▼
┌──────────────┐
│  COLLECTOR   │ 4. Collector stores event
│  Port 6002   │    - Append to logs/events.json
│              │    - Forward to Analyzer
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ANALYZER    │ 5. Analyzer queries LM Studio
│  Port 6003   │    - Build prompt with event details
│              │    - Get AI classification
│              │    - (Or use rule-based fallback)
└──────┬───────┘
       │
       │ Analysis + Recommendation
       ▼
┌──────────────┐
│  RESPONDER   │ 6. Responder executes action
│  Port 6004   │    - Block / Alert / Investigate / Quarantine / Monitor
│              │    - Log to appropriate file
└──────────────┘
```

## Communication Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                     Message Format (JSON)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event (Simulator → Sensor):                                   │
│  {                                                              │
│    "type": "stateChange|densityUpdate|emergency|...",          │
│    "timestamp": 1704883200000,                                 │
│    "src": "INT-001-NORTH",                                     │
│    "lightId": "INT-001-NORTH",                                 │
│    "oldState": "RED",                                          │
│    "newState": "GREEN",                                        │
│    "density": 0.5,                                             │
│    "vehicleCount": 10,                                         │
│    ...                                                          │
│  }                                                              │
│                                                                 │
│  Anomaly (Sensor → Collector):                                 │
│  {                                                              │
│    "type": "invalid_state_transition",                         │
│    "severity": "HIGH",                                         │
│    "src": "INT-001-NORTH",                                     │
│    "details": "Invalid transition: RED → YELLOW",              │
│    "reason": "Traffic light violated state machine rules",     │
│    "timestamp": 1704883200000                                  │
│  }                                                              │
│                                                                 │
│  Analysis (Analyzer → Responder):                              │
│  {                                                              │
│    "event": { ... },                                           │
│    "analysis": {                                               │
│      "severity": "HIGH",                                       │
│      "category": "state_violation",                            │
│      "recommended_action": "alert",                            │
│      "explanation": "...",                                     │
│      "confidence": 0.95,                                       │
│      "requires_human_review": false                            │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Security & Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│                  Authentication Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. All inter-agent communication requires token:              │
│                                                                 │
│     Header: X-SOC-Token: blockchain-soc-2024                   │
│                                                                 │
│  2. Sensor receives events without token (from simulator)      │
│                                                                 │
│  3. Collector, Analyzer, Responder verify token on each call   │
│                                                                 │
│  4. Invalid token = 403 Forbidden                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Storage

```
soc-agents/logs/
├── events.json       # All collected anomalies (append-only)
├── alerts.json       # Security alerts sent to team
├── tickets.json      # Investigation tickets created
├── blocked.txt       # Blocked sources (IP/ID list)
├── sensor.log        # Sensor agent logs
├── collector.log     # Collector agent logs
├── analyzer.log      # Analyzer agent logs
└── responder.log     # Responder agent logs
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                     Throughput & Latency                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Event Processing:        ~10ms per event                       │
│  Sensor Detection:        < 1ms                                 │
│  Collector Storage:       ~ 2ms                                 │
│  Analyzer (with AI):      2-5 seconds                           │
│  Analyzer (fallback):     < 1ms                                 │
│  Responder Action:        ~ 5ms                                 │
│                                                                 │
│  Total (with AI):         2-5 seconds                           │
│  Total (fallback):        ~20ms                                 │
│                                                                 │
│  Max Throughput:          100+ events/second                    │
│  Memory Usage:            ~50MB per agent                       │
│  CPU Usage:               <5% idle, ~20% under load             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Generated:** January 9, 2026  
**Project:** Adaptive Traffic Blockchain + SOC Agentique  
**Team:** Amina Louazir, Salma Maaquili, Hamza Ait Youssef, Diae Khayatti
