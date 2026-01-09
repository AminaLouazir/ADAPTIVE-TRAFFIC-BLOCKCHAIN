# Blockchain SOC Agents - Security Operations Center

## 📋 Overview

A **Security Operations Center (SOC)** system monitoring the Adaptive Traffic Blockchain for security anomalies. Uses 4 autonomous agents with AI-powered analysis via LM Studio.

## 🏗️ Architecture

```
[BLOCKCHAIN] → [SENSOR] → [COLLECTOR] → [ANALYZER (AI)] → [RESPONDER]
  (Fabric)      Port 6001    Port 6002      Port 6003       Port 6004
```

## 🤖 Agents

### 1. **Sensor** (Port 6001)
**Role:** Detects anomalies in blockchain transactions
- Monitors traffic light state changes
- Detects invalid transitions, density manipulation, emergency abuse
- Forwards anomalies to Collector

**Detection Rules:**
- ✅ Invalid state transitions (e.g., RED → YELLOW)
- ✅ Density values outside 0.0-1.0 range
- ✅ Emergency mode abuse (>3 triggers without clear)
- ✅ Unauthorized intersection creation
- ✅ Rapid state changes (DoS detection)

### 2. **Collector** (Port 6002)
**Role:** Centralizes and stores security events
- Receives anomalies from Sensor
- Persists to `logs/events.json`
- Forwards to Analyzer for AI analysis
- Provides statistics API

### 3. **Analyzer** (Port 6003)
**Role:** AI-powered threat analysis using LM Studio
- Queries local LLM (Mistral 7B) for threat assessment
- Classifies severity, category, and recommends actions
- Fallback to rule-based analysis if LM Studio unavailable
- Forwards recommendations to Responder

**LM Studio API:** `http://127.0.0.1:1234/v1/chat/completions`

### 4. **Responder** (Port 6004)
**Role:** Executes automated security responses
- **Block:** Adds source to blocklist
- **Alert:** Sends security notification
- **Investigate:** Creates incident ticket
- **Quarantine:** Temporary isolation (1 hour)
- **Monitor:** Passive observation

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Install LM Studio (optional but recommended)
# Download from: https://lmstudio.ai
# Load a model: Mistral 7B Instruct or similar

# 2. Install dependencies
cd soc-agents
npm install
```

### Start SOC System
```bash
# Start all agents
./start-soc.sh

# Output:
# ✅ SENSOR (port 6001) - Running
# ✅ COLLECTOR (port 6002) - Running
# ✅ ANALYZER (port 6003) - Running
# ✅ RESPONDER (port 6004) - Running
```

### Run Tests
```bash
# Send test anomalies
./test-soc.sh

# Expected: 4 anomalies detected, 1 normal event passed
```

### Stop SOC System
```bash
./stop-soc.sh
```

## 📊 Monitoring

### Check Agent Health
```bash
curl http://localhost:6001/health  # Sensor
curl http://localhost:6002/health  # Collector
curl http://localhost:6003/health  # Analyzer
curl http://localhost:6004/health  # Responder
```

### View Statistics
```bash
# Collector statistics
curl http://localhost:6002/stats | jq

# Analyzer analyses
curl http://localhost:6003/analyses | jq

# Responder actions
curl http://localhost:6004/responses | jq

# Blocked sources
curl http://localhost:6004/blocked | jq
```

### View Logs
```bash
# Live monitoring
tail -f logs/sensor.log
tail -f logs/analyzer.log
tail -f logs/responder.log

# Event logs
cat logs/events.json    # All collected events
cat logs/alerts.json    # Security alerts
cat logs/tickets.json   # Investigation tickets
cat logs/blocked.txt    # Blocked sources
```

## 🔗 Integration with Simulator

The simulator automatically sends events to the SOC Sensor when anomalies occur. See the modified `simulator/server.js` for integration details.

### Example: Trigger Emergency Mode
```bash
# In simulator
curl -X POST http://localhost:3000/api/traffic/emergency \
  -H "Content-Type: application/json" \
  -d '{"direction": "NORTH", "vehicleType": "AMBULANCE"}'

# SOC will detect if triggered >3 times without clearing
```

## 🧪 Test Scenarios

### Test 1: Invalid State Transition
```bash
curl -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stateChange",
    "lightId": "INT-001-NORTH",
    "oldState": "RED",
    "newState": "YELLOW"
  }'
```

### Test 2: Density Manipulation
```bash
curl -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "densityUpdate",
    "lightId": "INT-001-SOUTH",
    "density": 5.0,
    "vehicleCount": 25
  }'
```

## 🤖 LM Studio Configuration

### Setup
1. Download and install [LM Studio](https://lmstudio.ai)
2. Load a model (recommended: **Mistral 7B Instruct**)
3. Start the local server (default port: 1234)
4. Verify: `curl http://127.0.0.1:1234/v1/models`

### Without LM Studio
The Analyzer falls back to rule-based analysis if LM Studio is unavailable. The system works fully without AI, but with less sophisticated threat classification.

## 📈 Performance

- **Event Processing:** ~10ms per event
- **AI Analysis:** ~2-5s with LM Studio
- **Fallback Analysis:** <1ms
- **Capacity:** 100+ events/second

## 🛡️ Security Features

- **Token-based authentication** between agents
- **Event validation** at each stage
- **Immutable audit logs** (append-only)
- **Automatic quarantine** for suspicious sources
- **Human review flags** for critical threats

## 📚 API Endpoints

### Sensor (6001)
- `POST /event` - Receive blockchain event
- `GET /events` - Query all events
- `GET /health` - Health check

### Collector (6002)
- `POST /collect` - Receive anomaly
- `GET /events?severity=HIGH` - Query events
- `GET /stats` - Statistics
- `GET /health` - Health check

### Analyzer (6003)
- `POST /analyze` - Analyze event
- `GET /analyses` - Recent analyses
- `GET /health` - Health check

### Responder (6004)
- `POST /respond` - Execute action
- `GET /responses` - Recent responses
- `GET /blocked` - Blocked sources
- `POST /unblock` - Unblock source
- `GET /health` - Health check

## 🔧 Troubleshooting

### LM Studio Not Responding
```bash
# Check if running
curl http://127.0.0.1:1234/v1/models

# System will use rule-based fallback
```

### Agent Not Starting
```bash
# Check port availability
lsof -i :6001  # Sensor
lsof -i :6002  # Collector
lsof -i :6003  # Analyzer
lsof -i :6004  # Responder

# Kill process if port busy
kill -9 $(lsof -ti:6001)
```

### No Events Received
```bash
# Verify Sensor is accessible
curl http://localhost:6001/health

# Check simulator is running
curl http://localhost:3000/health

# Manually send test event
./test-soc.sh
```

## 📖 Academic Context

**Course:** Master IASD - Blockchain + SOC Agentique  
**Objective:** Demonstrate autonomous agent cooperation with AI-powered security analysis  
**Technologies:** Node.js, Express, LM Studio, Hyperledger Fabric

## 🎯 Deliverables

- ✅ Architecture diagram (4 agents + LM Studio)
- ✅ Agent role descriptions
- ✅ Event flow analysis
- ✅ LM Studio integration
- ✅ Complete working code
- ✅ Test scenarios
- ✅ Documentation

## 👥 Authors

- Amina Louazir
- Salma Maaquili
- Hamza Ait Youssef
- Diae Khayatti

Master IASD - Blockchain  
Professor: Pr. Ikram BEN ABDEL OUAHAB
