# Mini SOC Agentique - Blockchain Security Monitoring

## 📋 Vue d'ensemble

Système de **Security Operations Center (SOC)** autonome qui surveille la blockchain de gestion du trafic en temps réel. Détecte, analyse et répond automatiquement aux anomalies de sécurité en utilisant l'IA locale (LM Studio).

### Architecture des 4 Agents

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   SENSOR    │───→│  COLLECTOR   │───→│  ANALYZER   │───→│  RESPONDER  │
│   Port 6001 │    │  Port 6002   │    │  Port 6003  │    │  Port 6004  │
│             │    │              │    │   (LM       │    │             │
│  Détecte    │    │  Centralise  │    │   Studio)   │    │  Exécute    │
│  Anomalies  │    │  Événements  │    │  Analyse IA │    │  Actions    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
      ↑
      │
┌─────────────────┐
│   SIMULATOR     │
│   Port 3000     │
│ (Blockchain TX) │
└─────────────────┘
```

## 🎯 Objectifs Pédagogiques

- ✅ Comprendre l'architecture d'un SOC
- ✅ Découvrir les agents logiciels coopérants
- ✅ Intégrer une IA locale (LM Studio) pour l'analyse
- ✅ Observer le flux complet: détection → analyse → décision → action
- ✅ Identifier les limites d'un SOC automatisé

## 🚀 Installation et Démarrage

### Prérequis

```bash
# Node.js >= 18
node --version

# (Optionnel) LM Studio pour analyse IA
# Télécharger: https://lmstudio.ai/
# Modèle recommandé: Mistral 7B Instruct
```

### 1. Installation des dépendances

```bash
cd soc-agents
npm install
```

### 2. Démarrer tous les agents

```bash
./start-soc.sh
```

Cela démarre dans l'ordre:
1. **SENSOR** (Port 6001) - Détection d'anomalies
2. **COLLECTOR** (Port 6002) - Centralisation
3. **ANALYZER** (Port 6003) - Analyse IA
4. **RESPONDER** (Port 6004) - Réponses automatiques

### 3. (Optionnel) Démarrer LM Studio

```bash
# 1. Lancer LM Studio
# 2. Charger un modèle (ex: Mistral 7B Instruct)
# 3. Démarrer le serveur local sur http://127.0.0.1:1234
# 4. L'Analyzer se connectera automatiquement
```

Sans LM Studio, l'Analyzer utilise un système de règles (fallback).

## 🧪 Tests

### Test automatique

```bash
./test-soc.sh
```

Injecte 5 types d'anomalies:
1. Transition d'état invalide
2. Manipulation de densité
3. Abus du mode urgence
4. Changements d'état rapides
5. Déclenchement non autorisé

### Test manuel avec le simulateur

```bash
# Terminal 1: Démarrer le simulateur
cd ../simulator
node server.js

# Terminal 2: Trigger anomalie (densité invalide)
curl -X POST http://localhost:3000/api/traffic/override \
  -H 'Content-Type: application/json' \
  -d '{"lightId":"INT-001-NORTH","density":5.0}'

