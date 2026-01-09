#!/bin/bash
# Start all SOC agents
# Usage: ./start-soc.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Starting Blockchain SOC Agents System            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if LM Studio is running
echo -e "${YELLOW}[1/5]${NC} Checking LM Studio..."
if curl -s http://127.0.0.1:1234/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LM Studio is running${NC}"
else
    echo -e "${YELLOW}⚠️  LM Studio not detected on port 1234${NC}"
    echo "   Please start LM Studio manually for AI-powered analysis"
    echo "   (Rule-based fallback will be used otherwise)"
fi
echo ""

# Create logs directory
echo -e "${YELLOW}[2/5]${NC} Creating logs directory..."
mkdir -p logs
echo -e "${GREEN}✅ Logs directory ready${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[3/5]${NC} Installing dependencies..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}[3/5]${NC} Dependencies already installed"
fi
echo ""

# Start agents
echo -e "${YELLOW}[4/5]${NC} Starting SOC agents..."
echo ""

# Start Sensor
echo "Starting SENSOR (port 6001)..."
node sensor.js > logs/sensor.log 2>&1 &
SENSOR_PID=$!
echo $SENSOR_PID > logs/sensor.pid
sleep 2

# Start Collector
echo "Starting COLLECTOR (port 6002)..."
node collector.js > logs/collector.log 2>&1 &
COLLECTOR_PID=$!
echo $COLLECTOR_PID > logs/collector.pid
sleep 2

# Start Analyzer
echo "Starting ANALYZER (port 6003)..."
node analyzer.js > logs/analyzer.log 2>&1 &
ANALYZER_PID=$!
echo $ANALYZER_PID > logs/analyzer.pid
sleep 2

# Start Responder
echo "Starting RESPONDER (port 6004)..."
node responder.js > logs/responder.log 2>&1 &
RESPONDER_PID=$!
echo $RESPONDER_PID > logs/responder.pid
sleep 2

echo ""
echo -e "${GREEN}✅ All agents started!${NC}"
echo ""

# Verify all agents
echo -e "${YELLOW}[5/5]${NC} Verifying agents..."
echo ""

check_agent() {
    local name=$1
    local port=$2
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} $name (port $port) - Running"
    else
        echo -e "  ${YELLOW}⚠️${NC}  $name (port $port) - Not responding"
    fi
}

check_agent "SENSOR    " 6001
check_agent "COLLECTOR " 6002
check_agent "ANALYZER  " 6003
check_agent "RESPONDER " 6004

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SOC System Ready!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f logs/sensor.log"
echo "   tail -f logs/collector.log"
echo "   tail -f logs/analyzer.log"
echo "   tail -f logs/responder.log"
echo ""
echo "🔍 Check status:"
echo "   curl http://localhost:6001/health  # Sensor"
echo "   curl http://localhost:6002/health  # Collector"
echo "   curl http://localhost:6003/health  # Analyzer"
echo "   curl http://localhost:6004/health  # Responder"
echo ""
echo "🛑 Stop all agents:"
echo "   ./stop-soc.sh"
echo ""
