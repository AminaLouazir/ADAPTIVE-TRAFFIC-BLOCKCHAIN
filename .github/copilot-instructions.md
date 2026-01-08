# Adaptive Traffic Blockchain - AI Agent Instructions

## Project Overview
Smart city blockchain system using **Hyperledger Fabric v2.5** for adaptive traffic light coordination. Two organizations: **Org1** (traffic management) and **Org2** (emergency services). Features experimental **cellular automaton (CA) hash functions** that adapt to traffic conditions.

## Architecture

### Dual-Language Implementation
- **JavaScript chaincode** (`chaincode/traffic-light/lib/`) - production smart contract on Fabric
- **Python implementation** (`chaincode/traffic-light/hash/`) - research/testing of CA hash algorithms
- Both implementations must stay synchronized for hash algorithm behavior

### Key Components
1. **Hyperledger Fabric Network** (`network/`)
   - 2 orgs, 1 orderer, 2 peers
   - Channel: `traffic-channel`
   - Pre-generated crypto material in `crypto-config/`
2. **Traffic Light Chaincode** (`chaincode/traffic-light/`)
   - Smart contract in JavaScript (Node.js >=18 required)
   - Main entry: `index.js` exports `TrafficLightContract`
3. **Simulator** (`simulator/`)
   - Node.js backend with Fabric SDK integration
   - WebSocket server for real-time updates
4. **Visualization** (`visualization/`)
   - Frontend dashboard for monitoring

## Critical Workflows

### Deployment Sequence (MUST follow this order)
```bash
# 1. Install chaincode dependencies (on HOST, not in container)
cd chaincode/traffic-light && npm install

# 2. Start Fabric network
cd network && ./scripts/network-up.sh

# 3. Create channel and join peers
cd scripts && ./create-channel.sh

# 4. Deploy chaincode (packages, installs, approves, commits)
cd .. && ./scripts/deploy-chaincode.sh

# 5. Initialize ledger with sample data
cd scripts && ./test-chaincode.sh init
```

### Testing Chaincode
```bash
# Query all intersections
./test-chaincode.sh query-intersections

# Test emergency vehicle (uses Org2 endorsement)
./test-chaincode.sh emergency <LIGHT_ID>

# Update traffic light state (requires BOTH org endorsements)
./test-chaincode.sh change-state <LIGHT_ID> <NEW_STATE>
```

### Hash Function Testing (Python)
```bash
# Quick test of CA hash
python3 chaincode/traffic-light/quick_test.py

# Full benchmarking and analysis
python3 chaincode/traffic-light/hash/hash_analysis.py
```

## Code Conventions

### Endorsement Policy
**CRITICAL**: All chaincode transactions require endorsement from **BOTH** Org1 and Org2. When invoking:
```bash
--peerAddresses peer0.org1.example.com:7051 \
--peerAddresses peer0.org2.example.com:9051
```

### Transaction Determinism
- **Always** use `ctx.stub.getTxTimestamp()` for timestamps in chaincode (see `_getTxTimestamp()` in [trafficLightContract.js](../chaincode/traffic-light/lib/trafficLightContract.js#L45-L52))
- **Never** use `Date.now()` or `new Date()` - non-deterministic across peers

### Traffic-Adaptive Hash Functions
Three hash implementations in [cellularAutomaton.js](../chaincode/traffic-light/lib/cellularAutomaton.js):
1. **CA Hash** (`trafficAdaptiveHash`) - rule adapts by density/state
2. **Chaotic Hash** (`chaoticTrafficHash`) - logistic/tent maps
3. **Hybrid Hash** (`hybridTrafficHash`) - combines both

**Rule selection logic** (from Python/JS):
- Low density + GREEN → Rule 30 (chaotic, fast)
- Medium density + YELLOW → Rule 110 (Turing-complete)
- High density + RED → Rule 110 (controlled)
- EMERGENCY → Rule 184 (traffic flow simulation)

### State Transitions
Valid transitions enforced in `getNextValidState()`:
- GREEN → YELLOW only
- YELLOW → RED only  
- RED → GREEN only
- EMERGENCY bypasses all rules (Org2 privilege)

## Integration Points

### Fabric SDK Client Pattern
See [simulator/fabric-client.js](../simulator/fabric-client.js) for production SDK usage:
1. Load connection profile from `network/connection-org1.json`
2. Create wallet, import identities
3. Gateway pattern for transaction submission
4. Contract event listeners for real-time updates

### Emergency Mode (Org2)
When emergency vehicles detected, simulator switches to Org2 client with MSP `Org2MSP`. Emergency functions in chaincode check `ctx.clientIdentity.getMSPID() === 'Org2MSP'`.

## File Locations

### Models
All domain models in `chaincode/traffic-light/lib/models/`:
- [trafficLight.js](../chaincode/traffic-light/lib/models/trafficLight.js) - SignalState, Direction enums
- [intersection.js](../chaincode/traffic-light/lib/models/intersection.js) - manages 4 lights (N/S/E/W)
- [decision.js](../chaincode/traffic-light/lib/models/decision.js) - immutable decision records

### Network Scripts
All in `network/scripts/`:
- `generate-artifacts.sh` - regenerate crypto/channel artifacts (rarely needed)
- `network-up.sh` / `network-down.sh` - start/stop Docker containers
- `deploy-chaincode.sh` - full chaincode lifecycle
- `upgrade-chaincode.sh` - for version bumps

## Common Issues

### "Chaincode install failed"
Ensure `chaincode/traffic-light/node_modules` exists (run `npm install` on HOST before deploying)

### "Endorsement policy not satisfied"
Check both peers are responding. Invoke must specify both peer addresses.

### "CouchDB state mismatch"
Ledger uses simple key-value (not CouchDB rich queries). All queries iterate keys with prefix matching.

### Docker volume conflicts
After crypto regeneration, run `docker-compose down -v` to clear old volumes before `network-up.sh`.

## Development Notes

- **Chaincode versioning**: Bump `CHAINCODE_VERSION` in [deploy-chaincode.sh](../network/scripts/deploy-chaincode.sh#L16) and increment `CHAINCODE_SEQUENCE` for upgrades
- **Port mapping**: Peer0.org1:7051, Peer0.org2:9051, Orderer:7050, Simulator:3000
- **Logs**: `docker logs -f peer0.org1.example.com` for chaincode container logs
- **CLI container**: Pre-configured admin environment for peer commands via `docker exec cli`

## Academic Context
Master IASD - Blockchain course. Implements Atelier 2 requirements:
- Q1-3: CA hash implementation in Python
- Q4-11: Performance benchmarks, avalanche tests, bit distribution
- Q12: Integration with Fabric chaincode (JavaScript port)

When modifying hash algorithms, update **both** Python (for testing) and JavaScript (for production chaincode).
