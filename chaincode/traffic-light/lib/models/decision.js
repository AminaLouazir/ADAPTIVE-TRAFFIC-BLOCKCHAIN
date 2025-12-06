/**
 * Decision Model
 * Records traffic light decisions on the blockchain
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain
 */

'use strict';

// Decision types
const DecisionType = {
    STATE_CHANGE: 'STATE_CHANGE',
    SYNC: 'SYNC',
    EMERGENCY_TRIGGER: 'EMERGENCY_TRIGGER',
    EMERGENCY_CLEAR: 'EMERGENCY_CLEAR',
    DENSITY_UPDATE: 'DENSITY_UPDATE',
    ADAPTIVE_ADJUSTMENT: 'ADAPTIVE_ADJUSTMENT'
};

/**
 * Decision class - records a traffic control decision
 */
class Decision {
    /**
     * Create a new decision record
     * @param {string} id - Unique identifier
     * @param {string} intersectionId - Related intersection ID
     * @param {string} type - Decision type
     * @param {Object} details - Decision details
     * @param {string} hash - CA hash of the decision
     * @param {string} initiator - Organization that initiated (Org1MSP or Org2MSP)
     * @param {number} timestamp - Transaction timestamp (for determinism)
     */
    constructor(id, intersectionId, type, details, hash, initiator, timestamp = 0) {
        this.docType = 'decision';
        this.id = id;
        this.intersectionId = intersectionId;
        this.type = type;
        this.details = details;
        this.hash = hash;  // CA hash for verification
        this.initiator = initiator;
        this.timestamp = timestamp;
        this.blockNumber = null;  // Set after commit
        this.txId = null;  // Transaction ID
    }

    /**
     * Set block information after commit
     * @param {number} blockNumber - Block number
     * @param {string} txId - Transaction ID
     */
    setBlockInfo(blockNumber, txId) {
        this.blockNumber = blockNumber;
        this.txId = txId;
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            docType: this.docType,
            id: this.id,
            intersectionId: this.intersectionId,
            type: this.type,
            details: this.details,
            hash: this.hash,
            initiator: this.initiator,
            timestamp: this.timestamp,
            blockNumber: this.blockNumber,
            txId: this.txId
        };
    }

    /**
     * Create Decision from JSON
     * @param {Object} json - JSON object
     * @returns {Decision} Decision instance
     */
    static fromJSON(json) {
        const decision = new Decision(
            json.id,
            json.intersectionId,
            json.type,
            json.details,
            json.hash,
            json.initiator,
            json.timestamp
        );
        decision.blockNumber = json.blockNumber;
        decision.txId = json.txId;
        return decision;
    }

    /**
     * Create a state change decision
     * @param {string} intersectionId - Intersection ID
     * @param {string} lightId - Traffic light ID
     * @param {string} oldState - Previous state
     * @param {string} newState - New state
     * @param {string} reason - Reason for change
     * @param {string} hash - CA hash
     * @param {string} initiator - Initiator org
     * @param {number} timestamp - Transaction timestamp
     * @returns {Decision} New decision
     */
    static createStateChange(intersectionId, lightId, oldState, newState, reason, hash, initiator, timestamp) {
        const id = `decision_${timestamp}_statechange`;
        return new Decision(
            id,
            intersectionId,
            DecisionType.STATE_CHANGE,
            { lightId, oldState, newState, reason },
            hash,
            initiator,
            timestamp
        );
    }

    /**
     * Create a sync decision
     * @param {string} intersectionId - Intersection ID
     * @param {Object} lightStates - Map of light ID to state
     * @param {string} hash - CA hash
     * @param {string} initiator - Initiator org
     * @param {number} timestamp - Transaction timestamp
     * @returns {Decision} New decision
     */
    static createSync(intersectionId, lightStates, hash, initiator, timestamp) {
        const id = `decision_${timestamp}_sync`;
        return new Decision(
            id,
            intersectionId,
            DecisionType.SYNC,
            { lightStates },
            hash,
            initiator,
            timestamp
        );
    }

    /**
     * Create an emergency trigger decision
     * @param {string} intersectionId - Intersection ID
     * @param {string} direction - Emergency direction
     * @param {string} vehicleType - Vehicle type
     * @param {string} hash - CA hash
     * @param {string} initiator - Initiator org
     * @param {number} timestamp - Transaction timestamp
     * @returns {Decision} New decision
     */
    static createEmergencyTrigger(intersectionId, direction, vehicleType, hash, initiator, timestamp) {
        const id = `decision_${timestamp}_emergency`;
        return new Decision(
            id,
            intersectionId,
            DecisionType.EMERGENCY_TRIGGER,
            { direction, vehicleType },
            hash,
            initiator,
            timestamp
        );
    }

    /**
     * Create an emergency clear decision
     * @param {string} intersectionId - Intersection ID
     * @param {string} hash - CA hash
     * @param {string} initiator - Initiator org
     * @param {number} timestamp - Transaction timestamp
     * @returns {Decision} New decision
     */
    static createEmergencyClear(intersectionId, hash, initiator, timestamp) {
        const id = `decision_${timestamp}_clearemergency`;
        return new Decision(
            id,
            intersectionId,
            DecisionType.EMERGENCY_CLEAR,
            {},
            hash,
            initiator,
            timestamp
        );
    }
}

module.exports = {
    Decision,
    DecisionType
};
