#!/bin/bash
# Create and join channel for traffic management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Create & Join Channel                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

export CHANNEL_NAME=traffic-channel
export FABRIC_CFG_PATH=/etc/hyperledger/fabric
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}[ERROR]${NC} Network is not running!"
    echo "Run: ./network-up.sh first"
    exit 1
fi

# Create channel
echo -e "${YELLOW}[1/4]${NC} Creating channel '${CHANNEL_NAME}'..."
docker exec cli peer channel create \
    -o orderer.example.com:7050 \
    -c $CHANNEL_NAME \
    -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.tx \
    --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to create channel"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Channel created"

# Wait a bit for channel creation to propagate
sleep 2

# Join peer0 to channel
echo -e "\n${YELLOW}[2/4]${NC} Joining peer0.org1.example.com to channel..."
docker exec cli peer channel join \
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to join peer0 to channel"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} peer0.org1.example.com joined channel"

# Join peer1 to channel
echo -e "\n${YELLOW}[3/4]${NC} Joining peer1.org1.example.com to channel..."
docker exec \
    -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 \
    -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp \
    cli peer channel join \
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

if [ "$?" -ne 0 ]; then
    echo -e "${YELLOW}[WARNING]${NC} Failed to join peer1 to channel (not critical)"
else
    echo -e "${GREEN}[✓]${NC} peer1.org1.example.com joined channel"
fi

# Update anchor peers (optional)
echo -e "\n${YELLOW}[4/4]${NC} Updating anchor peers..."
if [ -f "../channel-artifacts/Org1MSPanchors.tx" ]; then
    docker exec cli peer channel update \
        -o orderer.example.com:7050 \
        -c $CHANNEL_NAME \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx
    
    if [ "$?" -ne 0 ]; then
        echo -e "${YELLOW}[WARNING]${NC} Failed to update anchor peers (optional)"
    else
        echo -e "${GREEN}[✓]${NC} Anchor peers updated"
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} Anchor peers file not found"
fi

# List channels
echo -e "\n${YELLOW}Verifying channel membership:${NC}"
docker exec cli peer channel list

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Channel Created & Joined Successfully!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Channel Information:${NC}"
echo "  • Channel Name: ${CHANNEL_NAME}"
echo "  • Peers Joined: peer0, peer1"
echo "  • Status: Active"
echo ""
echo -e "${YELLOW}Next Step:${NC} Deploy chaincode with ${GREEN}./deploy-chaincode.sh${NC}"
echo ""
