#!/bin/bash
# Upgrade traffic light chaincode to new version
# Handles the full upgrade lifecycle

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Upgrade Traffic Light Chaincode               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

export CHANNEL_NAME=traffic-channel
export CHAINCODE_NAME=traffic-light
export CHAINCODE_VERSION=1.2
export CHAINCODE_SEQUENCE=3
export CHAINCODE_PATH=/opt/gopath/src/github.com/chaincode/traffic-light
export CHAINCODE_LANG=node

# Change to network directory
cd ..

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}[ERROR]${NC} Network is not running!"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Network is running"

# Package chaincode
echo -e "\n${YELLOW}[1/6]${NC} Packaging chaincode v${CHAINCODE_VERSION}..."
docker exec cli peer lifecycle chaincode package ${CHAINCODE_NAME}_v${CHAINCODE_VERSION}.tar.gz \
    --path ${CHAINCODE_PATH} \
    --lang ${CHAINCODE_LANG} \
    --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

echo -e "${GREEN}[✓]${NC} Chaincode packaged"

# Install on peer0.org1
echo -e "\n${YELLOW}[2/6]${NC} Installing chaincode on peer0.org1..."
docker exec cli peer lifecycle chaincode install ${CHAINCODE_NAME}_v${CHAINCODE_VERSION}.tar.gz
echo -e "${GREEN}[✓]${NC} Installed on peer0.org1"

# Install on peer0.org2
echo -e "\n${YELLOW}[3/6]${NC} Installing chaincode on peer0.org2..."
docker exec \
    -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
    -e CORE_PEER_LOCALMSPID=Org2MSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
    cli peer lifecycle chaincode install ${CHAINCODE_NAME}_v${CHAINCODE_VERSION}.tar.gz
echo -e "${GREEN}[✓]${NC} Installed on peer0.org2"

# Get package ID
echo -e "\n${YELLOW}[4/6]${NC} Getting package ID..."
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | sed -n 's/.*Package ID: \([^,]*\).*/\1/p')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}[ERROR]${NC} Could not find package ID"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Package ID: ${PACKAGE_ID}"

# Approve for Org1
echo -e "\n${YELLOW}[5/6]${NC} Approving chaincode for Org1 and Org2..."
docker exec cli peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CHAINCODE_SEQUENCE}

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

echo -e "${GREEN}[✓]${NC} Approved by both organizations"

# Check commit readiness
echo -e "\n${YELLOW}Checking commit readiness...${NC}"
docker exec cli peer lifecycle chaincode checkcommitreadiness \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${CHAINCODE_SEQUENCE} \
    --output json

# Commit chaincode
echo -e "\n${YELLOW}[6/6]${NC} Committing upgraded chaincode..."
docker exec cli peer lifecycle chaincode commit \
    -o orderer.example.com:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME} \
    --version ${CHAINCODE_VERSION} \
    --sequence ${CHAINCODE_SEQUENCE} \
    --peerAddresses peer0.org1.example.com:7051 \
    --peerAddresses peer0.org2.example.com:9051

echo -e "${GREEN}[✓]${NC} Chaincode upgraded successfully"

# Verify deployment
echo -e "\n${YELLOW}Verifying upgrade...${NC}"
docker exec cli peer lifecycle chaincode querycommitted \
    --channelID ${CHANNEL_NAME} \
    --name ${CHAINCODE_NAME}

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Chaincode Upgraded Successfully!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Chaincode Information:${NC}"
echo "  • Name: ${CHAINCODE_NAME}"
echo "  • Version: ${CHAINCODE_VERSION}"
echo "  • Sequence: ${CHAINCODE_SEQUENCE}"
echo ""
