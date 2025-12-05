/**
 * Traffic Light Smart Contract
 * Adaptive Signal Control for Smart Cities
 * 
 * Features:
 * - Dynamic intersection management (add/remove at runtime)
 * - Adaptive signal control based on traffic density
 * - Emergency vehicle priority handling
 * - Decision recording with CA hash proof
 * - Requires endorsement from both organizations
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain
 * @professor Pr. Ikram BEN ABDEL OUAHAB
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const { TrafficLight, SignalState, Direction } = require('./models/trafficLight');
const { Intersection } = require('./models/intersection');
const { Decision, DecisionType } = require('./models/decision');
const { trafficAdaptiveHash, chaoticTrafficHash, hybridTrafficHash, intersectionHash } = require('./cellularAutomaton');

// Hash function types
const HashType = {
    CELLULAR_AUTOMATON: 'CA',      // Automate Cellulaire
    CHAOTIC: 'CHAOTIC',            // Maps Chaotiques
    HYBRID: 'HYBRID'               // Combinaison des deux
};

class TrafficLightContract extends Contract {

    constructor() {
        super('TrafficLightContract');
    }

    /**
     * Get deterministic timestamp from transaction
     * @param {Context} ctx - Transaction context
     * @returns {number} Timestamp in milliseconds
     */
    _getTxTimestamp(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        // Convert to milliseconds
        return (timestamp.seconds.low * 1000) + Math.floor(timestamp.nanos / 1000000);
    }

    /**
     * Generate hash using selected algorithm
     * Supports: CA (Cellular Automaton), CHAOTIC, HYBRID
     * 
     * @param {string} input - Data to hash
     * @param {number} density - Traffic density
     * @param {string} state - Signal state
     * @param {number} urgency - Urgency level
     * @param {string} hashType - Hash algorithm (CA, CHAOTIC, HYBRID)
     * @returns {string} Hash as hex string
     */
    _generateHash(input, density, state, urgency = 0, hashType = 'CA') {
        switch (hashType) {
            case HashType.CHAOTIC:
                return chaoticTrafficHash(input, density, state);
            case HashType.HYBRID:
                return hybridTrafficHash(input, density, state, urgency);
            case HashType.CELLULAR_AUTOMATON:
            default:
                return trafficAdaptiveHash(input, density, state, urgency);
        }
    }

    /**
     * Initialize the ledger with sample data
     * Called once when chaincode is instantiated
     * 
     * @param {Context} ctx - Transaction context
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        // Create sample intersections
        const intersections = [
            {
                id: 'INT-001',
                name: 'Main St & 1st Ave',
                location: { lat: 33.5731, lng: -7.5898 }  // Casablanca coordinates
            },
            {
                id: 'INT-002',
                name: 'Boulevard Zerktouni & Rue Sebou',
                location: { lat: 33.5833, lng: -7.6166 }
            }
        ];

        for (const intData of intersections) {
            const intersection = new Intersection(intData.id, intData.name, intData.location, txTimestamp);
            
            // Create 4 traffic lights for each intersection (N, S, E, W)
            const directions = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST];
            
            for (const dir of directions) {
                const lightId = `${intData.id}-${dir}`;
                // North-South starts GREEN, East-West starts RED
                const initialState = (dir === Direction.NORTH || dir === Direction.SOUTH) 
                    ? SignalState.GREEN 
                    : SignalState.RED;
                
                const light = new TrafficLight(lightId, intData.id, dir, initialState, txTimestamp);
                intersection.addLight(lightId, txTimestamp);
                
                // Store traffic light
                await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));
                console.info(`Created traffic light: ${lightId}`);
            }

            // Generate initial sync hash
            const signalStates = {};
            const vehicleCounts = {};
            for (const dir of directions) {
                signalStates[dir] = (dir === Direction.NORTH || dir === Direction.SOUTH) 
                    ? SignalState.GREEN 
                    : SignalState.RED;
                vehicleCounts[dir] = 0;
            }
            
            const syncHash = intersectionHash(
                intData.id,
                txTimestamp,
                signalStates,
                vehicleCounts,
                1.0
            );
            intersection.setSyncHash(syncHash, txTimestamp);

            // Store intersection
            await ctx.stub.putState(intData.id, Buffer.from(JSON.stringify(intersection.toJSON())));
            console.info(`Created intersection: ${intData.id}`);
        }

        console.info('============= END : Initialize Ledger ===========');
        return JSON.stringify({ success: true, message: 'Ledger initialized with 2 intersections' });
    }

    // ==================== INTERSECTION MANAGEMENT ====================

    /**
     * Create a new intersection (dynamic)
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} id - Unique intersection ID
     * @param {string} name - Human-readable name
     * @param {string} lat - Latitude
     * @param {string} lng - Longitude
     */
    async createIntersection(ctx, id, name, lat, lng) {
        console.info('============= START : Create Intersection ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        // Check if intersection already exists
        const exists = await this._assetExists(ctx, id);
        if (exists) {
            throw new Error(`Intersection ${id} already exists`);
        }

        const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const intersection = new Intersection(id, name, location, txTimestamp);

        // Create 4 traffic lights for the intersection
        const directions = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST];
        const signalStates = {};
        const vehicleCounts = {};

        for (const dir of directions) {
            const lightId = `${id}-${dir}`;
            const initialState = (dir === Direction.NORTH || dir === Direction.SOUTH) 
                ? SignalState.GREEN 
                : SignalState.RED;
            
            const light = new TrafficLight(lightId, id, dir, initialState, txTimestamp);
            intersection.addLight(lightId, txTimestamp);
            signalStates[dir] = initialState;
            vehicleCounts[dir] = 0;
            
            await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));
        }

        // Generate sync hash
        const syncHash = intersectionHash(id, txTimestamp, signalStates, vehicleCounts, 1.0);
        intersection.setSyncHash(syncHash, txTimestamp);

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(intersection.toJSON())));

        // Record decision
        const initiator = ctx.clientIdentity.getMSPID();
        const decision = Decision.createSync(id, signalStates, syncHash, initiator, txTimestamp);
        await ctx.stub.putState(decision.id, Buffer.from(JSON.stringify(decision.toJSON())));

        console.info('============= END : Create Intersection ===========');
        return JSON.stringify(intersection.toJSON());
    }

    /**
     * Remove an intersection and its traffic lights
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} id - Intersection ID
     */
    async removeIntersection(ctx, id) {
        console.info('============= START : Remove Intersection ===========');

        const intersectionJSON = await ctx.stub.getState(id);
        if (!intersectionJSON || intersectionJSON.length === 0) {
            throw new Error(`Intersection ${id} does not exist`);
        }

        const intersection = Intersection.fromJSON(JSON.parse(intersectionJSON.toString()));

        // Remove all traffic lights
        for (const lightId of intersection.lightIds) {
            await ctx.stub.deleteState(lightId);
        }

        // Remove intersection
        await ctx.stub.deleteState(id);

        console.info('============= END : Remove Intersection ===========');
        return JSON.stringify({ success: true, message: `Intersection ${id} removed` });
    }

    /**
     * Get all intersections
     * 
     * @param {Context} ctx - Transaction context
     */
    async getAllIntersections(ctx) {
        const query = {
            selector: {
                docType: 'intersection'
            }
        };

        const results = await this._getQueryResults(ctx, JSON.stringify(query));
        return JSON.stringify(results);
    }

    /**
     * Get a specific intersection
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} id - Intersection ID
     */
    async getIntersection(ctx, id) {
        const intersectionJSON = await ctx.stub.getState(id);
        if (!intersectionJSON || intersectionJSON.length === 0) {
            throw new Error(`Intersection ${id} does not exist`);
        }
        return intersectionJSON.toString();
    }

    // ==================== TRAFFIC LIGHT MANAGEMENT ====================

    /**
     * Get a specific traffic light
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} id - Traffic light ID
     */
    async getTrafficLight(ctx, id) {
        const lightJSON = await ctx.stub.getState(id);
        if (!lightJSON || lightJSON.length === 0) {
            throw new Error(`Traffic light ${id} does not exist`);
        }
        return lightJSON.toString();
    }

    /**
     * Get all traffic lights
     * 
     * @param {Context} ctx - Transaction context
     */
    async getAllTrafficLights(ctx) {
        const query = {
            selector: {
                docType: 'trafficLight'
            }
        };

        const results = await this._getQueryResults(ctx, JSON.stringify(query));
        return JSON.stringify(results);
    }

    /**
     * Get all traffic lights for an intersection
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} intersectionId - Intersection ID
     */
    async getIntersectionLights(ctx, intersectionId) {
        const query = {
            selector: {
                docType: 'trafficLight',
                intersectionId: intersectionId
            }
        };

        const results = await this._getQueryResults(ctx, JSON.stringify(query));
        return JSON.stringify(results);
    }

    // ==================== SIGNAL CONTROL ====================

    /**
     * Update signal state with adaptive hashing
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} lightId - Traffic light ID
     * @param {string} newState - New signal state
     * @param {string} reason - Reason for change
     */
    async updateSignalState(ctx, lightId, newState, reason) {
        console.info('============= START : Update Signal State ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        const lightJSON = await ctx.stub.getState(lightId);
        if (!lightJSON || lightJSON.length === 0) {
            throw new Error(`Traffic light ${lightId} does not exist`);
        }

        const light = TrafficLight.fromJSON(JSON.parse(lightJSON.toString()));
        const oldState = light.state;

        // Validate state transition (except for emergency)
        if (newState !== SignalState.EMERGENCY && !light.isValidTransition(newState)) {
            throw new Error(`Invalid state transition from ${oldState} to ${newState}`);
        }

        // Update state
        light.updateState(newState, txTimestamp);

        // Generate adaptive hash based on traffic conditions
        const hashInput = `${lightId}|${oldState}|${newState}|${reason}|${txTimestamp}`;
        const hash = trafficAdaptiveHash(hashInput, light.density, newState, 0);

        // Store updated light
        await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));

        // Record decision
        const initiator = ctx.clientIdentity.getMSPID();
        const decision = Decision.createStateChange(
            light.intersectionId,
            lightId,
            oldState,
            newState,
            reason,
            hash,
            initiator,
            txTimestamp
        );
        await ctx.stub.putState(decision.id, Buffer.from(JSON.stringify(decision.toJSON())));

        console.info('============= END : Update Signal State ===========');
        return JSON.stringify({
            light: light.toJSON(),
            decision: decision.toJSON(),
            hash: hash
        });
    }

    /**
     * Update traffic density for a light
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} lightId - Traffic light ID
     * @param {string} vehicleCount - Number of vehicles
     * @param {string} density - Traffic density (0.0-1.0)
     * @param {string} waitTime - Average wait time in seconds
     */
    async updateTrafficDensity(ctx, lightId, vehicleCount, density, waitTime) {
        console.info('============= START : Update Traffic Density ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        const lightJSON = await ctx.stub.getState(lightId);
        if (!lightJSON || lightJSON.length === 0) {
            throw new Error(`Traffic light ${lightId} does not exist`);
        }

        const light = TrafficLight.fromJSON(JSON.parse(lightJSON.toString()));
        light.updateTrafficData(
            parseInt(vehicleCount),
            parseFloat(density),
            parseFloat(waitTime),
            txTimestamp
        );

        await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));

        console.info('============= END : Update Traffic Density ===========');
        return JSON.stringify(light.toJSON());
    }

    /**
     * Synchronize all lights at an intersection
     * Uses intersection hash for verification
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} intersectionId - Intersection ID
     */
    async syncIntersection(ctx, intersectionId) {
        console.info('============= START : Sync Intersection ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        const intersectionJSON = await ctx.stub.getState(intersectionId);
        if (!intersectionJSON || intersectionJSON.length === 0) {
            throw new Error(`Intersection ${intersectionId} does not exist`);
        }

        const intersection = Intersection.fromJSON(JSON.parse(intersectionJSON.toString()));
        const signalStates = {};
        const vehicleCounts = {};
        let totalDensity = 0;

        // Collect current states
        for (const lightId of intersection.lightIds) {
            const lightJSON = await ctx.stub.getState(lightId);
            if (lightJSON && lightJSON.length > 0) {
                const light = TrafficLight.fromJSON(JSON.parse(lightJSON.toString()));
                signalStates[light.direction] = light.state;
                vehicleCounts[light.direction] = light.vehicleCount;
                totalDensity += light.density;
            }
        }

        // Calculate average density and adapt cycle time
        const avgDensity = totalDensity / intersection.lightIds.length;
        intersection.adaptCycleTime(avgDensity, txTimestamp);

        // Generate intersection hash
        const syncHash = intersectionHash(
            intersectionId,
            txTimestamp,
            signalStates,
            vehicleCounts,
            1.0
        );
        intersection.setSyncHash(syncHash, txTimestamp);

        await ctx.stub.putState(intersectionId, Buffer.from(JSON.stringify(intersection.toJSON())));

        // Record decision
        const initiator = ctx.clientIdentity.getMSPID();
        const decision = Decision.createSync(intersectionId, signalStates, syncHash, initiator, txTimestamp);
        await ctx.stub.putState(decision.id, Buffer.from(JSON.stringify(decision.toJSON())));

        console.info('============= END : Sync Intersection ===========');
        return JSON.stringify({
            intersection: intersection.toJSON(),
            signalStates: signalStates,
            vehicleCounts: vehicleCounts,
            avgDensity: avgDensity,
            syncHash: syncHash
        });
    }

    // ==================== EMERGENCY HANDLING ====================

    /**
     * Trigger emergency mode for an intersection
     * Clears the path for emergency vehicles
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} intersectionId - Intersection ID
     * @param {string} direction - Direction of emergency vehicle
     * @param {string} vehicleType - Type of vehicle (AMBULANCE, FIRE, POLICE)
     */
    async triggerEmergency(ctx, intersectionId, direction, vehicleType) {
        console.info('============= START : Trigger Emergency ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        // Verify caller is from Org2 (Emergency Services)
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'Org2MSP') {
            throw new Error('Only Emergency Services (Org2) can trigger emergency mode');
        }

        const intersectionJSON = await ctx.stub.getState(intersectionId);
        if (!intersectionJSON || intersectionJSON.length === 0) {
            throw new Error(`Intersection ${intersectionId} does not exist`);
        }

        const intersection = Intersection.fromJSON(JSON.parse(intersectionJSON.toString()));
        intersection.enterEmergencyMode(direction, vehicleType, txTimestamp);

        // Set emergency direction to GREEN, all others to RED
        for (const lightId of intersection.lightIds) {
            const lightJSON = await ctx.stub.getState(lightId);
            if (lightJSON && lightJSON.length > 0) {
                const light = TrafficLight.fromJSON(JSON.parse(lightJSON.toString()));
                
                if (light.direction === direction) {
                    light.updateState(SignalState.EMERGENCY, txTimestamp);
                } else {
                    light.updateState(SignalState.RED, txTimestamp);
                }
                
                await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));
            }
        }

        await ctx.stub.putState(intersectionId, Buffer.from(JSON.stringify(intersection.toJSON())));

        // Generate hash and record decision
        const hashInput = `EMERGENCY|${intersectionId}|${direction}|${vehicleType}|${txTimestamp}`;
        const hash = trafficAdaptiveHash(hashInput, 1.0, SignalState.EMERGENCY, 10);

        const decision = Decision.createEmergencyTrigger(
            intersectionId,
            direction,
            vehicleType,
            hash,
            mspId,
            txTimestamp
        );
        await ctx.stub.putState(decision.id, Buffer.from(JSON.stringify(decision.toJSON())));

        console.info('============= END : Trigger Emergency ===========');
        return JSON.stringify({
            intersection: intersection.toJSON(),
            decision: decision.toJSON(),
            hash: hash
        });
    }

    /**
     * Clear emergency mode
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} intersectionId - Intersection ID
     */
    async clearEmergency(ctx, intersectionId) {
        console.info('============= START : Clear Emergency ===========');

        const txTimestamp = this._getTxTimestamp(ctx);

        // Verify caller is from Org2 (Emergency Services)
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'Org2MSP') {
            throw new Error('Only Emergency Services (Org2) can clear emergency mode');
        }

        const intersectionJSON = await ctx.stub.getState(intersectionId);
        if (!intersectionJSON || intersectionJSON.length === 0) {
            throw new Error(`Intersection ${intersectionId} does not exist`);
        }

        const intersection = Intersection.fromJSON(JSON.parse(intersectionJSON.toString()));
        intersection.exitEmergencyMode(txTimestamp);

        // Reset to normal operation (N-S GREEN, E-W RED)
        for (const lightId of intersection.lightIds) {
            const lightJSON = await ctx.stub.getState(lightId);
            if (lightJSON && lightJSON.length > 0) {
                const light = TrafficLight.fromJSON(JSON.parse(lightJSON.toString()));
                
                const newState = (light.direction === Direction.NORTH || light.direction === Direction.SOUTH)
                    ? SignalState.GREEN
                    : SignalState.RED;
                
                light.updateState(newState, txTimestamp);
                await ctx.stub.putState(lightId, Buffer.from(JSON.stringify(light.toJSON())));
            }
        }

        await ctx.stub.putState(intersectionId, Buffer.from(JSON.stringify(intersection.toJSON())));

        // Generate hash and record decision
        const hashInput = `CLEAR_EMERGENCY|${intersectionId}|${txTimestamp}`;
        const hash = trafficAdaptiveHash(hashInput, 0.5, SignalState.GREEN, 0);

        const decision = Decision.createEmergencyClear(intersectionId, hash, mspId, txTimestamp);
        await ctx.stub.putState(decision.id, Buffer.from(JSON.stringify(decision.toJSON())));

        console.info('============= END : Clear Emergency ===========');
        return JSON.stringify({
            intersection: intersection.toJSON(),
            decision: decision.toJSON()
        });
    }

    // ==================== DECISION HISTORY ====================

    /**
     * Get decision history for an intersection
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} intersectionId - Intersection ID
     */
    async getDecisionHistory(ctx, intersectionId) {
        const query = {
            selector: {
                docType: 'decision',
                intersectionId: intersectionId
            },
            sort: [{ timestamp: 'desc' }]
        };

        const results = await this._getQueryResults(ctx, JSON.stringify(query));
        return JSON.stringify(results);
    }

    /**
     * Get all decisions
     * 
     * @param {Context} ctx - Transaction context
     */
    async getAllDecisions(ctx) {
        const query = {
            selector: {
                docType: 'decision'
            },
            sort: [{ timestamp: 'desc' }]
        };

        const results = await this._getQueryResults(ctx, JSON.stringify(query));
        return JSON.stringify(results);
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * Compare both hash functions (for testing/demo)
     * Shows output from both innovative hash algorithms
     * 
     * @param {Context} ctx - Transaction context
     * @param {string} inputData - Data to hash
     * @param {string} density - Traffic density (0.0-1.0)
     * @param {string} signalState - Signal state
     */
    async compareHashFunctions(ctx, inputData, density, signalState) {
        const densityFloat = parseFloat(density);
        
        const caHash = trafficAdaptiveHash(inputData, densityFloat, signalState, 0);
        const chaoticHash = chaoticTrafficHash(inputData, densityFloat, signalState);
        const hybridHash = hybridTrafficHash(inputData, densityFloat, signalState, 0);
        
        return JSON.stringify({
            input: inputData,
            density: densityFloat,
            signalState: signalState,
            hashes: {
                cellularAutomaton: {
                    algorithm: 'Cellular Automaton (Rule 30/90/110/184)',
                    description: 'Adapts CA rule based on traffic conditions',
                    hash: caHash
                },
                chaotic: {
                    algorithm: 'Chaotic Maps (Logistic/Tent/Henon)',
                    description: 'Uses chaos theory for unpredictable hashing',
                    hash: chaoticHash
                },
                hybrid: {
                    algorithm: 'Hybrid (CA XOR Chaotic)',
                    description: 'Maximum security combining both methods',
                    hash: hybridHash
                }
            }
        });
    }

    /**
     * Check if an asset exists
     * @param {Context} ctx - Transaction context
     * @param {string} id - Asset ID
     * @returns {boolean} True if exists
     */
    async _assetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    /**
     * Execute a rich query and return results
     * @param {Context} ctx - Transaction context
     * @param {string} queryString - CouchDB query string
     * @returns {Array} Query results
     */
    async _getQueryResults(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                results.push(JSON.parse(strValue));
            } catch (err) {
                console.log(err);
                results.push(strValue);
            }
            result = await iterator.next();
        }
        await iterator.close();

        return results;
    }

    /**
     * Get the history of an asset
     * @param {Context} ctx - Transaction context
     * @param {string} id - Asset ID
     * @returns {Array} History of changes
     */
    async getAssetHistory(ctx, id) {
        const iterator = await ctx.stub.getHistoryForKey(id);
        const history = [];

        let result = await iterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete
            };

            if (!result.value.isDelete) {
                record.value = JSON.parse(result.value.value.toString('utf8'));
            }

            history.push(record);
            result = await iterator.next();
        }
        await iterator.close();

        return JSON.stringify(history);
    }
}

module.exports = TrafficLightContract;
