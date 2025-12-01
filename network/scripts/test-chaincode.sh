#!/bin/bash
# Test traffic light chaincode functions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHANNEL_NAME=traffic-channel
CHAINCODE_NAME=traffic-light

# Helper function to invoke chaincode as Org1
invoke_org1() {
    docker exec cli peer chaincode invoke \
        -o orderer.example.com:7050 \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        --peerAddresses peer0.org1.example.com:7051 \
        --peerAddresses peer0.org2.example.com:9051 \
        -c "$1" \
        --waitForEvent
}

# Helper function to invoke chaincode as Org2 (Emergency Services)
invoke_org2() {
    docker exec \
        -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 \
        -e CORE_PEER_LOCALMSPID=Org2MSP \
        -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp \
        cli peer chaincode invoke \
        -o orderer.example.com:7050 \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        --peerAddresses peer0.org1.example.com:7051 \
        --peerAddresses peer0.org2.example.com:9051 \
        -c "$1" \
        --waitForEvent
}

# Helper function to query chaincode
query() {
    docker exec cli peer chaincode query \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        -c "$1"
}

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Test Traffic Light Chaincode                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

case "$1" in
    init)
        echo -e "${YELLOW}[TEST]${NC} Initializing ledger..."
        invoke_org1 '{"function":"initLedger","Args":[]}'
        echo -e "${GREEN}[✓]${NC} Ledger initialized"
        ;;
    
    query-intersections)
        echo -e "${YELLOW}[TEST]${NC} Querying all intersections..."
        query '{"function":"getAllIntersections","Args":[]}'
        ;;
    
    query-lights)
        echo -e "${YELLOW}[TEST]${NC} Querying all traffic lights..."
        query '{"function":"getAllTrafficLights","Args":[]}'
        ;;
    
    get-intersection)
        if [ -z "$2" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 get-intersection <INTERSECTION_ID>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Getting intersection $2..."
        query "{\"function\":\"getIntersection\",\"Args\":[\"$2\"]}"
        ;;
    
    get-light)
        if [ -z "$2" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 get-light <LIGHT_ID>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Getting traffic light $2..."
        query "{\"function\":\"getTrafficLight\",\"Args\":[\"$2\"]}"
        ;;
    
    create-intersection)
        if [ -z "$4" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 create-intersection <ID> <NAME> <LAT> <LNG>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Creating intersection $2..."
        invoke_org1 "{\"function\":\"createIntersection\",\"Args\":[\"$2\",\"$3\",\"$4\",\"$5\"]}"
        echo -e "${GREEN}[✓]${NC} Intersection created"
        ;;
    
    update-signal)
        if [ -z "$4" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 update-signal <LIGHT_ID> <STATE> <REASON>"
            echo "  States: RED, YELLOW, GREEN"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Updating signal $2 to $3..."
        invoke_org1 "{\"function\":\"updateSignalState\",\"Args\":[\"$2\",\"$3\",\"$4\"]}"
        echo -e "${GREEN}[✓]${NC} Signal updated"
        ;;
    
    update-density)
        if [ -z "$5" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 update-density <LIGHT_ID> <VEHICLE_COUNT> <DENSITY> <WAIT_TIME>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Updating density for $2..."
        invoke_org1 "{\"function\":\"updateTrafficDensity\",\"Args\":[\"$2\",\"$3\",\"$4\",\"$5\"]}"
        echo -e "${GREEN}[✓]${NC} Density updated"
        ;;
    
    sync)
        if [ -z "$2" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 sync <INTERSECTION_ID>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Syncing intersection $2..."
        invoke_org1 "{\"function\":\"syncIntersection\",\"Args\":[\"$2\"]}"
        echo -e "${GREEN}[✓]${NC} Intersection synced"
        ;;
    
    emergency)
        if [ -z "$4" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 emergency <INTERSECTION_ID> <DIRECTION> <VEHICLE_TYPE>"
            echo "  Directions: NORTH, SOUTH, EAST, WEST"
            echo "  Vehicle Types: AMBULANCE, FIRE, POLICE"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Triggering emergency at $2 (Org2 required)..."
        invoke_org2 "{\"function\":\"triggerEmergency\",\"Args\":[\"$2\",\"$3\",\"$4\"]}"
        echo -e "${GREEN}[✓]${NC} Emergency triggered"
        ;;
    
    clear-emergency)
        if [ -z "$2" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 clear-emergency <INTERSECTION_ID>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Clearing emergency at $2 (Org2 required)..."
        invoke_org2 "{\"function\":\"clearEmergency\",\"Args\":[\"$2\"]}"
        echo -e "${GREEN}[✓]${NC} Emergency cleared"
        ;;
    
    decisions)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}[TEST]${NC} Querying all decisions..."
            query '{"function":"getAllDecisions","Args":[]}'
        else
            echo -e "${YELLOW}[TEST]${NC} Querying decisions for $2..."
            query "{\"function\":\"getDecisionHistory\",\"Args\":[\"$2\"]}"
        fi
        ;;
    
    history)
        if [ -z "$2" ]; then
            echo -e "${RED}[ERROR]${NC} Usage: $0 history <ASSET_ID>"
            exit 1
        fi
        echo -e "${YELLOW}[TEST]${NC} Getting history for $2..."
        query "{\"function\":\"getAssetHistory\",\"Args\":[\"$2\"]}"
        ;;
    
    test)
        echo -e "${BLUE}Running full test suite...${NC}"
        echo ""
        
        # Initialize
        echo -e "${YELLOW}1. Initialize Ledger${NC}"
        invoke_org1 '{"function":"initLedger","Args":[]}'
        sleep 2
        
        # Query intersections
        echo -e "\n${YELLOW}2. Query All Intersections${NC}"
        query '{"function":"getAllIntersections","Args":[]}'
        
        # Query lights
        echo -e "\n${YELLOW}3. Query All Traffic Lights${NC}"
        query '{"function":"getAllTrafficLights","Args":[]}'
        
        # Update density
        echo -e "\n${YELLOW}4. Update Traffic Density${NC}"
        invoke_org1 '{"function":"updateTrafficDensity","Args":["INT-001-NORTH","15","0.6","45"]}'
        sleep 2
        
        # Update signal
        echo -e "\n${YELLOW}5. Update Signal State (GREEN to YELLOW)${NC}"
        invoke_org1 '{"function":"updateSignalState","Args":["INT-001-NORTH","YELLOW","High density detected"]}'
        sleep 2
        
        # Sync intersection
        echo -e "\n${YELLOW}6. Sync Intersection${NC}"
        invoke_org1 '{"function":"syncIntersection","Args":["INT-001"]}'
        sleep 2
        
        # Trigger emergency (Org2)
        echo -e "\n${YELLOW}7. Trigger Emergency (Org2)${NC}"
        invoke_org2 '{"function":"triggerEmergency","Args":["INT-001","NORTH","AMBULANCE"]}'
        sleep 2
        
        # Clear emergency (Org2)
        echo -e "\n${YELLOW}8. Clear Emergency (Org2)${NC}"
        invoke_org2 '{"function":"clearEmergency","Args":["INT-001"]}'
        sleep 2
        
        # Query decisions
        echo -e "\n${YELLOW}9. Query Decision History${NC}"
        query '{"function":"getDecisionHistory","Args":["INT-001"]}'
        
        echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║          All Tests Completed Successfully!             ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
        ;;
    
    *)
        echo -e "${YELLOW}Usage:${NC} $0 <command> [args]"
        echo ""
        echo -e "${BLUE}Initialization:${NC}"
        echo "  init                              Initialize ledger with sample data"
        echo ""
        echo -e "${BLUE}Query Commands:${NC}"
        echo "  query-intersections               Get all intersections"
        echo "  query-lights                      Get all traffic lights"
        echo "  get-intersection <ID>             Get specific intersection"
        echo "  get-light <ID>                    Get specific traffic light"
        echo "  decisions [INTERSECTION_ID]       Get decision history"
        echo "  history <ASSET_ID>                Get asset change history"
        echo ""
        echo -e "${BLUE}Traffic Control (Org1):${NC}"
        echo "  create-intersection <ID> <NAME> <LAT> <LNG>"
        echo "  update-signal <LIGHT_ID> <STATE> <REASON>"
        echo "  update-density <LIGHT_ID> <COUNT> <DENSITY> <WAIT>"
        echo "  sync <INTERSECTION_ID>"
        echo ""
        echo -e "${BLUE}Emergency Control (Org2 only):${NC}"
        echo "  emergency <INTERSECTION_ID> <DIRECTION> <VEHICLE_TYPE>"
        echo "  clear-emergency <INTERSECTION_ID>"
        echo ""
        echo -e "${BLUE}Full Test:${NC}"
        echo "  test                              Run complete test suite"
        echo ""
        ;;
esac
