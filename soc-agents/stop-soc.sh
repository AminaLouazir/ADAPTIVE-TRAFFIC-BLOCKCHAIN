#!/bin/bash
# Stop all SOC agents
# Usage: ./stop-soc.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         Stopping Blockchain SOC Agents                 ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

stop_agent() {
    local name=$1
    local pidfile="logs/${name}.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping $name (PID: $pid)..."
            kill $pid
            rm "$pidfile"
            echo -e "${GREEN}✅ $name stopped${NC}"
        else
            echo -e "${RED}⚠️  $name not running${NC}"
            rm "$pidfile"
        fi
    else
        echo -e "${RED}⚠️  $name PID file not found${NC}"
    fi
}

stop_agent "sensor"
stop_agent "collector"
stop_agent "analyzer"
stop_agent "responder"

# Also kill by port (fallback)
echo ""
echo "Cleaning up any remaining processes..."
pkill -f "node sensor.js" 2>/dev/null
pkill -f "node collector.js" 2>/dev/null
pkill -f "node analyzer.js" 2>/dev/null
pkill -f "node responder.js" 2>/dev/null

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All SOC Agents Stopped                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
