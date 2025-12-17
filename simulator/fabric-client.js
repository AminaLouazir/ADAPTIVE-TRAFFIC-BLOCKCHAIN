'use strict';

/**
 * Fabric Client - Connexion au réseau Hyperledger Fabric
 * FIXED: Emergency mode matches chaincode (triggerEmergency/clearEmergency)
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class FabricClient {
    constructor() {
        this.gateway = null;
        this.contract = null;
        this.network = null;
        this.connected = false;
        this.currentOrg = null;
    }

    async connect(orgName = 'Org1') {
        try {
            console.log(`🔗 Connexion au réseau Hyperledger Fabric en tant que ${orgName}...`);
        
            this.currentOrg = orgName;

            const ccpPath = path.resolve(
                __dirname,
                '..',
                'network',
                `connection-${orgName.toLowerCase()}.json`
            );

            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Connection profile not found: ${ccpPath}`);
            }
        
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const walletPath = path.join(process.cwd(), 'wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            const adminIdentity = `admin-${orgName.toLowerCase()}`;
            const identity = await this.wallet.get(adminIdentity);

            if (!identity) {
                console.error(`❌ Identity ${adminIdentity} not found in wallet.`);
                console.error('💡 Run: node importAdminIdentities.js');
                throw new Error(`Identity ${adminIdentity} missing`);
            }

            console.log(`✅ Identity ${adminIdentity} found in wallet`);

            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: adminIdentity,
                discovery: { 
                    enabled: false
                }
            });

            console.log('✅ Gateway connecté');

            this.network = await this.gateway.getNetwork('traffic-channel');
            this.contract = this.network.getContract('traffic-light');

            this.connected = true;

            console.log(`✅ Connecté au réseau Fabric en tant que ${orgName}`);
            console.log('✅ Contrat traffic-light chargé');
            return true;

        } catch (error) {
            console.error('❌ Erreur de connexion Fabric:', error.message);
            this.connected = false;
            return false;
        }
    }

    async initLedger() {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            console.log('📝 Initialisation du ledger...');
            await this.contract.submitTransaction('initLedger');
            console.log('✅ Ledger initialisé');
            return true;

        } catch (error) {
            console.error('❌ Erreur initLedger:', error);
            return false;
        }
    }

    async getTrafficLight(id) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction(
                'getTrafficLight',
                id
            );

            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur getTrafficLight:', error);
            throw error;
        }
    }

    async getAllTrafficLights() {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction('getAllTrafficLights');
            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur getAllTrafficLights:', error);
            throw error;
        }
    }

    async getIntersection(id) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction('getIntersection', id);
            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur getIntersection:', error);
            throw error;
        }
    }

    async updateTrafficDensity(lightId, vehicleCount, density, waitTime) {
        if (!this.connected) {
            throw new Error('Non connecté');
        }

        // 🔒 HARD VALIDATION
        if (
            lightId === undefined ||
            vehicleCount === undefined ||
            density === undefined ||
            waitTime === undefined
        ) {
            throw new Error(
                `Invalid updateTrafficDensity args:
                lightId=${lightId},
                vehicleCount=${vehicleCount},
                density=${density},
                waitTime=${waitTime}`
            );
        }

        try {
            const result = await this.contract.submitTransaction(
                'updateTrafficDensity',
                lightId,
                String(vehicleCount),
                String(density),
                String(waitTime)
            );

            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur updateTrafficDensity:', error.message);
            throw error;
        }
    }

    async updateSignalState(lightId, newState, reason) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        // Validate state
        const validStates = ['GREEN', 'YELLOW', 'RED', 'EMERGENCY'];
        if (!validStates.includes(newState)) {
            throw new Error(`Invalid state: ${newState}. Must be one of: ${validStates.join(', ')}`);
        }

        try {
            const result = await this.contract.submitTransaction(
                'updateSignalState',
                lightId,
                newState,
                reason || 'Manual update'
            );

            return JSON.parse(result.toString());
        } catch (error) {
            console.error('❌ Erreur updateSignalState:', error.message);
            throw error;
        }
    }

    /**
     * 🚨 TRIGGER EMERGENCY MODE (matches chaincode)
     * Requires Org2MSP (Emergency Services)
     * 
     * @param {string} intersectionId - e.g., "INT-001"
     * @param {string} direction - "NORTH", "SOUTH", "EAST", or "WEST"
     * @param {string} vehicleType - "AMBULANCE", "FIRE", or "POLICE"
     */
    async triggerEmergency(intersectionId, direction, vehicleType = 'AMBULANCE') {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            // Check if we're Org2
            if (this.currentOrg !== 'Org2') {
                console.warn('⚠️ Emergency mode requires Org2MSP (Emergency Services)');
                console.warn(`⚠️ Currently connected as: ${this.currentOrg}`);
                throw new Error('Emergency mode requires connection as Org2');
            }

            console.log(`🚨 Transaction: Mode urgence activé`);
            console.log(`   Intersection: ${intersectionId}`);
            console.log(`   Direction: ${direction}`);
            console.log(`   Vehicle: ${vehicleType}`);
            
            const result = await this.contract.submitTransaction(
                'triggerEmergency',
                intersectionId,
                direction,
                vehicleType
            );

            const response = JSON.parse(result.toString());
            console.log('✅ Mode urgence enregistré sur la blockchain');
            
            return response;

        } catch (error) {
            console.error('❌ Erreur triggerEmergency:', error.message);
            throw error;
        }
    }

    /**
     * 🟢 CLEAR EMERGENCY MODE (matches chaincode)
     * Requires Org2MSP (Emergency Services)
     * 
     * @param {string} intersectionId - e.g., "INT-001"
     */
    async clearEmergency(intersectionId) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            // Check if we're Org2
            if (this.currentOrg !== 'Org2') {
                console.warn('⚠️ Clearing emergency requires Org2MSP (Emergency Services)');
                throw new Error('Emergency clear requires connection as Org2');
            }

            console.log(`✅ Transaction: Mode urgence désactivé pour ${intersectionId}`);
            
            const result = await this.contract.submitTransaction(
                'clearEmergency',
                intersectionId
            );

            const response = JSON.parse(result.toString());
            console.log('✅ Mode normal restauré sur la blockchain');
            
            return response;

        } catch (error) {
            console.error('❌ Erreur clearEmergency:', error.message);
            throw error;
        }
    }

    /**
     * Sync an entire intersection
     * @param {string} intersectionId - e.g., "INT-001"
     */
    async syncIntersection(intersectionId) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.submitTransaction(
                'syncIntersection',
                intersectionId
            );

            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur syncIntersection:', error.message);
            throw error;
        }
    }

    /**
     * Get decision history for an intersection
     */
    async getDecisionHistory(intersectionId) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction(
                'getDecisionHistory',
                intersectionId
            );

            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur getDecisionHistory:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.connected = false;
            console.log('👋 Déconnecté du réseau Fabric');
        }
    }

    isConnected() {
        return this.connected;
    }

    getCurrentOrg() {
        return this.currentOrg;
    }
}

module.exports = FabricClient;