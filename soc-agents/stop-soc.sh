#!/bin/bash
# Stop all SOC agents
# Part of Mini SOC Agentique Project - Master IASD

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Stopping SOC Agents...${NC}"

# Kill processes by PID files
if [ -f .sensor.pid ]; then
    kill $(cat .sensor.pid) 2>/dev/null && echo -e "${GREEN}[✓]${NC} SENSOR stopped"
    rm .sensor.pid
fi

if [ -f .collector.pid ]; then
    kill $(cat .collector.pid) 2>/dev/null && echo -e "${GREEN}[✓]${NC} COLLECTOR stopped"
    rm .collector.pid
fi

if [ -f .analyzer.pid ]; then
    kill $(cat .analyzer.pid) 2>/dev/null && echo -e "${GREEN}[✓]${NC} ANALYZER stopped"
    rm .analyzer.pid
fi

if [ -f .responder.pid ]; then
    kill $(cat .responder.pid) 2>/dev/null && echo -e "${GREEN}[✓]${NC} RESPONDER stopped"
    rm .responder.pid
fi

# Fallback: kill by port
pkill -f "sensor.js" 2>/dev/null
pkill -f "collector.js" 2>/dev/null
pkill -f "analyzer.js" 2>/dev/null
pkill -f "responder.js" 2>/dev/null

echo ""
echo -e "${GREEN}All SOC agents stopped${NC}"
