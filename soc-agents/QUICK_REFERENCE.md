# 🚀 SOC Quick Reference

## Start/Stop Commands
```bash
cd soc-agents

# Start all agents
./start-soc.sh

# Stop all agents
./stop-soc.sh

# Test scenarios
./test-soc.sh
```

## Agent Ports
- **Sensor:** 6001
- **Collector:** 6002
- **Analyzer:** 6003
- **Responder:** 6004

## Health Checks
```bash
curl http://localhost:6001/health  # Sensor
curl http://localhost:6002/health  # Collector
curl http://localhost:6003/health  # Analyzer
curl http://localhost:6004/health  # Responder
```

## View Statistics
```bash
curl http://localhost:6002/stats | jq       # Collector stats
curl http://localhost:6004/blocked | jq     # Blocked sources
curl http://localhost:6004/responses | jq   # Recent actions
```

## View Logs
```bash
# Live monitoring
tail -f logs/sensor.log
tail -f logs/analyzer.log
tail -f logs/responder.log

# Event logs
cat logs/events.json    # All anomalies
cat logs/alerts.json    # Alerts sent
cat logs/tickets.json   # Tickets created
cat logs/blocked.txt    # Blocked IPs
```

## Manual Event Test
```bash
# Send test anomaly to Sensor
curl -X POST http://localhost:6001/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stateChange",
    "lightId": "INT-001-NORTH",
    "oldState": "RED",
    "newState": "YELLOW",
    "src": "INT-001-NORTH",
    "timestamp": '$(date +%s000)'
  }'
```

## Detection Rules
1. **Invalid State Transition** - RED → YELLOW (should be RED → GREEN)
2. **Density Manipulation** - Density < 0.0 or > 1.0
3. **Emergency Abuse** - >3 triggers without clear
4. **Unauthorized Creation** - Org2 creating intersections
5. **Rapid Changes** - >10 changes per minute

## Response Actions
- **block** - Permanent blacklist
- **alert** - Notify security team
- **investigate** - Create ticket
- **quarantine** - Temporary isolation (1h)
- **monitor** - Passive logging

## LM Studio
```bash
# Check if running
curl http://127.0.0.1:1234/v1/models

# Not required - system uses fallback
```

## Troubleshooting
```bash
# Port conflicts
lsof -i :6001
kill -9 $(lsof -ti:6001)

# View full agent output
cat logs/analyzer.log | grep ERROR
```

## Integration with Simulator
Simulator automatically sends events when:
- State changes occur
- Density is updated
- Emergency mode triggered

Disable with: `SOC_ENABLED=false node simulator/server.js`
