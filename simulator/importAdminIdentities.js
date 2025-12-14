'use strict';

/**
 * Importer les identités Admin depuis les certificats cryptogen
 * Ces certificats ont été générés lors de la configuration du réseau
 * et sont les SEULS acceptés par le canal
 */

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function importAdminIdentity(orgName, orgMSP, cryptoPath, walletPath) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📝 Importing Admin Identity for ${orgName} (${orgMSP})`);
        console.log('='.repeat(60));

        // Créer le wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`📁 Wallet path: ${walletPath}`);

        // Vérifier si l'admin existe déjà
        const adminIdentity = `admin-${orgName.toLowerCase()}`;
        const existingIdentity = await wallet.get(adminIdentity);
        
        if (existingIdentity) {
            console.log(`⚠️  ${adminIdentity} already exists, removing old one...`);
            await wallet.remove(adminIdentity);
        }

        // Chemins vers les certificats générés par cryptogen
        const certPath = path.join(
            cryptoPath,
            'peerOrganizations',
            `${orgName.toLowerCase()}.example.com`,
            'users',
            `Admin@${orgName.toLowerCase()}.example.com`,
            'msp',
            'signcerts',
            `Admin@${orgName.toLowerCase()}.example.com-cert.pem`
        );

        const keyPath = path.join(
            cryptoPath,
            'peerOrganizations',
            `${orgName.toLowerCase()}.example.com`,
            'users',
            `Admin@${orgName.toLowerCase()}.example.com`,
            'msp',
            'keystore'
        );

        // Vérifier que les fichiers existent
        if (!fs.existsSync(certPath)) {
            throw new Error(`Certificate not found: ${certPath}`);
        }

        if (!fs.existsSync(keyPath)) {
            throw new Error(`Key directory not found: ${keyPath}`);
        }

        // Lire le certificat
        const certificate = fs.readFileSync(certPath, 'utf8');
        console.log(`✅ Certificate loaded from: ${certPath}`);

        // Trouver la clé privée (elle peut avoir un nom variable)
        const keyFiles = fs.readdirSync(keyPath);
        if (keyFiles.length === 0) {
            throw new Error(`No private key found in: ${keyPath}`);
        }

        const privateKeyPath = path.join(keyPath, keyFiles[0]);
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        console.log(`✅ Private key loaded from: ${privateKeyPath}`);

        // Créer l'identité X.509
        const x509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: orgMSP,
            type: 'X.509',
        };

        // Importer dans le wallet
        await wallet.put(adminIdentity, x509Identity);
        console.log(`✅ ${adminIdentity} imported into wallet successfully`);

        return true;

    } catch (error) {
        console.error(`❌ Failed to import admin for ${orgName}:`, error.message);
        return false;
    }
}

async function main() {
    const walletPath = path.join(process.cwd(), 'wallet');
    
    // Chemin vers les certificats générés par cryptogen
    const cryptoPath = path.resolve(__dirname, '..', 'network', 'crypto-config');

    console.log('\n🚦 ADAPTIVE TRAFFIC BLOCKCHAIN - Admin Identity Import');
    console.log('Importing admin identities from cryptogen certificates...\n');
    console.log(`📂 Crypto path: ${cryptoPath}\n`);

    // Vérifier que le dossier crypto-config existe
    if (!fs.existsSync(cryptoPath)) {
        console.error(`❌ Crypto-config directory not found: ${cryptoPath}`);
        console.error('💡 Make sure you ran: cd network/scripts && ./generate-artifacts.sh');
        process.exit(1);
    }

    // Importer Org1 Admin
    const org1Success = await importAdminIdentity(
        'Org1',
        'Org1MSP',
        cryptoPath,
        walletPath
    );

    // Importer Org2 Admin
    const org2Success = await importAdminIdentity(
        'Org2',
        'Org2MSP',
        cryptoPath,
        walletPath
    );

    console.log(`\n${'='.repeat(60)}`);
    if (org1Success && org2Success) {
        console.log('✅ ALL ADMIN IDENTITIES IMPORTED SUCCESSFULLY');
        console.log('📁 Wallet contains:');
        console.log('   - admin-org1 (Traffic Authority)');
        console.log('   - admin-org2 (Emergency Services)');
        console.log('\n💡 These identities match the network configuration');
        console.log('💡 You can now run: node server.js');
    } else {
        console.log('⚠️  SOME IMPORTS FAILED');
        if (!org1Success) console.log('   ❌ Org1 admin failed');
        if (!org2Success) console.log('   ❌ Org2 admin failed');
    }
    console.log('='.repeat(60) + '\n');

    // Vérifier le wallet
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identities = await wallet.list();
    
    console.log('📋 Identities in wallet:');
    for (const id of identities) {
        console.log(`   - ${id.label} (${id.mspId})`);
    }
}

main().then(() => {
    console.log('\n✅ Identity import process completed');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Identity import process failed:', error);
    process.exit(1);
});