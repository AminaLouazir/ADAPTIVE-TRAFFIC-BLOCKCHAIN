#!/bin/bash
# Deploy traffic light chaincode to the network
# Supports JavaScript chaincode with both organizations

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
export CHAINCODE_VERSION=1.3
export CHAINCODE_SEQUENCE=4
export CHAINCODE_PATH=/opt/gopath/src/github.com/chaincode/traffic-light
export CHAINCODE_LANG=node

# Change to network directory
cd ..

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}[ERROR]${NC} Network is not running!"
    echo "Run: cd scripts && ./network-up.sh first"
    exit 1
fi

# Check if chaincode exists
if [ ! -f "../chaincode/traffic-light/package.json" ]; then
    echo -e "${RED}[ERROR]${NC} Chaincode package.json not found!"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "../chaincode/traffic-light/node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installing npm dependencies on host..."
    (cd ../chaincode/traffic-light && npm install)
fi
echo -e "${GREEN}[✓]${NC} Dependencies ready"

# Package chaincode
echo -e "\n${YELLOW}[1/7]${NC} Packaging chaincode..."
docker exec cli peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
    --path ${CHAINCODE_PATH} \
    --lang ${CHAINCODE_LANG} \
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to package chaincode"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Chaincode packaged"

# Install on peer0.org1
echo -e "\n${YELLOW}[2/7]${NC} Installing chaincode on peer0.org1..."
docker exec cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install on peer0.org1"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Installed on peer0.org1"

# Install on peer0.org2
echo -e "\n${YELLOW}[3/7]${NC} Installing chaincode on peer0.org2..."
docker exec \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install on peer0.org2"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Installed on peer0.org2"

# Get package ID
echo -e "\n${YELLOW}[4/7]${NC} Getting package ID..."
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | sed -n 's/.*Package ID: \([^,]*\).*/\1/p')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}[ERROR]${NC} Could not find package ID"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Package ID: ${PACKAGE_ID}"

# Approve for Org1
echo -e "\n${YELLOW}[5/7]${NC} Approving chaincode for Org1..."
docker exec cli peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CHAINCODE_SEQUENCE}

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to approve for Org1"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Approved for Org1"

# Approve for Org2
echo -e "\n${YELLOW}[6/7]${NC} Approving chaincode for Org2..."
docker exec \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    cli peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CHAINCODE_SEQUENCE}

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to approve for Org2"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Approved for Org2"

# Check commit readiness
echo -e "\n${YELLOW}Checking commit readiness...${NC}"
docker exec cli peer lifecycle chaincode checkcommitreadiness \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${CHAINCODE_SEQUENCE} \
    --output json

# Commit chaincode
echo -e "\n${YELLOW}[7/7]${NC} Committing chaincode to channel..."
docker exec cli peer lifecycle chaincode commit \
    -o orderer.example.com:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${CHAINCODE_SEQUENCE} \
    --peerAddresses peer0.org1.example.com:7051 \
    --peerAddresses peer0.org2.example.com:9051

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to commit chaincode"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Chaincode committed"

# Verify deployment
echo -e "\n${YELLOW}Verifying deployment...${NC}"
docker exec cli peer lifecycle chaincode querycommitted \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME}

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Chaincode Deployed Successfully!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Chaincode Information:${NC}"
echo "  • Name: ${CHAINCODE_NAME}"
echo "  • Version: ${CHAINCODE_VERSION}"
echo "  • Channel: ${CHANNEL_NAME}"
echo "  • Language: JavaScript (Node.js)"
echo "  • Installed on: peer0.org1, peer0.org2"
echo "  • Approved by: Org1, Org2"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Initialize ledger: ${GREEN}./test-chaincode.sh init${NC}"
echo "  2. Test functions: ${GREEN}./test-chaincode.sh test${NC}"
echo ""
