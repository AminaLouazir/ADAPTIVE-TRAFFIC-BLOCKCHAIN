#!/bin/bash
# Test SOC anomaly detection
# Injects various types of anomalies to test the system

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     SOC Anomaly Detection - Test Suite                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Invalid State Transition
echo -e "${YELLOW}[TEST 1]${NC} Invalid State Transition (GREEN → RED)"
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "invalid_state_transition",
    "severity": "HIGH",
    "src": "INT-001-NORTH",
    "details": "Attempted transition GREEN → RED (bypassing YELLOW)",
    "timestamp": '$(date +%s000)'
  }' \
  -w "\nStatus: %{http_code}\n\n"

sleep 3

# Test 2: Density Manipulation
echo -e "${YELLOW}[TEST 2]${NC} Density Manipulation (density = 5.0)"
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "density_manipulation",
    "severity": "CRITICAL",
    "src": "INT-001-SOUTH",
    "details": "Invalid density value: 5.0 (must be 0.0-1.0)",
    "timestamp": '$(date +%s000)'
  }' \
  -w "\nStatus: %{http_code}\n\n"

sleep 3

# Test 3: Emergency Abuse
echo -e "${YELLOW}[TEST 3]${NC} Emergency Mode Abuse"
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "emergency_abuse",
    "severity": "HIGH",
    "src": "INT-001",
    "details": "Emergency triggered 5 times in 2 minutes",
    "timestamp": '$(date +%s000)'
  }' \
  -w "\nStatus: %{http_code}\n\n"

sleep 3

# Test 4: Rapid State Changes
echo -e "${YELLOW}[TEST 4]${NC} Rapid State Changes"
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "rapid_state_changes",
    "severity": "HIGH",
    "src": "INT-002-EAST",
    "details": "15 state changes in 1 minute - possible DDoS",
    "timestamp": '$(date +%s000)'
  }' \
  -w "\nStatus: %{http_code}\n\n"

sleep 3

# Test 5: Unauthorized Organization
echo -e "${YELLOW}[TEST 5]${NC} Unauthorized Emergency Trigger"
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "unauthorized_emergency",
    "severity": "CRITICAL",
    "src": "INT-002",
    "details": "Emergency triggered by Org1MSP (only Org2MSP allowed)",
    "timestamp": '$(date +%s000)'
  }' \
  -w "\nStatus: %{http_code}\n\n"

sleep 3

# Show results
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Test Results                                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Check logs:${NC}"
echo "  tail -f soc-agents/logs/sensor-anomalies.json"
echo "  tail -f soc-agents/logs/alerts.json"
echo "  tail -f soc-agents/logs/blocked.json"
echo ""

echo -e "${YELLOW}Agent statistics:${NC}"
echo "  Sensor:    curl http://localhost:6001/stats"
echo "  Collector: curl http://localhost:6002/stats"
echo "  Responder: curl http://localhost:6004/stats"
echo ""

echo -e "${YELLOW}View blocked sources:${NC}"
echo "  curl http://localhost:6004/blocked"
echo ""

# Get statistics
echo -e "${GREEN}Current Statistics:${NC}"
echo "Sensor anomalies detected:"
curl -s http://localhost:6001/stats | jq '.totalEvents' 2>/dev/null || echo "  (Sensor not responding)"

echo "Collector events collected:"
curl -s http://localhost:6002/stats | jq '.totalEvents' 2>/dev/null || echo "  (Collector not responding)"

echo "Responder actions executed:"
curl -s http://localhost:6004/stats | jq '.totalActions' 2>/dev/null || echo "  (Responder not responding)"

echo ""
echo -e "${GREEN}Tests completed!${NC} Check the logs above for detailed results."
