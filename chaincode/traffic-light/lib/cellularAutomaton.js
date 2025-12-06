/**
 * Traffic-Adaptive Cellular Automaton Hash Functions
 * Ported from Python to JavaScript for Hyperledger Fabric Chaincode
 * 
 * TWO INNOVATIVE HASH FUNCTIONS:
 * 
 * 1. CELLULAR AUTOMATON HASH (trafficAdaptiveHash)
 *    - Rule dynamically adapts based on traffic conditions
 *    - Neighborhood size varies with signal state
 *    - Evolution steps depend on congestion level
 * 
 * 2. CHAOTIC MAP HASH (chaoticTrafficHash)
 *    - Uses Logistic Map and Tent Map chaos functions
 *    - Traffic density controls chaos parameters
 *    - High sensitivity to initial conditions
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain
 * @professor Pr. Ikram BEN ABDEL OUAHAB
 */

'use strict';

const crypto = require('crypto');

// ============================================================================
// HASH FUNCTION 1: CELLULAR AUTOMATON (CA) BASED
// ============================================================================

/**
 * Traffic-Adaptive Cellular Automaton
 * Adapts behavior based on traffic conditions
 */
class TrafficAdaptiveCA {
    /**
     * Initialize Traffic-Adaptive Cellular Automaton
     * @param {number} size - Number of cells (default 256 for 256-bit hash)
     */
    constructor(size = 256) {
        this.size = size;
        this.state = new Array(size).fill(0);
        this.rule = 30;  // Default, will be adapted
        this.neighborhoodRadius = 1;  // Will adapt based on traffic
    }

    /**
     * Initialize CA state from input data + traffic density
     * Question 1.1 (Atelier 2): Initialize state with traffic-aware seeding
     * 
     * @param {Buffer} data - Input data bytes
     * @param {number} trafficDensity - Traffic density (0.0 = empty, 1.0 = congested)
     */
    initState(data, trafficDensity = 0.5) {
        // Convert bytes to bits
        const bits = [];
        for (const byte of data) {
            for (let i = 7; i >= 0; i--) {
                bits.push((byte >> i) & 1);
            }
        }

        // Traffic-aware padding: Higher density = more complex pattern
        if (bits.length < this.size) {
            const densitySeed = Math.floor(trafficDensity * 255);
            const padData = Buffer.concat([data, Buffer.from([densitySeed])]);
            const padGenerator = crypto.createHash('sha256').update(padData).digest();

            const padBits = [];
            for (const byte of padGenerator) {
                for (let i = 7; i >= 0; i--) {
                    padBits.push((byte >> i) & 1);
                }
            }

            // Repeat padding to fill state
            const needed = this.size - bits.length;
            for (let i = 0; i < needed; i++) {
                bits.push(padBits[i % padBits.length]);
            }
        }

        this.state = bits.slice(0, this.size);
    }

    /**
     * Dynamically select CA rule based on traffic conditions
     * INNOVATION: Traffic-aware rule selection
     * 
     * Rules mapping:
     * - LOW density (0.0-0.3) + GREEN → Rule 30 (chaotic, fast flow)
     * - MEDIUM density (0.3-0.7) + YELLOW → Rule 90 (balanced, XOR-based)
     * - HIGH density (0.7-1.0) + RED → Rule 110 (complex, controlled)
     * - Emergency states → Rule 184 (traffic flow model)
     * 
     * @param {number} density - Traffic density (0.0-1.0)
     * @param {string} signalState - RED, YELLOW, GREEN, or EMERGENCY
     * @returns {number} CA rule number (0-255)
     */
    selectTrafficRule(density, signalState) {
        // Emergency override
        if (signalState === 'EMERGENCY') {
            return 184;  // Rule 184 simulates traffic flow
        }

        // Density-based rule selection
        if (density < 0.3) {
            // Low traffic - use chaotic rule for randomness
            if (signalState === 'GREEN') {
                return 30;  // Rule 30: chaotic, good mixing
            } else {
                return 90;  // Rule 90: simple XOR
            }
        } else if (density < 0.7) {
            // Medium traffic - balanced complexity
            if (signalState === 'YELLOW') {
                return 110;  // Rule 110: Turing-complete
            } else {
                return 90;  // Rule 90: deterministic
            }
        } else {
            // High traffic - controlled evolution
            if (signalState === 'RED') {
                return 110;  // Rule 110: complex but controlled
            } else {
                return 184;  // Rule 184: traffic flow simulation
            }
        }
    }

