#!/bin/bash
# Test SOC system by sending sample anomalies
# Usage: ./test-soc.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Testing Blockchain SOC System                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Invalid State Transition
echo -e "${YELLOW}[TEST 1]${NC} Invalid State Transition (RED → YELLOW)"
curl -s -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stateChange",
    "lightId": "INT-001-NORTH",
    "oldState": "RED",
    "newState": "YELLOW",
    "timestamp": '$(date +%s000)',
    "src": "INT-001-NORTH"
  }'
echo ""
sleep 2

# Test 2: Density Manipulation
echo -e "${YELLOW}[TEST 2]${NC} Density Manipulation (density = 5.0)"
curl -s -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "densityUpdate",
    "lightId": "INT-001-SOUTH",
    "density": 5.0,
    "vehicleCount": 25,
    "timestamp": '$(date +%s000)',
    "src": "INT-001-SOUTH"
  }'
echo ""
sleep 2

# Test 3: Emergency Abuse
echo -e "${YELLOW}[TEST 3]${NC} Emergency Abuse (4th trigger without clear)"
for i in {1..4}; do
    curl -s -X POST http://localhost:6001/event \
      -H "Content-Type: application/json" \
      -d '{
        "type": "emergency",
        "intersectionId": "INT-002",
        "direction": "NORTH",
        "timestamp": '$(date +%s000)',
        "src": "INT-002"
      }'
    echo " Trigger $i"
    sleep 1
done
echo ""
sleep 2

# Test 4: Unauthorized Creation
echo -e "${YELLOW}[TEST 4]${NC} Unauthorized Intersection Creation (Org2 attempt)"
curl -s -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "intersectionCreate",
    "intersectionId": "INT-999",
    "userId": "hacker@org2.com",
    "orgMSP": "Org2MSP",
    "timestamp": '$(date +%s000)',
    "src": "hacker@org2.com"
  }'
echo ""
sleep 2

# Test 5: Normal Event (should pass)
echo -e "${YELLOW}[TEST 5]${NC} Normal State Transition (GREEN → YELLOW)"
curl -s -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stateChange",
    "lightId": "INT-001-EAST",
    "oldState": "GREEN",
    "newState": "YELLOW",
    "timestamp": '$(date +%s000)',
    "src": "INT-001-EAST"
  }'
echo ""
sleep 2

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Test Scenarios Complete                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "📊 Check Results:"
echo ""
echo "1. Sensor Events:"
echo "   curl http://localhost:6001/events | jq"
echo ""
echo "2. Collector Statistics:"
echo "   curl http://localhost:6002/stats | jq"
echo ""
echo "3. Analyzer Analyses:"
echo "   curl http://localhost:6003/analyses | jq"
echo ""
echo "4. Responder Actions:"
echo "   curl http://localhost:6004/responses | jq"
echo ""
echo "5. Blocked Sources:"
echo "   curl http://localhost:6004/blocked | jq"
echo ""
echo "📁 Check Log Files:"
echo "   cat logs/events.json"
echo "   cat logs/alerts.json"
echo "   cat logs/blocked.txt"
echo "   cat logs/tickets.json"
echo ""
