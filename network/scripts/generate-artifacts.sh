#!/bin/bash
# Generate cryptographic materials and genesis block for Fabric network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Generate Network Artifacts Script                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Change to network directory
cd ..

# Set environment variables
export PATH=$PATH:$HOME/fabric-samples/bin
export FABRIC_CFG_PATH=${PWD}

# Check if binaries exist
if ! command -v cryptogen &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} cryptogen not found. Make sure Fabric binaries are in PATH"
    echo "Run: export PATH=\$PATH:\$HOME/fabric-samples/bin"
    exit 1
fi

if ! command -v configtxgen &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} configtxgen not found. Make sure Fabric binaries are in PATH"
    exit 1
fi

# Clean previous artifacts
echo -e "${YELLOW}[1/4]${NC} Cleaning previous artifacts..."
rm -rf crypto-config
rm -rf channel-artifacts
mkdir -p channel-artifacts

echo -e "${GREEN}[✓]${NC} Cleaned previous artifacts"

# Generate crypto materials using cryptogen
echo -e "\n${YELLOW}[2/4]${NC} Generating crypto materials (certificates and keys)..."
cryptogen generate --config=./crypto-config.yaml

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to generate crypto materials"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Crypto materials generated"

# Generate genesis block for orderer
echo -e "\n${YELLOW}[3/4]${NC} Generating genesis block..."
configtxgen -profile TrafficOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to generate genesis block"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Genesis block generated"

# Generate channel configuration transaction
export CHANNEL_NAME=traffic-channel
echo -e "\n${YELLOW}[4/4]${NC} Generating channel configuration for '${CHANNEL_NAME}'..."
configtxgen -profile TrafficChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME

if [ "$?" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to generate channel configuration"
    exit 1
fi

echo -e "${GREEN}[✓]${NC} Channel configuration generated"

# Generate anchor peer update for Org1
echo -e "\n${YELLOW}[OPTIONAL]${NC} Generating anchor peer update for Org1MSP..."
configtxgen -profile TrafficChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP 2>/dev/null

if [ "$?" -ne 0 ]; then
    echo -e "${YELLOW}[WARNING]${NC} Failed to generate anchor peer update (optional - not critical)"
else
    echo -e "${GREEN}[✓]${NC} Anchor peer update generated"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        All Artifacts Generated Successfully!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Generated Files:${NC}"
echo "  • Crypto materials: crypto-config/"
echo "  • Genesis block: channel-artifacts/genesis.block"
echo "  • Channel tx: channel-artifacts/traffic-channel.tx"
echo "  • Anchor peers: channel-artifacts/Org1MSPanchors.tx"
echo ""
echo -e "${YELLOW}Next Step:${NC} Run ${GREEN}./network-up.sh${NC} to start the network"
echo ""