    /**
     * Adapt neighborhood radius based on signal state
     * Controls HOW MANY CELLS each cell looks at when evolving
     * 
     * Mapping:
     * - GREEN → r=1 (local interactions, 3 cells total)
     * - YELLOW → r=2 (medium range, 5 cells total)
     * - RED → r=3 (wide area coordination, 7 cells total)
     * - EMERGENCY → r=5 (city-wide propagation, 11 cells total)
     * 
     * @param {string} signalState - Traffic light color
     * @returns {number} Neighborhood radius
     */
    adaptNeighborhood(signalState) {
        switch (signalState) {
            case 'GREEN':
                return 1;  // Local only
            case 'YELLOW':
                return 2;  // Medium coordination
            case 'RED':
                return 3;  // Wide area
            case 'EMERGENCY':
                return 5;  // Maximum coordination
            default:
                return 1;  // Default
        }
    }

    /**
     * Apply CA rule with configurable neighborhood radius
     * Question 1.2 (Atelier 2): Evolution with variable neighborhood
     * 
     * @param {number} rule - CA rule number (0-255)
     * @param {number} radius - Neighborhood radius (1, 2, 3, etc.)
     */
    evolve(rule, radius = 1) {
        const newState = new Array(this.size).fill(0);

        for (let i = 0; i < this.size; i++) {
            // Get extended neighborhood
            const neighborhoodBits = [];
            for (let offset = -radius; offset <= radius; offset++) {
                const idx = (i + offset + this.size) % this.size;
                neighborhoodBits.push(this.state[idx]);
            }

            // Calculate neighborhood configuration
            let neighborhoodValue = 0;
            for (const bit of neighborhoodBits) {
                neighborhoodValue = (neighborhoodValue << 1) | bit;
            }

            // Apply rule
            if (radius === 1) {
                // Standard rule application for 3-cell neighborhood
                newState[i] = (rule >> neighborhoodValue) & 1;
            } else {
                // Extended neighborhood: use hash-based rule
                const extendedRule = rule ^ (neighborhoodValue % 256);
                const bitPosition = neighborhoodValue % 8;
                newState[i] = (extendedRule >> bitPosition) & 1;
            }
        }

        this.state = newState;
    }

    /**
     * Calculate evolution steps based on traffic urgency
     * More traffic = more evolution steps = more security
     * 
     * @param {number} density - Traffic density (0.0-1.0)
     * @param {number} urgency - Urgency level (0-10)
     * @returns {number} Number of evolution steps
     */
    calculateEvolutionSteps(density, urgency = 0) {
        const baseSteps = 64;
        
        // Density affects steps: more traffic = more evolution
        const densityFactor = Math.floor(density * 64);
        
        // Urgency adds extra mixing for security
        const urgencyFactor = urgency * 10;
        
        const totalSteps = baseSteps + densityFactor + urgencyFactor;
        
        // Cap at reasonable maximum
        return Math.min(totalSteps, 256);
    }

    /**
     * Extract 256-bit hash from CA state
     * Question 2.3 (Atelier 2): Produce fixed 256-bit hash
     * 
     * @returns {Buffer} 32 bytes (256 bits) representing the hash
     */
    getHash() {
        const hashBytes = Buffer.alloc(32);  // 256 bits = 32 bytes

        for (let i = 0; i < 32; i++) {
            let byteVal = 0;
            for (let j = 0; j < 8; j++) {
                const bitIdx = i * 8 + j;
                if (bitIdx < this.state.length) {
                    byteVal |= this.state[bitIdx] << (7 - j);
                }
            }
            hashBytes[i] = byteVal;
        }

        return hashBytes;
    }
}

