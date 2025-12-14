'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function registerUser(orgName, orgMSP, caName, caURL, walletPath) {
    console.log(`\n🧑 Registering app user for ${orgName}`);

    const ca = new FabricCAServices(caURL);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminIdentity = await wallet.get(`admin-${orgName.toLowerCase()}`);
    if (!adminIdentity) {
        throw new Error(`Admin identity missing for ${orgName}`);
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const userId = `appUser-${orgName.toLowerCase()}`;
    const userExists = await wallet.get(userId);
    if (userExists) {
        console.log(`ℹ️  ${userId} already exists`);
        return;
    }

    const secret = await ca.register({
        affiliation: '',
        enrollmentID: userId,
        role: 'client'
    }, adminUser);

    const enrollment = await ca.enroll({
        enrollmentID: userId,
        enrollmentSecret: secret
    });

    await wallet.put(userId, {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes()
        },
        mspId: orgMSP,
        type: 'X.509'
    });

    console.log(`✅ ${userId} registered and enrolled`);
}

async function main() {
    const walletPath = path.join(process.cwd(), 'wallet');

    await registerUser('Org1', 'Org1MSP', 'ca-org1', 'http://localhost:7054', walletPath);
    await registerUser('Org2', 'Org2MSP', 'ca-org2', 'http://localhost:8054', walletPath);
}

main().catch(console.error);
