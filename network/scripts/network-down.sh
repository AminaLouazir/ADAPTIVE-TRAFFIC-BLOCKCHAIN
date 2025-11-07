#!/bin/bash
# Stop and clean up Hyperledger Fabric network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║          Stopping Fabric Network                      ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Change to network directory
cd ..

# Stop containers
echo -e "${YELLOW}[1/4]${NC} Stopping Docker containers..."
docker-compose -f docker-compose-net.yml down --volumes --remove-orphans

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[WARNING]${NC} Some containers may not have stopped cleanly"
fi

echo -e "${GREEN}[✓]${NC} Containers stopped"

# Remove chaincode containers
echo -e "\n${YELLOW}[2/4]${NC} Removing chaincode containers..."
docker rm -f $(docker ps -aq --filter "name=dev-peer") 2>/dev/null || true
echo -e "${GREEN}[✓]${NC} Chaincode containers removed"

# Remove chaincode images
echo -e "\n${YELLOW}[3/4]${NC} Removing chaincode images..."
docker rmi -f $(docker images -q --filter "reference=dev-*") 2>/dev/null || true
echo -e "${GREEN}[✓]${NC} Chaincode images removed"

# Optional: Clean artifacts (commented out for safety)
# Uncomment the lines below if you want to remove crypto materials and channel artifacts
# echo -e "\n${YELLOW}[4/4]${NC} Cleaning artifacts..."
# rm -rf crypto-config
# rm -rf channel-artifacts/*.block channel-artifacts/*.tx
# echo -e "${GREEN}[✓]${NC} Artifacts cleaned"

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Network Stopped Successfully!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}What was cleaned:${NC}"
echo "  • All network containers stopped"
echo "  • Chaincode containers removed"
echo "  • Chaincode images removed"
echo "  • Docker volumes removed"
echo ""
echo -e "${YELLOW}Preserved:${NC}"
echo "  • Crypto materials (crypto-config/)"
echo "  • Channel artifacts (channel-artifacts/)"
echo ""
echo -e "${YELLOW}To completely clean:${NC} Edit this script and uncomment cleanup section"
echo ""