/**
 * Main Traffic-Adaptive CA Hash Function
 * Question 2.1 (Atelier 2): Implementation of traffic-specific ac_hash
 * 
 * This hash function adapts its behavior based on real traffic conditions:
 * - Light traffic (GREEN) → Fast, simple hashing
 * - Heavy traffic (RED) → Complex, secure hashing
 * - Emergency → Maximum security
 * 
 * @param {string} inputData - Data to hash
 * @param {number} trafficDensity - Current traffic density (0.0-1.0)
 * @param {string} signalState - Current signal state (RED/YELLOW/GREEN/EMERGENCY)
 * @param {number} urgency - Urgency level (0-10)
 * @returns {string} 256-bit hash as hexadecimal string (64 characters)
 */
function trafficAdaptiveHash(inputData, trafficDensity = 0.5, signalState = 'GREEN', urgency = 0) {
    // Question 2.2 (Atelier 2): Convert text to bytes
    const data = Buffer.from(inputData, 'utf8');

    // Create CA instance
    const ca = new TrafficAdaptiveCA(256);

    // Initialize with traffic-aware seeding
    ca.initState(data, trafficDensity);

    // Select rule based on traffic conditions
    const rule = ca.selectTrafficRule(trafficDensity, signalState);

    // Adapt neighborhood size
    const radius = ca.adaptNeighborhood(signalState);

    // Calculate evolution steps
    const steps = ca.calculateEvolutionSteps(trafficDensity, urgency);

    // Evolve CA
    for (let i = 0; i < steps; i++) {
        ca.evolve(rule, radius);
    }

    // Extract hash
    const hashBytes = ca.getHash();

    return hashBytes.toString('hex');
}

// ============================================================================
// HASH FUNCTION 2: CHAOTIC MAP BASED
// ============================================================================

/**
 * Chaotic Traffic Hash using Logistic Map and Tent Map
 * 
 * INNOVATION: Uses chaos theory for unpredictable but deterministic hashing
 * - Logistic Map: x_{n+1} = r * x_n * (1 - x_n)
 * - Tent Map: x_{n+1} = μ * min(x_n, 1 - x_n)
 * 
 * Traffic conditions control chaos parameters:
 * - Density affects the 'r' parameter (chaos level)
 * - Signal state selects which chaotic map to use
 * - Vehicle count determines number of iterations
 */
class ChaoticTrafficHash {
    /**
     * Initialize Chaotic Hash Generator
     * @param {number} outputSize - Hash output size in bits (default 256)
     */
    constructor(outputSize = 256) {
        this.outputSize = outputSize;
        this.state = new Array(outputSize).fill(0);
    }

    /**
     * Logistic Map - Classic chaos function
     * Exhibits chaotic behavior when r is between 3.57 and 4.0
     * 
     * @param {number} x - Current value (0-1)
     * @param {number} r - Control parameter (3.57-4.0 for chaos)
     * @returns {number} Next value
     */
    logisticMap(x, r) {
        return r * x * (1 - x);
    }

    /**
     * Tent Map - Another chaotic function
     * Chaotic for μ > 1
     * 
     * @param {number} x - Current value (0-1)
     * @param {number} mu - Control parameter (1-2)
     * @returns {number} Next value
     */
    tentMap(x, mu) {
        if (x < 0.5) {
            return mu * x;
        } else {
            return mu * (1 - x);
        }
    }

    /**
     * Henon Map - 2D chaotic system
     * Creates complex patterns from simple equations
     * 
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} a - Parameter a (typically 1.4)
     * @param {number} b - Parameter b (typically 0.3)
     * @returns {Object} New {x, y} coordinates
     */
    henonMap(x, y, a = 1.4, b = 0.3) {
        const newX = 1 - a * x * x + y;
        const newY = b * x;
        return { x: newX, y: newY };
    }

