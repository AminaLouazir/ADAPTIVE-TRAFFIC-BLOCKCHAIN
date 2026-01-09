# 🚀 Quick Start Guide - Mini SOC Agentique

## ⚡ Démarrage Rapide (5 minutes)

### Étape 1: Démarrer le SOC

```bash
cd soc-agents
./start-soc.sh
```

Vous devriez voir:
```
╔════════════════════════════════════════════════════════╗
║         Mini SOC System - RUNNING                      ║
╚════════════════════════════════════════════════════════╝

🔍 SENSOR     → http://localhost:6001
📦 COLLECTOR  → http://localhost:6002
🧠 ANALYZER   → http://localhost:6003
⚡ RESPONDER  → http://localhost:6004
```

### Étape 2: Tester la Détection

```bash
# Dans un nouveau terminal
./test-soc.sh
```

Cela injecte 5 types d'anomalies et affiche les résultats.

### Étape 3: Voir les Réponses en Temps Réel

```bash
# Terminal 1: Alertes
tail -f logs/alerts.json

# Terminal 2: Sources bloquées
tail -f logs/blocked.json

# Terminal 3: Tous les logs
tail -f logs/*.log
```

### Étape 4: Intégration avec le Simulateur

```bash
# Terminal 1: Démarrer simulateur traffic
cd ../simulator
node server.js

# Terminal 2: Déclencher anomalie
curl -X POST http://localhost:3000/api/traffic/override \
  -H 'Content-Type: application/json' \
  -d '{"density": 5.0}'

# Le SOC détectera automatiquement l'anomalie!
```

### Étape 5: Activer l'IA (Optionnel)

```bash
# 1. Installer LM Studio: https://lmstudio.ai/
# 2. Charger un modèle (Mistral 7B Instruct recommandé)
# 3. Démarrer le serveur local (port 1234)
# 4. Le SOC s'y connectera automatiquement
```

Sans LM Studio, le système fonctionne avec des règles.

## 📊 Vérifier le Fonctionnement

```bash
# Statistiques
curl http://localhost:6001/stats
curl http://localhost:6002/stats
curl http://localhost:6004/stats

# Health check
curl http://localhost:6001/health
curl http://localhost:6002/health
curl http://localhost:6003/health
curl http://localhost:6004/health
```

## 🛑 Arrêter le SOC

```bash
./stop-soc.sh
```

## 🎯 Exemple Complet de Test

### Scénario: Attaque par manipulation de densité

```bash
# 1. Démarrer le SOC
./start-soc.sh

# 2. Attendre 5 secondes

# 3. Injecter anomalie CRITIQUE
curl -X POST http://localhost:6001/inject-anomaly \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "density_manipulation",
    "severity": "CRITICAL",
    "src": "INT-001-NORTH",
    "details": "Density value: 10.0 (limit: 1.0)",
    "timestamp": '$(date +%s000)'
  }'

# 4. Observer le flux dans les logs:
# - SENSOR détecte l'anomalie
# - COLLECTOR la centralise
# - ANALYZER décide de BLOQUER
# - RESPONDER bloque la source INT-001-NORTH

# 5. Vérifier le blocage
curl http://localhost:6004/blocked
# → {"count":1,"sources":["INT-001-NORTH"]}
```

## 📝 Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `sensor.js` | Détecte les anomalies |
| `collector.js` | Centralise les événements |
| `analyzer.js` | Analyse avec IA |
| `responder.js` | Execute les actions |
| `logs/alerts.json` | Toutes les alertes |
| `logs/blocked.json` | Sources bloquées |
| `README.md` | Documentation complète |

## 🎓 Pour le Rapport

### Captures à Faire

1. **Démarrage du système**
   ```bash
   ./start-soc.sh
   # Screenshot: 4 agents démarrés
   ```

2. **Test d'anomalie**
   ```bash
   ./test-soc.sh
   # Screenshot: Injection de 5 anomalies
   ```

3. **Réponse de l'Analyzer**
   ```bash
   tail -f logs/analyzer.log
   # Screenshot: Analyse IA + recommandation
   ```

4. **Action du Responder**
   ```bash
   tail -f logs/alerts.json
   # Screenshot: Alerte générée
   ```

5. **Statistiques**
   ```bash
   curl http://localhost:6002/stats | jq
   # Screenshot: Statistiques JSON
   ```

### Questions du Rapport

1. **Schéma architecture**: Voir README.md section "Architecture"
2. **Rôle agents**: Voir README.md section "Détails des Agents"
3. **Flux événement**: Voir README.md section "Flux d'un Événement"
4. **Analyse critique**: Voir README.md section "Améliorations Proposées"

## 🆘 Dépannage

### Erreur: Port déjà utilisé
```bash
# Trouver et tuer le processus
lsof -ti:6001 | xargs kill -9
lsof -ti:6002 | xargs kill -9
lsof -ti:6003 | xargs kill -9
lsof -ti:6004 | xargs kill -9
```

### Erreur: Cannot find module 'express'
```bash
cd soc-agents
npm install
```

### LM Studio ne se connecte pas
```bash
# Vérifier que LM Studio tourne
curl http://127.0.0.1:1234/v1/models

# Si erreur, c'est normal - le système fonctionne sans IA
# Il utilisera les règles de fallback
```

## ✅ Checklist Démo

- [ ] SOC agents démarrés (4/4)
- [ ] Test anomalies réussi (5/5)
- [ ] Logs générés (alerts.json, blocked.json)
- [ ] Statistiques accessibles
- [ ] (Optionnel) LM Studio connecté
- [ ] Captures d'écran prises
- [ ] Rapport rédigé

---

**Prêt pour la démonstration! 🎉**
