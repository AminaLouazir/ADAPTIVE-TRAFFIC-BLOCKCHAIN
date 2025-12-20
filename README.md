# Adaptive Traffic Blockchain

**Project:** Adaptive Traffic Blockchain — Sous-projet 2: Adaptive Signal Control

**Résumé du projet**
- Objectif: Simuler une Smart City décentralisée où les modules (trafic, énergie, urgences...) communiquent via une blockchain Hyperledger Fabric. Ce sous-projet implémente un système de feux de circulation adaptatifs coordonnés par la blockchain et expérimente des fonctions de hachage basées sur des automates cellulaires.

**Avancement actuel**
- **Network artifacts:** `network/channel-artifacts/` et `network/crypto-config/` sont fournis (genesis block, channel tx, anchor txs).
- **Scripts réseau:** `network/scripts/generate-artifacts.sh`, `network/scripts/network-up.sh`, `network/scripts/deploy-chaincode.sh` prêts à l'emploi pour Fabric v2.x.
- **Chaincode:** JavaScript chaincode dans `chaincode/traffic-light/` avec `package.json`, `index.js` et modules de hachage expérimentaux dans `chaincode/traffic-light/hash/`.
- **Expérimentations de hachage:** `cellular_automaton.py` (fonction de hachage adaptative), `hash_analysis.py` (benchmarks et tests).
- **Helpers:** `setup.sh` pour vérifier/préparer l'environnement et installer les binaires Fabric si nécessaire.

Prérequis (sur votre machine)
- **Docker** et **Docker Compose**
- **Node.js >= 18** et `npm`
- **Python 3** (pour les tests de hachage)
- **Hyperledger Fabric binaries** (`cryptogen`, `configtxgen`, `peer`) — `./setup.sh` peut aider à les installer dans `~/fabric-samples/bin`
- Ressources: recommander ≥4GB RAM libre pour exécuter Fabric containers.

Rapide guide d'exécution (Local)
1. (Optionnel) Préparer l'environnement et installer Fabric tools:

```bash
./setup.sh
source ~/.bashrc
```

2. Installer les dépendances du chaincode (sur l'hôte):

```bash
cd chaincode/traffic-light
npm install
```

3. (Si vous devez régénérer) Générer les artifacts crypto / channel:

```bash
cd network
./scripts/generate-artifacts.sh
```

4. Démarrer le réseau Hyperledger Fabric:

```bash
cd network
./scripts/network-up.sh
```

ou, si vous préférez directement Docker Compose:

```bash
docker-compose -f network/docker-compose-net.yml up -d
```

5. Créer le canal (si nécessaire) et joindre les peers:

```bash
cd network/scripts
./create-channel.sh
```

6. Déployer le chaincode (l'installation, approbation et commit):

```bash
cd network
./scripts/deploy-chaincode.sh
```

7. Tester / initialiser le chaincode:

```bash
cd network/scripts
./test-chaincode.sh init
./test-chaincode.sh test
```

Tests et outils de hachage (hors Fabric)
- Exécuter le test rapide CA hash:

```bash
python3 chaincode/traffic-light/quick_test.py
```
- Générer l'analyse complète:

```bash
python3 chaincode/traffic-light/hash/hash_analysis.py
```

Vérifications utiles
- Vérifier que les binaires Fabric sont accessibles:

```bash
peer version
cryptogen version
configtxgen --version
```
- Vérifier les containers Docker:

```bash
docker ps
docker logs -f peer0.org1.example.com
```
- Vérifier le chaincode installé et committé:

```bash
docker exec cli peer lifecycle chaincode queryinstalled
docker exec cli peer lifecycle chaincode querycommitted --channelID traffic-channel --name traffic-light
```

Remarques et points d'attention
- `deploy-chaincode.sh` utilise le chemin interne `${CHAINCODE_PATH}` pour le packaging; vérifiez que `docker-compose-net.yml` monte correctement le dossier `chaincode` dans le conteneur `cli`.
- `index.js` exporte `./lib/trafficLightContract` — assurez-vous que `chaincode/traffic-light/lib/trafficLightContract.js` existe et implémente les transactions nécessaires.
- `package.json` du chaincode requiert Node >=18.
- Les artifacts présents évitent de régénérer si vous voulez tester rapidement; toutefois, si vous modifiez `crypto-config.yaml` ou `configtx.yaml`, régénérez les artifacts.

Prochaines étapes suggérées
- Vérifier et compléter `lib/trafficLightContract` si nécessaire.
- Ajouter un petit tableau de bord / simulateur consommant les événements Fabric (JS SDK) pour visualiser les transactions en temps réel.
- Ajouter des tests unitaires pour le chaincode et des scripts Makefile pour simplifier les commandes.

Besoin d'aide ? Options que je peux faire pour vous:
- (A) Exécuter `quick_test.py` et vous envoyer la sortie ici.
- (B) Générer un `RUNNING.md` avec commandes exactes et dépannage.
- (C) Inspecter `chaincode/traffic-light/lib` et `network/docker-compose-net.yml` pour confirmer les montages et chemins avant tentative de déploiement.

---