    /**
     * Select chaos parameters based on traffic density
     * Higher density = more chaotic behavior
     * 
     * @param {number} density - Traffic density (0.0-1.0)
     * @returns {Object} Chaos parameters {r, mu, iterations}
     */
    selectChaosParams(density) {
        // r parameter for logistic map: 3.57 (edge of chaos) to 4.0 (full chaos)
        const r = 3.57 + (density * 0.43);
        
        // mu parameter for tent map: 1.5 to 2.0
        const mu = 1.5 + (density * 0.5);
        
        // More iterations for higher density
        const iterations = 100 + Math.floor(density * 156);
        
        return { r, mu, iterations };
    }

    /**
     * Initialize chaos state from input data
     * 
     * @param {Buffer} data - Input data
     * @param {number} density - Traffic density
     * @returns {number} Initial x value between 0 and 1
     */
    initFromData(data, density) {
        // Create initial seed from data hash
        const sha = crypto.createHash('sha256').update(data).digest();
        
        // Convert first 8 bytes to a number between 0 and 1
        let seed = 0;
        for (let i = 0; i < 8; i++) {
            seed += sha[i] / Math.pow(256, i + 1);
        }
        
        // Ensure seed is in valid range (0.1 - 0.9 to avoid fixed points)
        seed = 0.1 + (seed * 0.8);
        
        // Mix with density for traffic-awareness
        seed = (seed + density) / 2;
        
        return seed;
    }

    /**
     * Generate hash using combined chaotic maps
     * 
     * @param {Buffer} data - Input data
     * @param {number} density - Traffic density
     * @param {string} signalState - Signal state for map selection
     * @returns {Buffer} Hash bytes
     */
    generateHash(data, density, signalState) {
        const params = this.selectChaosParams(density);
        let x = this.initFromData(data, density);
        let y = this.initFromData(Buffer.concat([data, Buffer.from('y')]), density);
        
        const chaosSequence = [];
        
        // Generate chaotic sequence
        for (let i = 0; i < params.iterations; i++) {
            // Select map based on signal state and iteration
            switch (signalState) {
                case 'GREEN':
                    // Use logistic map (fast, simple chaos)
                    x = this.logisticMap(x, params.r);
                    break;
                    
                case 'YELLOW':
                    // Alternate between logistic and tent map
                    if (i % 2 === 0) {
                        x = this.logisticMap(x, params.r);
                    } else {
                        x = this.tentMap(x, params.mu);
                    }
                    break;
                    
                case 'RED':
                    // Use Henon map for 2D chaos (more complex)
                    const henon = this.henonMap(x, y);
                    x = Math.abs(henon.x) % 1;
                    y = Math.abs(henon.y) % 1;
                    break;
                    
                case 'EMERGENCY':
                    // Use all maps combined for maximum unpredictability
                    x = this.logisticMap(x, params.r);
                    x = this.tentMap(x, params.mu);
                    const h = this.henonMap(x, y);
                    y = Math.abs(h.y) % 1;
                    x = Math.abs(h.x + x) % 1;
                    break;
                    
                default:
                    x = this.logisticMap(x, params.r);
            }
            
            // Collect value for hash
            chaosSequence.push(x);
        }
        
        // Convert chaotic sequence to hash bytes
        const hashBytes = Buffer.alloc(this.outputSize / 8);
        
        for (let i = 0; i < hashBytes.length; i++) {
            // Use multiple chaos values to generate each byte
            const idx1 = i % chaosSequence.length;
            const idx2 = (i * 7) % chaosSequence.length;
            const idx3 = (i * 13) % chaosSequence.length;
            
            const combined = (chaosSequence[idx1] + chaosSequence[idx2] + chaosSequence[idx3]) / 3;
            hashBytes[i] = Math.floor(combined * 256) % 256;
        }
        
        // Final mixing with XOR of original data hash
        const dataHash = crypto.createHash('sha256').update(data).digest();
        for (let i = 0; i < hashBytes.length; i++) {
            hashBytes[i] ^= dataHash[i % dataHash.length];
        }
        
        return hashBytes;
    }
}