# Terminal 3: Voir les réponses SOC
tail -f soc-agents/logs/alerts.json
```

## 📊 Surveillance

### Logs en temps réel

```bash
# Tous les logs agents
tail -f logs/*.log

# Anomalies détectées
tail -f logs/sensor-anomalies.json

# Alertes générées
tail -f logs/alerts.json

# Sources bloquées
tail -f logs/blocked.json

# Tickets d'investigation
tail -f logs/tickets.json
```

### API Health Checks

```bash
# Vérifier chaque agent
curl http://localhost:6001/health  # Sensor
curl http://localhost:6002/health  # Collector
curl http://localhost:6003/health  # Analyzer
curl http://localhost:6004/health  # Responder

# Statistiques
curl http://localhost:6001/stats
curl http://localhost:6002/stats
curl http://localhost:6004/stats

# Sources bloquées
curl http://localhost:6004/blocked
```

## 🔍 Détails des Agents

### 1. SENSOR (Port 6001)

**Rôle:** Détecte les anomalies dans les transactions blockchain

**Règles de détection:**
- ❌ Transition d'état invalide (ex: GREEN → RED direct)
- ❌ Densité hors limites (< 0 ou > 1.0)
- ❌ Pic de densité (>50% changement)
- ❌ Abus mode urgence (>3 fois en 5 min)
- ❌ Changements rapides (>10 en 1 min)
- ❌ Organisation non autorisée

**Endpoints:**
- `POST /event` - Recevoir événement du simulateur
- `POST /inject-anomaly` - Test manuel
- `GET /stats` - Statistiques

### 2. COLLECTOR (Port 6002)

**Rôle:** Centralise et stocke les événements

**Fonctions:**
- Authentification par token (X-SOC-Token)
- Stockage persistant (JSON)
- Forwarding vers Analyzer
- Statistiques par sévérité/type

**Endpoints:**
- `POST /collect` - Collecter événement
- `GET /events?limit=50&severity=HIGH` - Requête
- `GET /stats` - Statistiques

### 3. ANALYZER (Port 6003)

**Rôle:** Analyse IA via LM Studio

**Analyse:**
- **Avec LLM:** Classification sémantique, recommandations contextuelles
- **Sans LLM:** Règles basées sur sévérité

**Prompt LLM:**
```
Analyser événement de sécurité blockchain
→ Retourner JSON structuré:
  {severity, category, recommended_action, explanation, confidence}
```

**Actions recommandées:**
- `monitor` - Surveiller
- `alert` - Alerter équipe
- `block` - Bloquer source
- `investigate` - Créer ticket
- `escalate` - Escalade urgente

**Endpoints:**
- `POST /analyze` - Analyser événement
- `GET /llm-status` - État LM Studio

### 4. RESPONDER (Port 6004)

**Rôle:** Exécute les actions automatiques

**Actions:**

1. **BLOCK** → Bloque la source
   - Ajoute à liste noire
   - Log dans `blocked.json`
   - Simule règle iptables/blockchain

2. **ALERT** → Envoie alerte
   - Log dans `alerts.json`
   - Simule email/Slack

3. **INVESTIGATE** → Crée ticket
   - ID unique `TICKET-{timestamp}`
   - Log dans `tickets.json`
   - Simule Jira/GitHub

4. **ESCALATE** → Escalade critique
   - Alert + Ticket
   - Log dans `escalations.json`

5. **MONITOR** → Surveillance passive
   - Log dans `monitoring.json`

**Endpoints:**
- `POST /respond` - Exécuter action
- `GET /blocked` - Liste bloqués
- `POST /unblock` - Débloquer source

## 📈 Flux d'un Événement

### Exemple: Transition Invalide

```
1. SIMULATOR détecte: GREEN → RED (bypass YELLOW)
   ↓
2. SENSOR analyse:
   ✓ Détecte: invalid_state_transition
   ✓ Sévérité: HIGH
   ✓ Forward → COLLECTOR
   ↓
3. COLLECTOR:
   ✓ Stocke: collected-events.json
   ✓ Forward → ANALYZER
   ↓
4. ANALYZER (LM Studio):
   ✓ Prompt: "Analyser transition GREEN→RED"
   ✓ LLM répond:
     {
       "severity": "HIGH",
       "category": "state_manipulation",
       "recommended_action": "alert",
       "explanation": "Invalid state bypass - security risk",
       "confidence": 0.92
     }
   ✓ Forward → RESPONDER
   ↓
5. RESPONDER:
   ✓ Action: ALERT
   ✓ Log: alerts.json
   ✓ Console: ⚠️ SECURITY ALERT
```

## 🛡️ Anomalies Détectées

| Type | Sévérité | Action Typique | Exemple |
|------|----------|----------------|---------|
| Invalid State Transition | HIGH | Alert | GREEN→RED direct |
| Density Manipulation | CRITICAL | Block | density = 5.0 |
| Emergency Abuse | HIGH | Investigate | 5 urgences en 2 min |
| Rapid State Changes | HIGH | Alert | 15 changements/min |
| Unauthorized Emergency | CRITICAL | Block + Escalate | Org1 trigger emergency |
| Density Spike | MEDIUM | Monitor | +60% density sudden |

## 🔧 Configuration

### Activer/Désactiver SOC

```javascript
// Dans simulator/server.js
const SOC_ENABLED = process.env.SOC_ENABLED !== 'false';

// Désactiver
export SOC_ENABLED=false
node server.js
```

### Modifier Token SOC

```javascript
// Changer dans tous les fichiers:
const SOC_TOKEN = 'blockchain-soc-2024';
```

### Personnaliser Règles Sensor

```javascript
// sensor.js - Ajouter nouvelle règle
if (event.vehicleCount > 100) {
  return {
    type: 'traffic_overflow',
    severity: 'HIGH',
    src: event.lightId,
    details: `Vehicle count: ${event.vehicleCount}`,
    timestamp: Date.now()
  };
}
```

## 🧠 Intégration LM Studio

### Configuration LM Studio

1. **Télécharger:** https://lmstudio.ai/
2. **Charger modèle:** Mistral-7B-Instruct (recommandé)
3. **Démarrer serveur:**
   - Port: 1234
   - API: OpenAI-compatible
   - URL: http://127.0.0.1:1234/v1/chat/completions

### Tester LM Studio

```bash
# Vérifier connexion
curl http://127.0.0.1:1234/v1/models

# Test prompt
curl http://127.0.0.1:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [{"role": "user", "content": "Test"}],
    "temperature": 0.3
  }'
```

## 📝 Livrables du Projet

### 1. Schéma Architecture
✅ Voir section "Architecture des 4 Agents" ci-dessus

### 2. Tableau Rôles
✅ Voir section "Détails des Agents"

### 3. Captures d'Écran
```bash
# Démarrer système
./start-soc.sh

# Injecter anomalie
./test-soc.sh

# Capturer:
# - Terminal Sensor (anomalie détectée)
# - Terminal Analyzer (analyse IA)
# - Terminal Responder (action exécutée)
# - Fichier alerts.json
```

### 4. Mini-Rapport (1 page)

**Contenu:**
- ✅ Codes des 4 agents (fournis)
- ✅ Chronologie événement (voir "Flux d'un Événement")
- ✅ Analyse comportement IA (voir "Analyzer")
- ✅ Propositions amélioration (voir ci-dessous)

## 💡 Améliorations Proposées

### Points Forts
✅ Détection temps réel  
✅ Analyse IA contextuelle  
✅ Réponses automatiques  
✅ Logs persistants  
✅ Architecture modulaire  

### Limites Identifiées
❌ Pas de supervision humaine obligatoire  
❌ Erreurs IA possibles (hallucinations)  
❌ Pas de correlation entre événements multiples  
❌ Token simple (sécurité limitée)  
❌ Pas de persistance blockchain des décisions SOC  

### Améliorations Suggérées

1. **Heuristique + IA Hybride**
   ```javascript
   // Si confiance IA < 0.7 → validation humaine
   if (analysis.confidence < 0.7) {
     createApprovalTicket(event, analysis);
   }
   ```

2. **Machine Learning**
   - Apprentissage des patterns d'attaque
   - Détection anomalies par clustering
   - Réduction faux positifs

3. **Blockchain des Décisions SOC**
   ```javascript
   // Enregistrer décisions SOC sur chaincode
   await fabricClient.recordSOCDecision({
     event, analysis, action, timestamp
   });
   // → Audit trail immuable
   ```

4. **Correlation d'Événements**
   ```javascript
   // Détecter attaque distribuée
   if (sameTypeEvents.length > 5 && fromDifferentSources) {
     escalate('Distributed attack detected');
   }
   ```

5. **Dashboard Web Temps Réel**
   - Visualisation événements (D3.js)
   - Tableau de bord Grafana
   - Alertes WebSocket

6. **SIEM Integration**
   - Export vers Splunk/ELK
   - Corrélation avec autres sources
   - Threat intelligence feeds

## 🎓 Questions Pédagogiques

### Q1: Rôle de chaque agent?
**Réponse:** Voir section "Détails des Agents"

### Q2: Flux complet d'un incident?
**Réponse:** Voir section "Flux d'un Événement"

### Q3: Comment l'IA automatise la classification?
**Réponse:**
- LLM analyse contexte sémantique
- Génère catégorie + action + confiance
- Fallback règles si LLM indisponible

### Q4: Points forts / limites architecture?
**Réponse:** Voir "Améliorations Proposées"

### Q5: Améliorer la fiabilité?
**Réponse:**
- Validation humaine pour confiance < 0.7
- Logs blockchain immuables
- Tests adversariaux IA
- Supervision SIEM

## 🛑 Arrêter le Système

```bash
./stop-soc.sh
```

## 📞 Support

Pour questions académiques:
- Cours: Master IASD - Blockchain
- Professeur: Pr. Ikram BEN ABDEL OUAHAB

---

**Auteurs:** Amina Louazir, Salma Maaquili, Hamza Ait Youssef, Diae Khayatti  
**Date:** Janvier 2026  
**Projet:** Adaptive Traffic Blockchain + Mini SOC Agentique
