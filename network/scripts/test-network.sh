#!/bin/bash
# Test if the Fabric network is working correctly

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Network Health Check                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Testing peer0 channel membership:${NC}"
docker exec cli peer channel list

echo -e "\n${YELLOW}Testing peer0 connectivity:${NC}"
docker exec cli peer channel getinfo -c traffic-channel

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Network is Healthy! ✓                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