/**
 * Chaotic Traffic Hash Function (2nd innovative hash)
 * Uses chaos theory (Logistic Map, Tent Map, Henon Map)
 * 
 * Properties:
 * - Deterministic but highly sensitive to initial conditions
 * - Small input change = completely different output
 * - Traffic-adaptive chaos parameters
 * 
 * @param {string} inputData - Data to hash
 * @param {number} trafficDensity - Traffic density (0.0-1.0)
 * @param {string} signalState - Signal state (RED/YELLOW/GREEN/EMERGENCY)
 * @returns {string} 256-bit hash as hex string
 */
function chaoticTrafficHash(inputData, trafficDensity = 0.5, signalState = 'GREEN') {
    const data = Buffer.from(inputData, 'utf8');
    const chaotic = new ChaoticTrafficHash(256);
    const hashBytes = chaotic.generateHash(data, trafficDensity, signalState);
    return hashBytes.toString('hex');
}

// ============================================================================
// COMBINED/HYBRID HASH FUNCTION
// ============================================================================

/**
 * Hybrid Hash combining both CA and Chaotic approaches
 * Maximum security through diversity of methods
 * 
 * @param {string} inputData - Data to hash
 * @param {number} trafficDensity - Traffic density (0.0-1.0)
 * @param {string} signalState - Signal state
 * @param {number} urgency - Urgency level (0-10)
 * @returns {string} Combined 256-bit hash as hex string
 */
function hybridTrafficHash(inputData, trafficDensity = 0.5, signalState = 'GREEN', urgency = 0) {
    // Get both hashes
    const caHash = trafficAdaptiveHash(inputData, trafficDensity, signalState, urgency);
    const chaoticHash = chaoticTrafficHash(inputData, trafficDensity, signalState);
    
    // XOR combine them for maximum security
    const combined = Buffer.alloc(32);
    const caBuf = Buffer.from(caHash, 'hex');
    const chaoticBuf = Buffer.from(chaoticHash, 'hex');
    
    for (let i = 0; i < 32; i++) {
        combined[i] = caBuf[i] ^ chaoticBuf[i];
    }
    
    return combined.toString('hex');
}

// ============================================================================
// INTERSECTION AND BLOCK HASH FUNCTIONS
// ============================================================================

/**
 * Hash function specifically for traffic intersection state
 * Combines multiple traffic factors
 * 
 * @param {string} intersectionId - Unique intersection identifier
 * @param {number} timestamp - Unix timestamp
 * @param {Object} signalStates - Dict of signal states per direction
 * @param {Object} vehicleCounts - Dict of vehicle counts per direction
 * @param {number} weatherFactor - Weather impact on flow (0.0-1.0)
 * @returns {string} 256-bit hash as hex string
 */
function intersectionHash(intersectionId, timestamp, signalStates, vehicleCounts, weatherFactor = 1.0) {
    // Calculate average density
    const totalVehicles = Object.values(vehicleCounts).reduce((a, b) => a + b, 0);
    const avgDensity = Math.min(totalVehicles / 40.0, 1.0);  // Assume max 40 vehicles

    // Adjust density for weather
    const adjustedDensity = Math.min(avgDensity * weatherFactor, 1.0);

    // Determine overall signal state (most restrictive)
    let overallState = 'GREEN';
    if (Object.values(signalStates).includes('RED')) {
        overallState = 'RED';
    } else if (Object.values(signalStates).includes('YELLOW')) {
        overallState = 'YELLOW';
    }

    // Construct input data
    const inputData = `${intersectionId}|${timestamp}|${JSON.stringify(signalStates)}|${JSON.stringify(vehicleCounts)}|${weatherFactor}`;

    // Calculate urgency (high vehicle count = high urgency)
    const urgency = Math.min(Math.floor(totalVehicles / 4), 10);

    // Generate hash
    return trafficAdaptiveHash(inputData, adjustedDensity, overallState, urgency);
}

