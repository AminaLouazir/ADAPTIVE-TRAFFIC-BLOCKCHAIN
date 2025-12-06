/**
 * Intersection Model
 * Represents a traffic intersection with multiple traffic lights
 * 
 * @author Amina Louazir
 * @course Master IASD - Blockchain
 */

'use strict';

const { SignalState, Direction } = require('./trafficLight');

/**
 * Intersection class - represents a group of traffic lights
 */
class Intersection {
    /**
     * Create a new intersection
     * @param {string} id - Unique identifier
     * @param {string} name - Human-readable name (e.g., "Main St & 1st Ave")
     * @param {Object} location - Geographic location {lat, lng}
     * @param {number} timestamp - Transaction timestamp (for determinism)
     */
    constructor(id, name, location = { lat: 0, lng: 0 }, timestamp = 0) {
        this.docType = 'intersection';
        this.id = id;
        this.name = name;
        this.location = location;
        this.lightIds = [];  // Array of traffic light IDs
        this.isActive = true;
        this.isEmergencyMode = false;
        this.emergencyDirection = null;
        this.emergencyVehicleType = null;
        this.syncMode = 'ADAPTIVE';  // ADAPTIVE, FIXED, EMERGENCY
        this.cycleTime = 120;  // Total cycle time in seconds
        this.createdAt = timestamp;
        this.updatedAt = timestamp;
        this.lastSyncHash = null;  // Hash of last synchronized state
    }

    /**
     * Add a traffic light to this intersection
     * @param {string} lightId - Traffic light ID
     * @param {number} timestamp - Transaction timestamp
     */
    addLight(lightId, timestamp) {
        if (!this.lightIds.includes(lightId)) {
            this.lightIds.push(lightId);
            this.updatedAt = timestamp;
        }
    }

    /**
     * Remove a traffic light from this intersection
     * @param {string} lightId - Traffic light ID
     * @param {number} timestamp - Transaction timestamp
     */
    removeLight(lightId, timestamp) {
        const index = this.lightIds.indexOf(lightId);
        if (index > -1) {
            this.lightIds.splice(index, 1);
            this.updatedAt = timestamp;
        }
    }

    /**
     * Enter emergency mode
     * @param {string} direction - Direction for emergency vehicle
     * @param {string} vehicleType - Type of emergency vehicle
     * @param {number} timestamp - Transaction timestamp
     */
    enterEmergencyMode(direction, vehicleType, timestamp) {
        this.isEmergencyMode = true;
        this.emergencyDirection = direction;
        this.emergencyVehicleType = vehicleType;
        this.syncMode = 'EMERGENCY';
        this.updatedAt = timestamp;
    }

    /**
     * Exit emergency mode
     * @param {number} timestamp - Transaction timestamp
     */
    exitEmergencyMode(timestamp) {
        this.isEmergencyMode = false;
        this.emergencyDirection = null;
        this.emergencyVehicleType = null;
        this.syncMode = 'ADAPTIVE';
        this.updatedAt = timestamp;
    }

    /**
     * Update cycle time based on traffic conditions
     * @param {number} avgDensity - Average traffic density
     * @param {number} timestamp - Transaction timestamp
     */
    adaptCycleTime(avgDensity, timestamp) {
        // Lower density = shorter cycle, Higher density = longer cycle
        const minCycle = 60;  // seconds
        const maxCycle = 180;  // seconds
        
        this.cycleTime = Math.floor(minCycle + (avgDensity * (maxCycle - minCycle)));
        this.updatedAt = timestamp;
    }

    /**
     * Set the last sync hash
     * @param {string} hash - Hash of synchronized state
     * @param {number} timestamp - Transaction timestamp
     */
    setSyncHash(hash, timestamp) {
        this.lastSyncHash = hash;
        this.updatedAt = timestamp;
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            docType: this.docType,
            id: this.id,
            name: this.name,
            location: this.location,
            lightIds: this.lightIds,
            isActive: this.isActive,
            isEmergencyMode: this.isEmergencyMode,
            emergencyDirection: this.emergencyDirection,
            emergencyVehicleType: this.emergencyVehicleType,
            syncMode: this.syncMode,
            cycleTime: this.cycleTime,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastSyncHash: this.lastSyncHash
        };
    }

    /**
     * Create Intersection from JSON
     * @param {Object} json - JSON object
     * @returns {Intersection} Intersection instance
     */
    static fromJSON(json) {
        const intersection = new Intersection(
            json.id,
            json.name,
            json.location
        );
        intersection.lightIds = json.lightIds || [];
        intersection.isActive = json.isActive;
        intersection.isEmergencyMode = json.isEmergencyMode;
        intersection.emergencyDirection = json.emergencyDirection;
        intersection.emergencyVehicleType = json.emergencyVehicleType;
        intersection.syncMode = json.syncMode;
        intersection.cycleTime = json.cycleTime;
        intersection.createdAt = json.createdAt;
        intersection.updatedAt = json.updatedAt;
        intersection.lastSyncHash = json.lastSyncHash;
        return intersection;
    }
}

module.exports = { Intersection };
