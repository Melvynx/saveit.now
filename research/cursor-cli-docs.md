# Cursor CLI — Résumé officiel et pratique

## Points clés
- Le binaire `cursor` est un wrapper de la CLI VS Code (`code`), avec des flags et comportements quasi identiques.
- Aucune « CLI d’IA » dédiée : les fonctions d’IA (chat, génération, modèles) se pilotent dans l’éditeur, pas en ligne de commande.
- L’installation du binaire se fait via l’app Cursor (commande shell) ou via Homebrew sur macOS; Windows et Linux disposent d’installateurs dédiés.
- La CLI sert surtout à ouvrir des dossiers/fichiers, gérer les extensions, faire des diffs, contrôler des fenêtres et lire l’état.
- L’authentification (Compte Cursor, BYO keys) s’effectue dans l’UI; la CLI n’a pas de flux de login séparé.

## Installation & commandes
- macOS (Homebrew) :
  ```bash
  brew install --cask cursor
  ```
  Puis, si besoin, installer la commande shell depuis Cursor: « Shell Command: Install ‘cursor’ command in PATH ».
- Windows : installeur depuis le site Cursor; le binaire ajoute généralement `cursor.exe` accessible depuis PowerShell/CMD.
- Linux : AppImage/DEB/RPM selon la distribution; ajouter `cursor` au PATH si nécessaire.

Commandes courantes (héritées de VS Code) :
```bash
# Ouvrir un dossier/fichier
cursor .
cursor path/to/file.ts

# Fenêtres
cursor --new-window      # nouvelle fenêtre
cursor --reuse-window    # réutiliser la fenêtre courante

# Navigation
cursor --goto file:10:5  # ligne 10, colonne 5

# Diff / Merge
cursor --diff fileA.ts fileB.ts
cursor --wait            # attendre la fermeture (utile dans des scripts)

# Extensions
cursor --install-extension ms-python.python
cursor --list-extensions
cursor --uninstall-extension publisher.name
cursor --extensions-dir ~/.cursor-extensions

# Session / debug
cursor --user-data-dir ~/.cursor-user
cursor --disable-extensions
cursor --locale=fr
cursor --status
cursor --verbose
cursor --version
```
Note: l’option `--file-write`/`--file-uri` et d’autres flags avancés existent comme dans VS Code; `cursor --help` affiche la liste effective selon la version.

## Config & intégrations
- PATH & shell: via la palette de commandes de Cursor, installer « cursor » dans le PATH (similaire à VS Code). Vérifier `which cursor` ou `cursor --version`.
- Extensions: la CLI gère l’installation, la liste et la suppression d’extensions. Le répertoire peut être isolé avec `--extensions-dir`.
- Profils/données: `--user-data-dir` permet de séparer des profils (utile en CI ou tests).
- IA & modèles: la sélection de modèles (OpenAI, Claude, etc.) et les clés BYO se configurent dans l’application. La CLI ne fournit pas de sous‑commandes de chat/génération.
- Intégration outillage: `--wait` facilite l’usage dans des scripts (lancer un diff/merge et reprendre après fermeture). `--status` retourne l’état de l’instance.

## Limites & licence
- Portée de la CLI: c’est une interface de lancement/gestion héritée de VS Code; pas d’API ou d’automatisation IA headless officielle via CLI.
- Compatibilité flags: la majorité des flags de VS Code fonctionnent, mais quelques options liées à fonctionnalités spécifiques peuvent varier selon la version Cursor.
- Authentification: pas de `cursor login`; la session utilisateur, la facturation et les clés IA relèvent de l’UI.
- Environnements distants: les fonctionnalités Remote/Cloud Workspaces sont pilotées dans l’app; la CLI n’expose pas d’API publique pour provisionner/contrôler ces environnements.
- Licence & conditions: l’usage de Cursor respecte les Conditions d’utilisation et Politique de confidentialité de Cursor; l’usage des modèles IA externes est soumis aux conditions des fournisseurs.

## Sources (URLs)
- https://www.cursor.com
- https://cursor.com/docs
- https://help.cursor.com/en
- https://code.visualstudio.com/docs/editor/command-line
- https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line
- https://github.com/Homebrew/homebrew-cask/blob/HEAD/Casks/c/cursor.rb
- https://cursor.com/faq
- https://cursor.com/terms
- https://cursor.com/privacy

