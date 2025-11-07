#!/bin/bash
# Deploy traffic light chaincode to the network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deploy Traffic Light Chaincode               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

export CHANNEL_NAME=traffic-channel
export CHAINCODE_NAME=traffic-light
export CHAINCODE_VERSION=1.0
export CHAINCODE_PATH=/opt/gopath/src/github.com/chaincode/traffic-light
export CHAINCODE_LANGUAGE=golang

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}[ERROR]${NC} Network is not running!"
    echo "Run: ./network-up.sh first"
    exit 1
fi

# Check if chaincode directory exists
if [ ! -d "../../chaincode/traffic-light" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Chaincode directory not found at ../../chaincode/traffic-light"
    echo -e "${YELLOW}[INFO]${NC} Creating placeholder chaincode directory..."
    mkdir -p ../../chaincode/traffic-light
    echo "// Placeholder chaincode - replace with actual implementation" > ../../chaincode/traffic-light/traffic-light.go
    echo -e "${YELLOW}[NOTE]${NC} You need to implement the chaincode before deploying!"
    echo ""
fi

echo -e "${YELLOW}[INFO]${NC} This script will be fully functional once you implement the chaincode"
echo -e "${YELLOW}[INFO]${NC} For now, showing the deployment steps that will be executed:"
echo ""

echo -e "${YELLOW}Step 1:${NC} Package chaincode"
echo "  docker exec cli peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \\"
echo "    --path ${CHAINCODE_PATH} \\"
echo "    --lang ${CHAINCODE_LANGUAGE} \\"
echo "    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
echo ""

echo -e "${YELLOW}Step 2:${NC} Install chaincode on peer0"
echo "  docker exec cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz"
echo ""

echo -e "${YELLOW}Step 3:${NC} Query installed chaincode"
echo "  docker exec cli peer lifecycle chaincode queryinstalled"
echo ""

echo -e "${YELLOW}Step 4:${NC} Approve chaincode for organization"
echo "  docker exec cli peer lifecycle chaincode approveformyorg \\"
echo "    --channelID ${CHANNEL_NAME} \\"
echo "    --name ${CHAINCODE_NAME} \\"
echo "    --version ${CHAINCODE_VERSION} \\"
echo "    --package-id <PACKAGE_ID> \\"
echo "    --sequence 1 \\"
echo "    --orderer orderer.example.com:7050"
echo ""

echo -e "${YELLOW}Step 5:${NC} Check commit readiness"
echo "  docker exec cli peer lifecycle chaincode checkcommitreadiness \\"
echo "    --channelID ${CHANNEL_NAME} \\"
echo "    --name ${CHAINCODE_NAME} \\"
echo "    --version ${CHAINCODE_VERSION} \\"
echo "    --sequence 1"
echo ""

echo -e "${YELLOW}Step 6:${NC} Commit chaincode"
echo "  docker exec cli peer lifecycle chaincode commit \\"
echo "    --channelID ${CHANNEL_NAME} \\"
echo "    --name ${CHAINCODE_NAME} \\"
echo "    --version ${CHAINCODE_VERSION} \\"
echo "    --sequence 1 \\"
echo "    --orderer orderer.example.com:7050 \\"
echo "    --peerAddresses peer0.org1.example.com:7051"
echo ""

echo -e "${YELLOW}Step 7:${NC} Query committed chaincode"
echo "  docker exec cli peer lifecycle chaincode querycommitted \\"
echo "    --channelID ${CHANNEL_NAME} \\"
echo "    --name ${CHAINCODE_NAME}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Chaincode Deployment Guide Ready                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Implement chaincode in: ${GREEN}../../chaincode/traffic-light/${NC}"
echo "  2. Run this script again to deploy"
echo "  3. Test chaincode with: ${GREEN}./test-chaincode.sh${NC}"
echo ""
