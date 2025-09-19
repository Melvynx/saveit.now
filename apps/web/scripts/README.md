# Scripts de Test de Performance pour la Recherche Optimisée

Ce dossier contient des scripts pour tester et valider les améliorations de performance de la recherche optimisée implémentée dans le Task 3.

## 📁 Scripts Disponibles

### 1. `test-search-performance.ts`
**Script de benchmark comparatif entre la recherche originale et optimisée**

```bash
# Exécuter le test de performance
pnpm test:search-performance

# Ou directement avec tsx
npx tsx scripts/test-search-performance.ts
```

**Ce qu'il teste :**
- ✅ Comparaison des temps d'exécution (recherche optimisée vs originale)
- ✅ Utilisation de la mémoire
- ✅ Taux de succès des requêtes
- ✅ Consistance des résultats
- ✅ Performance par type de recherche (tags, vector, domain, combinée)

**Suites de tests incluses :**
- 🏷️ **Tag Search** : Recherche par tags simples et multiples
- 🧠 **Vector Search** : Recherche sémantique avec embeddings
- 🌐 **Domain Search** : Recherche par domaine
- 🔀 **Combined Search** : Recherche combinant plusieurs stratégies
- 🔧 **Complex Queries** : Requêtes complexes avec filtres

### 2. `monitor-database-queries.ts`
**Script de monitoring des requêtes de base de données**

```bash
# Exécuter le monitoring des requêtes DB
pnpm test:database-queries

# Ou directement avec tsx
npx tsx scripts/monitor-database-queries.ts
```

**Ce qu'il analyse :**
- 📊 Nombre de requêtes DB exécutées
- ⏱️ Temps d'exécution de chaque requête
- 🔍 Détail des requêtes SQL exécutées
- 📈 Comparaison recherche optimisée vs originale
- 💾 Overhead réseau vs temps de traitement

**Métriques collectées :**
- Nombre total de requêtes
- Temps total des requêtes DB
- Temps de traitement/réseau
- Réduction du nombre de round-trips

### 3. Script combiné
```bash
# Exécuter tous les tests de performance
pnpm benchmark:search
```

## 🎯 Objectifs de Performance

Les scripts valident les objectifs suivants :

### ✅ Réduction des Requêtes DB
- **Objectif** : Passer de 3+ requêtes à 1 seule requête
- **Mesure** : Nombre de calls à `prisma.$queryRaw*` et méthodes Prisma

### ✅ Amélioration des Temps de Réponse
- **Objectif** : 50%+ d'amélioration sur les requêtes complexes
- **Mesure** : Temps total d'exécution end-to-end

### ✅ Réduction de l'Utilisation Mémoire
- **Objectif** : 70%+ de réduction de l'usage mémoire
- **Mesure** : Heap memory usage avant/après

### ✅ Consistance des Résultats
- **Objectif** : Résultats identiques entre les deux implémentations
- **Mesure** : Comparaison du nombre et de l'ordre des résultats

## 🔧 Configuration

### Variables d'Environnement
```bash
# ID utilisateur pour les tests (optionnel)
TEST_USER_ID=your-test-user-id

# Si non défini, le script utilisera le premier utilisateur disponible
```

### Prérequis
- ✅ Base de données accessible
- ✅ Au moins un utilisateur en DB
- ✅ Quelques bookmarks pour tester
- ✅ Variables d'environnement configurées (OpenAI, Redis, etc.)

## 📊 Résultats Attendus

### Performance Typique (recherche optimisée)
```
🚀 Optimized Search: 45ms ✅
🐢 Original Search: 127ms ✅
🏆 Performance Improvement: 64.6%

🔢 Query Count:
  • Optimized: 1 query
  • Original: 4 queries
  • Reduction: 3 queries (75%)

💾 Memory Usage:
  💚 Memory Improvement: 71.2%
```

### Indicateurs de Succès
- ✅ **Query Reduction** : 75%+ de réduction du nombre de requêtes
- ✅ **Performance** : 50%+ d'amélioration du temps de réponse
- ✅ **Memory** : 70%+ de réduction de l'usage mémoire
- ✅ **Reliability** : 100% de taux de succès
- ✅ **Consistency** : Résultats identiques

## 🐛 Debugging

### Si les tests échouent :

1. **Vérifier la connexion DB**
```bash
# Test rapide de connexion
npx prisma db push
```

2. **Vérifier les variables d'environnement**
```bash
# Afficher les variables importantes
echo $DATABASE_URL
echo $OPENAI_API_KEY
echo $UPSTASH_REDIS_REST_URL
```

3. **Vérifier la présence de données**
```bash
# Compter les utilisateurs et bookmarks
npx prisma studio
```

4. **Mode debug**
```typescript
// Activer les logs détaillés dans les scripts
console.log = (...args) => console.info('[DEBUG]', ...args);
```

## 🔍 Analyse des Résultats

### Interprétation des Métriques

**Query Count Reduction :**
- `3+ → 1 query` = ✅ Objectif atteint
- `2 → 1 query` = ✅ Amélioration
- `Pas de changement` = ⚠️ Vérifier l'implémentation

**Performance Improvement :**
- `>50%` = 🚀 Excellent
- `20-50%` = ✅ Bon
- `<20%` = ⚠️ Acceptable
- `Régression` = ❌ Problème

**Memory Usage :**
- `Réduction >70%` = 🚀 Excellent
- `Réduction 30-70%` = ✅ Bon
- `Pas de changement` = ➖ Neutre
- `Augmentation` = ⚠️ À investiguer

## 📝 Reporting

Les scripts génèrent des rapports détaillés incluant :
- 📊 Statistiques de performance par suite de tests
- 🔍 Détail des requêtes SQL exécutées
- 📈 Graphiques de comparaison
- ✅ Validation des objectifs de performance
- 🐛 Rapport d'erreurs éventuelles

Utilisez ces données pour valider que l'optimisation fonctionne comme prévu ! 🎉