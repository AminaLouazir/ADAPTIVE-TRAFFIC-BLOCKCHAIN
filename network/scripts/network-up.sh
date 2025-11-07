#!/bin/bash
# Start Hyperledger Fabric network using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Starting Fabric Network                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Change to network directory
cd ..

# Check if artifacts exist
if [ ! -d "crypto-config" ]; then
    echo -e "${RED}[ERROR]${NC} Crypto materials not found!"
    echo "Run: ./generate-artifacts.sh first"
    exit 1
fi

if [ ! -f "channel-artifacts/genesis.block" ]; then
    echo -e "${RED}[ERROR]${NC} Genesis block not found!"
    echo "Run: ./generate-artifacts.sh first"
    exit 1
fi

# Start the network
echo -e "${YELLOW}[1/3]${NC} Starting Docker containers..."
docker-compose -f docker-compose-net.yml up -d

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to start Docker containers"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Docker containers started"

# Wait for containers to be ready
echo -e "\n${YELLOW}[2/3]${NC} Waiting for containers to be ready..."
sleep 5

# Check container status
echo -e "\n${YELLOW}[3/3]${NC} Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "orderer|peer|ca|cli"

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Network Started Successfully!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Running Containers:${NC}"
echo "  • orderer.example.com - Port 7050"
echo "  • peer0.org1.example.com - Port 7051"
echo "  • peer1.org1.example.com - Port 8051"
echo "  • ca.org1.example.com - Port 7054"
echo "  • cli (command-line interface)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Create channel: ${GREEN}cd scripts && ./create-channel.sh${NC}"
echo "  2. View logs: ${GREEN}docker logs -f peer0.org1.example.com${NC}"
echo "  3. Access CLI: ${GREEN}docker exec -it cli bash${NC}"
echo ""
