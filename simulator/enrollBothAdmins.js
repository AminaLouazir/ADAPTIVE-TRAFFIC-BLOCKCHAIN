'use strict';

/**
 * Enroll Admin Users for BOTH Organizations
 * Org1 = Traffic Authority
 * Org2 = Emergency Services
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdmin(orgName, orgMSP, caName, caURL, walletPath) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📝 Enrolling Admin for ${orgName} (${orgMSP})`);
        console.log('='.repeat(60));

        // Créer un client CA
        const ca = new FabricCAServices(caURL, { trustedRoots: [], verify: false }, caName);

        // Créer/charger le wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`📁 Wallet path: ${walletPath}`);

        // Vérifier si l'admin existe déjà
        const adminIdentity = `admin-${orgName.toLowerCase()}`;
        const identity = await wallet.get(adminIdentity);
        
        if (identity) {
            console.log(`ℹ️  ${adminIdentity} already exists in the wallet`);
            return true;
        }

        // Enroll l'admin
        console.log(`📝 Enrolling ${adminIdentity}...`);
        const enrollment = await ca.enroll({ 
            enrollmentID: 'admin', 
            enrollmentSecret: 'adminpw' 
        });
        
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMSP,
            type: 'X.509',
        };
        
        await wallet.put(adminIdentity, x509Identity);
        console.log(`✅ Successfully enrolled ${adminIdentity} and imported into wallet`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to enroll admin for ${orgName}: ${error}`);
        return false;
    }
}

async function main() {
    const walletPath = path.join(process.cwd(), 'wallet');

    console.log('\n🚦 ADAPTIVE TRAFFIC BLOCKCHAIN - Admin Enrollment');
    console.log('Setting up identities for both organizations...\n');

    // Enroll Org1 Admin (Traffic Authority)
    const org1Success = await enrollAdmin(
        'Org1',
        'Org1MSP',
        'ca-org1',
        'http://localhost:7054',
        walletPath
    );

    // Enroll Org2 Admin (Emergency Services)
    const org2Success = await enrollAdmin(
        'Org2',
        'Org2MSP',
        'ca-org2',
        'http://localhost:8054',
        walletPath
    );

    console.log(`\n${'='.repeat(60)}`);
    if (org1Success && org2Success) {
        console.log('✅ ALL ADMINS ENROLLED SUCCESSFULLY');
        console.log('📁 Wallet contains:');
        console.log('   - admin-org1 (Traffic Authority)');
        console.log('   - admin-org2 (Emergency Services)');
    } else {
        console.log('⚠️  SOME ENROLLMENTS FAILED');
        if (!org1Success) console.log('   ❌ Org1 admin failed');
        if (!org2Success) console.log('   ❌ Org2 admin failed');
    }
    console.log('='.repeat(60) + '\n');

    // Vérifier le wallet
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identities = await wallet.list();
    
    console.log('📋 Identities in wallet:');
    for (const id of identities) {
        console.log(`   - ${id}`);
    }
}

main().then(() => {
    console.log('\n✅ Enrollment process completed');
}).catch((error) => {
    console.error('\n❌ Enrollment process failed:', error);
    process.exit(1);
});