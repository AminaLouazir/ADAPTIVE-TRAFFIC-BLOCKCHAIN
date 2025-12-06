/**
 * Traffic Light Model
 * Represents a single traffic light at an intersection
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain
 */

'use strict';

// Valid signal states
const SignalState = {
    RED: 'RED',
    YELLOW: 'YELLOW',
    GREEN: 'GREEN',
    EMERGENCY: 'EMERGENCY'
};

// Traffic light directions
const Direction = {
    NORTH: 'NORTH',
    SOUTH: 'SOUTH',
    EAST: 'EAST',
    WEST: 'WEST'
};

/**
 * TrafficLight class - represents a single traffic light
 */
class TrafficLight {
    /**
     * Create a new traffic light
     * @param {string} id - Unique identifier
     * @param {string} intersectionId - Parent intersection ID
     * @param {string} direction - Direction (NORTH, SOUTH, EAST, WEST)
     * @param {string} state - Initial state (RED, YELLOW, GREEN)
     * @param {number} timestamp - Transaction timestamp (for determinism)
     */
    constructor(id, intersectionId, direction, state = SignalState.RED, timestamp = 0) {
        this.docType = 'trafficLight';
        this.id = id;
        this.intersectionId = intersectionId;
        this.direction = direction;
        this.state = state;
        this.previousState = null;
        this.lastStateChange = timestamp;
        this.vehicleCount = 0;
        this.waitTime = 0;  // Average wait time in seconds
        this.density = 0.0;  // Traffic density (0.0 - 1.0)
        this.createdAt = timestamp;
        this.updatedAt = timestamp;
    }

    /**
     * Update the signal state
     * @param {string} newState - New signal state
     * @param {number} timestamp - Transaction timestamp
     * @returns {TrafficLight} Updated traffic light
     */
    updateState(newState, timestamp) {
        if (!Object.values(SignalState).includes(newState)) {
            throw new Error(`Invalid signal state: ${newState}`);
        }
        this.previousState = this.state;
        this.state = newState;
        this.lastStateChange = timestamp;
        this.updatedAt = timestamp;
        return this;
    }

    /**
     * Update traffic data
     * @param {number} vehicleCount - Number of vehicles
     * @param {number} density - Traffic density (0.0 - 1.0)
     * @param {number} waitTime - Average wait time in seconds
     * @param {number} timestamp - Transaction timestamp
     * @returns {TrafficLight} Updated traffic light
     */
    updateTrafficData(vehicleCount, density, waitTime = 0, timestamp) {
        this.vehicleCount = vehicleCount;
        this.density = Math.max(0, Math.min(1, density));  // Clamp to 0-1
        this.waitTime = waitTime;
        this.updatedAt = timestamp;
        return this;
    }

    /**
     * Check if state transition is valid
     * @param {string} newState - Proposed new state
     * @returns {boolean} True if valid transition
     */
    isValidTransition(newState) {
        // Emergency can transition to/from any state
        if (this.state === SignalState.EMERGENCY || newState === SignalState.EMERGENCY) {
            return true;
        }

        // Normal state machine: GREEN -> YELLOW -> RED -> GREEN
        const validTransitions = {
            [SignalState.GREEN]: [SignalState.YELLOW, SignalState.EMERGENCY],
            [SignalState.YELLOW]: [SignalState.RED, SignalState.EMERGENCY],
            [SignalState.RED]: [SignalState.GREEN, SignalState.EMERGENCY]
        };

        return validTransitions[this.state]?.includes(newState) || false;
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
            direction: this.direction,
            state: this.state,
            previousState: this.previousState,
            lastStateChange: this.lastStateChange,
            vehicleCount: this.vehicleCount,
            waitTime: this.waitTime,
            density: this.density,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create TrafficLight from JSON
     * @param {Object} json - JSON object
     * @returns {TrafficLight} TrafficLight instance
     */
    static fromJSON(json) {
        const light = new TrafficLight(
            json.id,
            json.intersectionId,
            json.direction,
            json.state
        );
        light.previousState = json.previousState;
        light.lastStateChange = json.lastStateChange;
        light.vehicleCount = json.vehicleCount;
        light.waitTime = json.waitTime;
        light.density = json.density;
        light.createdAt = json.createdAt;
        light.updatedAt = json.updatedAt;
        return light;
    }
}

module.exports = {
    TrafficLight,
    SignalState,
    Direction
};
