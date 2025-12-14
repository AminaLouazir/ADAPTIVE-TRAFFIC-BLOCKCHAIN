'use strict';

/**
 * Fabric Client - Connexion au réseau Hyperledger Fabric
 * Ce module permet au simulateur d'interagir avec le chaincode
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

class FabricClient {
    constructor() {
        this.gateway = null;
        this.contract = null;
        this.network = null;
        this.connected = false;
    }

    /**
     * Se connecter au réseau Fabric
     */
    async connect(orgName = 'Org1') {
        try {
            console.log(`🔗 Connexion au réseau Hyperledger Fabric en tant que ${orgName}...`);
        
            this.currentOrg = orgName; // ← Définir AVANT de l'utiliser

            // Chemin du profil de connexion
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

            // Wallet
            const walletPath = path.join(process.cwd(), 'wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            // UTILISER ADMIN avec le bon nom
            const adminIdentity = `admin-${orgName.toLowerCase()}`;
            const identity = await this.wallet.get(adminIdentity);

            if (!identity) {
                console.error(`❌ Identity ${adminIdentity} not found in wallet.`);
                console.error('💡 Run: node importAdminIdentities.js');
                throw new Error(`Identity ${adminIdentity} missing`);
            }

            console.log(`✅ Identity ${adminIdentity} found in wallet`);

            // Gateway avec discovery DÉSACTIVÉ
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: adminIdentity,
                discovery: { 
                    enabled: false
                }
            });

            console.log('✅ Gateway connecté');

            // Network & contract
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

    /**
     * Initialiser le ledger
     */
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

    /**
     * Créer un nouveau feu de circulation
     */
    async createTrafficLight(id, intersection, state, density) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            console.log(`📝 Création du feu ${id}...`);
            
            const result = await this.contract.submitTransaction(
                'createTrafficLight',
                id,
                intersection,
                state,
                density.toString()
            );

            console.log('✅ Feu créé sur la blockchain');
            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur createTrafficLight:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour l'état d'un feu (TRANSACTION)
     */
    async updateTrafficState(id, state, density, queueLength, avgWaitTime) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            console.log(`📝 Transaction: Mise à jour du feu ${id} -> ${state}`);
            
            const result = await this.contract.submitTransaction(
                'updateTrafficState',
                id,
                state,
                density.toString(),
                queueLength.toString(),
                avgWaitTime.toString()
            );

            const updatedLight = JSON.parse(result.toString());
            console.log(`✅ Transaction enregistrée sur la blockchain: ${state} @ ${density}%`);
            
            return updatedLight;

        } catch (error) {
            console.error('❌ Erreur updateTrafficState:', error);
            throw error;
        }
    }

    /**
     * Lire l'état d'un feu (QUERY)
     */
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

    /**
     * Lire tous les feux
     */
    async queryAllLights() {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction('queryAllLights');
            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur queryAllLights:', error);
            throw error;
        }
    }

    /**
     * Obtenir l'historique d'un feu
     */
    async getTrafficHistory(id) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            const result = await this.contract.evaluateTransaction(
                'getTrafficHistory',
                id
            );

            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur getTrafficHistory:', error);
            throw error;
        }
    }

    /**
     * Activer le mode urgence (TRANSACTION)
     */
    async activateEmergency(id) {
        try {
            if (!this.connected) {
                throw new Error('Non connecté au réseau Fabric');
            }

            console.log(`🚨 Transaction: Mode urgence activé pour ${id}`);
            
            const result = await this.contract.submitTransaction(
                'setEmergencyMode',
                id,
                'true'
            );

            console.log('✅ Mode urgence enregistré sur la blockchain');
            return JSON.parse(result.toString());

        } catch (error) {
            console.error('❌ Erreur activateEmergency:', error);
            throw error;
        }
    }

    async updateTrafficDensity(lightId, vehicleCount, density, waitTime) {
        if (!this.connected) {
            throw new Error('Non connecté');
        }

        // 🔒 HARD VALIDATION (this fixes your crash)
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

        // Submit transaction to Fabric
        const result = await this.contract.submitTransaction(
            'updateSignalState',
            lightId,
            newState,
            reason
        );

        return JSON.parse(result.toString());
    }








    /**
     * Se déconnecter
     */
    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.connected = false;
            console.log('👋 Déconnecté du réseau Fabric');
        }
    }




    /**
     * Vérifier si connecté
     */
    isConnected() {
        return this.connected;
    }
}

module.exports = FabricClient;