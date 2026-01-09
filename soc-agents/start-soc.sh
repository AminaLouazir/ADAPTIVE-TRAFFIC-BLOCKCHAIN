#!/bin/bash
# Start all SOC agents in the correct order
# Part of Mini SOC Agentique Project - Master IASD

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Starting Mini SOC Agentique System                ║${NC}"
echo -e "${GREEN}║     Blockchain Security Monitoring                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if LM Studio is running
echo -e "${YELLOW}[1/5]${NC} Checking LM Studio..."
if curl -s http://127.0.0.1:1234/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} LM Studio is running"
else
    echo -e "${YELLOW}[!]${NC} LM Studio not detected on http://127.0.0.1:1234"
    echo "      Analyzer will use rule-based fallback"
    echo "      To enable AI: Start LM Studio and load a model (Mistral 7B recommended)"
fi

# Create logs directory
echo -e "\n${YELLOW}[2/5]${NC} Preparing environment..."
mkdir -p logs
touch logs/sensor-anomalies.json
touch logs/collected-events.json
touch logs/analyzer-results.json
touch logs/alerts.json
touch logs/tickets.json
touch logs/blocked.json
echo -e "${GREEN}[✓]${NC} Log files created"

# Start agents in sequence
echo -e "\n${YELLOW}[3/5]${NC} Starting SOC agents..."

# Start Sensor
node sensor.js > logs/sensor.log 2>&1 &
SENSOR_PID=$!
echo -e "${GREEN}[✓]${NC} SENSOR started (PID: $SENSOR_PID, Port: 6001)"
sleep 2

# Start Collector
node collector.js > logs/collector.log 2>&1 &
COLLECTOR_PID=$!
echo -e "${GREEN}[✓]${NC} COLLECTOR started (PID: $COLLECTOR_PID, Port: 6002)"
sleep 2

# Start Analyzer
node analyzer.js > logs/analyzer.log 2>&1 &
ANALYZER_PID=$!
echo -e "${GREEN}[✓]${NC} ANALYZER started (PID: $ANALYZER_PID, Port: 6003)"
sleep 2

# Start Responder
node responder.js > logs/responder.log 2>&1 &
RESPONDER_PID=$!
echo -e "${GREEN}[✓]${NC} RESPONDER started (PID: $RESPONDER_PID, Port: 6004)"
sleep 2

# Save PIDs
echo $SENSOR_PID > .sensor.pid
echo $COLLECTOR_PID > .collector.pid
echo $ANALYZER_PID > .analyzer.pid
echo $RESPONDER_PID > .responder.pid

# Health checks
echo -e "\n${YELLOW}[4/5]${NC} Verifying agents..."
sleep 3

check_agent() {
    local name=$1
    local port=$2
    for i in {1..5}; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            echo -e "${GREEN}[✓]${NC} $name is healthy"
            return 0
        fi
        sleep 1
    done
    echo -e "${RED}[✗]${NC} $name failed health check (try: curl http://localhost:$port/health)"
    return 1
}

check_agent "SENSOR" 6001
check_agent "COLLECTOR" 6002
check_agent "ANALYZER" 6003
check_agent "RESPONDER" 6004

# Print summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Mini SOC System - RUNNING                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}SOC Agent Status:${NC}"
echo "  🔍 SENSOR     → http://localhost:6001 (PID: $SENSOR_PID)"
echo "  📦 COLLECTOR  → http://localhost:6002 (PID: $COLLECTOR_PID)"
echo "  🧠 ANALYZER   → http://localhost:6003 (PID: $ANALYZER_PID)"
echo "  ⚡ RESPONDER  → http://localhost:6004 (PID: $RESPONDER_PID)"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  📄 Real-time: tail -f logs/*.log"
echo "  📊 Anomalies: tail -f logs/sensor-anomalies.json"
echo "  🔔 Alerts:    tail -f logs/alerts.json"
echo "  🚫 Blocked:   tail -f logs/blocked.json"
echo ""
echo -e "${YELLOW}Stop agents:${NC}"
echo "  ./stop-soc.sh"
echo ""
echo -e "${YELLOW}Test anomaly detection:${NC}"
echo "  # Invalid state transition"
echo "  curl -X POST http://localhost:6001/inject-anomaly \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"type\":\"invalid_state_transition\",\"severity\":\"HIGH\",\"src\":\"LIGHT-001\",\"details\":\"GREEN→RED\"}'"
echo ""
echo -e "${GREEN}[5/5]${NC} SOC monitoring active! 🛡️"
echo ""
