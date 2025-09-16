# Claude Code — Synthèse de la documentation officielle

## Points clés

- Claude Code: assistant de développement d’Anthropic pour IDE et CLI, centré sur la lecture/écriture de code, la navigation multi‑fichiers et l’exécution guidée de commandes.
- Intégrations IDE: extensions officielles pour VS Code et JetBrains (chat contextuel, actions inline, aperçu des diffs, exécution de tests/commandes avec approbations).
- CLI: outil en terminal pour dialoguer avec Claude Code dans un repo, proposer des modifications et, si autorisé, lancer des commandes; confirmations requises pour actions sensibles.
- Projets & contexte: indexation contextuelle du dépôt/projet afin d’améliorer la compréhension du code, recherche sémantique, et propositions de refactorisation fondées sur un large contexte.
- Sécurité & confidentialité: données chiffrées en transit/au repos; par défaut, les données API/entreprise ne sont pas utilisées pour l’entraînement; politiques et contrôles d’accès détaillés dans la documentation Anthropic.

## Installation & commandes

- VS Code: installer l’extension officielle « Claude »/« Claude Code » depuis le Marketplace, puis « Sign in » avec votre compte Anthropic. Activer la lecture/écriture et l’exécution de commandes selon vos besoins; un panneau « Chat » permet d’expliquer/générer/modifier du code et d’afficher les diffs proposés.
- JetBrains (IntelliJ, WebStorm, etc.): installer le plugin officiel depuis le Marketplace JetBrains, se connecter, puis autoriser les permissions (lecture, propositions de changements, éventuellement écriture et exécution de commandes) au niveau du projet.
- CLI: disponible pour travailler depuis le terminal au sein d’un repo. Flux typique: se connecter (login), sélectionner/configurer le répertoire, poser des requêtes (« ask »/chat), demander des modifications (avec aperçu de patch/diff), puis appliquer si approuvé. Les commandes exactes et packages d’installation varient selon OS; consulter la page CLI officielle (voir Sources).
- Bonnes pratiques: activer le mode « approbation requise » pour écritures disque et commandes; demander à Claude des diffs avant d’appliquer; garder le contrôle sur la portée (répertoires autorisés) et les secrets.

## Config & intégrations

- Portée du projet: choisir les dossiers indexés (mono‑repo, apps/packages ciblés) pour limiter l’exposition et améliorer la pertinence du contexte.
- Permissions granulaires: lecture seule, proposition de changements, écriture de fichiers, exécution de commandes; chaque catégorie peut exiger une confirmation explicite.
- Outils externes: possibilité de lancer linters, tests, build, scripts package.json, etc., depuis le chat/CLI, avec traces et sorties relayées dans l’interface.
- Authentification & organisations: connexion via compte Anthropic; pour les organisations, politiques centralisées (rétention, partage, modèles autorisés) et audit selon l’offre.
- Compatibilité: VS Code et JetBrains récents; projets polyglottes (JS/TS, Python, Java, Go, etc.); interaction avec gestionnaires de paquets et systèmes de build usuels.

## Limites & licence

- Limites d’usage: quotas et débit varient selon l’abonnement (gratuit, Pro, Enterprise); tâches lourdes (indexation vaste, gros diffs) peuvent être segmentées; temps d’exécution et taille de contexte soumis aux limites de modèle.
- Confirmation requise: par design, l’écriture disque et l’exécution de commandes sont protégées par des invites d’approbation; certaines actions peuvent être désactivées globalement.
- Données & confidentialité: Anthropic indique ne pas entraîner ses modèles sur les données des clients API/entreprise par défaut; des options de rétention, masquage, régions et contrôles de partage sont disponibles. Vérifier la politique de confidentialité et le Trust Center.
- Contenu sensible: éviter d’envoyer secrets/credentials non nécessaires; privilégier des variables d’environnement/gestionnaires de secrets; contrôler la portée des fichiers partagés avec l’agent.
- Licence: Claude Code est un produit propriétaire Anthropic; les extensions Marketplace et la CLI sont couvertes par les Conditions d’utilisation Anthropic et, le cas échéant, par les conditions des marketplaces (VS Code/JetBrains).

## Sources (URLs)

- https://claude.ai/code
- https://docs.anthropic.com/claude
- https://docs.anthropic.com/claude/docs/claude-code
- https://docs.anthropic.com/claude/docs/claude-code-cli
- https://docs.anthropic.com/claude/docs/claude-code-vscode
- https://docs.anthropic.com/claude/docs/claude-code-jetbrains
- https://docs.anthropic.com/claude/docs/permissions
- https://docs.anthropic.com/claude/docs/safety
- https://www.anthropic.com/privacy
- https://www.anthropic.com/terms