/**
 * Block hashing adapted for traffic blockchain
 * Question 3.2 (Atelier 2): Modified mining with ac_hash
 * 
 * @param {number} blockIndex - Block number
 * @param {string} previousHash - Hash of previous block
 * @param {number} timestamp - Block timestamp
 * @param {Array} transactions - List of transactions
 * @param {number} nonce - Mining nonce
 * @param {number} networkCongestion - Overall network traffic (0.0-1.0)
 * @returns {string} Block hash as hex string
 */
function blockHashWithTraffic(blockIndex, previousHash, timestamp, transactions, nonce, networkCongestion = 0.5) {
    // Serialize block data
    const txData = transactions.map(tx => JSON.stringify(tx)).join('|');
    const blockData = `${blockIndex}|${previousHash}|${timestamp}|${txData}|${nonce}`;

    // Determine signal state based on congestion
    let state;
    if (networkCongestion < 0.3) {
        state = 'GREEN';
    } else if (networkCongestion < 0.7) {
        state = 'YELLOW';
    } else {
        state = 'RED';
    }

    // Higher congestion = higher urgency (harder mining)
    const urgency = Math.floor(networkCongestion * 10);

    return trafficAdaptiveHash(blockData, networkCongestion, state, urgency);
}

/**
 * Verify that different inputs produce different hashes
 * Question 2.4 (Atelier 2)
 * 
 * @returns {boolean} True if hashes are different
 */
function verifyDifferentInputs() {
    const input1 = 'intersection_Main_1st_signal_GREEN';
    const input2 = 'intersection_Main_1st_signal_RED';

    const hash1 = trafficAdaptiveHash(input1, 0.5, 'GREEN');
    const hash2 = trafficAdaptiveHash(input2, 0.5, 'RED');

    console.log(`Input 1: ${input1}`);
    console.log(`Hash 1:  ${hash1}`);
    console.log(`\nInput 2: ${input2}`);
    console.log(`Hash 2:  ${hash2}`);
    console.log(`\nHashes different: ${hash1 !== hash2}`);

    return hash1 !== hash2;
}

/**
 * Compare both hash functions
 * Shows the difference between CA-based and Chaotic-based hashes
 * 
 * @param {string} input - Input data to hash
 * @param {number} density - Traffic density
 * @param {string} state - Signal state
 */
function compareHashFunctions(input, density = 0.5, state = 'GREEN') {
    console.log('='.repeat(60));
    console.log('COMPARISON OF TWO INNOVATIVE HASH FUNCTIONS');
    console.log('='.repeat(60));
    console.log(`Input: "${input}"`);
    console.log(`Density: ${density}, State: ${state}`);
    console.log('-'.repeat(60));
    
    const caHash = trafficAdaptiveHash(input, density, state);
    console.log(`\n1. CELLULAR AUTOMATON HASH:`);
    console.log(`   ${caHash}`);
    
    const chaoticHash = chaoticTrafficHash(input, density, state);
    console.log(`\n2. CHAOTIC MAP HASH:`);
    console.log(`   ${chaoticHash}`);
    
    const hybrid = hybridTrafficHash(input, density, state);
    console.log(`\n3. HYBRID (CA XOR Chaotic):`);
    console.log(`   ${hybrid}`);
    
    console.log('\n' + '='.repeat(60));
    
    return {
        cellularAutomaton: caHash,
        chaotic: chaoticHash,
        hybrid: hybrid
    };
}

module.exports = {
    // Classes
    TrafficAdaptiveCA,
    ChaoticTrafficHash,
    
    // Hash Function 1: Cellular Automaton
    trafficAdaptiveHash,
    
    // Hash Function 2: Chaotic Maps
    chaoticTrafficHash,
    
    // Hybrid: Combined approach
    hybridTrafficHash,
    
    // Application-specific hashes
    intersectionHash,
    blockHashWithTraffic,
    
    // Utilities
    verifyDifferentInputs,
    compareHashFunctions
};
