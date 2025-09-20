Codex CLI — Résumé de la documentation officielle

- Points clés: Agent de codage local (TUI) avec mode non‑interactif, sandbox/approvals configurables, intégration MCP (clients/serveur), configuration riche via TOML, authentification ChatGPT ou clé API, prise en charge d’images, complétions shell, logs/traces, compatibilité avec fournisseurs OpenAI‑compatibles (y compris Ollama/Azure) et prise en charge ZDR.
- Plateformes: macOS 12+, Linux (Ubuntu 20.04+/Debian 10+). Windows recommandé via WSL2. Binaire précompilé ou installation via npm/Homebrew.
- Licence: Apache‑2.0. Projet écrit en Rust, actif, avec garde‑fous par défaut (lecture seule/approbations) et options d’escalade explicites.

Installation & commandes

- Installation: `npm i -g @openai/codex` ou `brew install codex`. Alternativement, télécharger un binaire depuis « Releases » (macOS arm64/x86_64, Linux x86_64/arm64) et l’extraire/renommer en `codex`.
- Démarrage TUI: `codex` (optionnellement avec prompt initial: `codex "…"`).
- Mode automatisation (non‑interactif/CI): `codex exec "…"` (par défaut en approval « never »). Exemple CI: export `OPENAI_API_KEY` puis `codex exec --full-auto "…"`.
- Flags essentiels: `--model/-m`, `--ask-for-approval/-a`, `--sandbox {read-only|workspace-write|danger-full-access}`, `--cd/-C <dir>`, `-i/--image <fichiers, séparés par virgules>`.
- Authentification: `codex` puis « Sign in with ChatGPT » (recommandé pour les abonnements ChatGPT). Alternative: `export OPENAI_API_KEY=…`. Forcer la méthode via `preferred_auth_method` (CLI ou config).
- Aide & complétions: `codex completion {bash|zsh|fish}`. Raccourcis TUI: `@` (recherche de fichiers), collage d’images, Esc–Esc pour rééditer un message précédent.

Config & intégrations

- Fichier: `~/.codex/config.toml` (ou `$CODEX_HOME/config.toml`). Surcharges possibles via `--config key=value` et flags dédiés. Priorité: CLI > profil actif > fichier TOML > valeurs par défaut.
- Modèles & fournisseurs: `model` (ex: `gpt-5`, `o3`, `o4-mini`), `model_provider` (par défaut `openai`). Bloc `[model_providers.<id>]` permet d’ajouter des providers OpenAI‑compatibles (Chat Completions/Responses), définir `base_url`, `env_key`, `http_headers`, `env_http_headers`, `query_params` (Azure), et réglages réseau par fournisseur (`request_max_retries`, `stream_max_retries`, `stream_idle_timeout_ms`). Exemples: Ollama local, Mistral, Azure OpenAI.
- Raisonement & verbosité: `model_reasoning_effort` (`minimal|low|medium|high`), `model_reasoning_summary` (`auto|concise|detailed|none`), `model_verbosity` (`low|medium|high` pour GPT‑5 via Responses API), `model_supports_reasoning_summaries=true` si nécessaire.
- Sandbox & approvals: `sandbox_mode` (`read-only` par défaut; `workspace-write` écrit dans le répertoire de travail et tmp, `.git/` en lecture seule; `danger-full-access` désactive la sandbox). `approval_policy` (`untrusted`, `on-failure`, `on-request`, `never`). Presets TUI: Read Only, Auto, Full Access.
- MCP: définir `[mcp_servers.<name>]` (`command`, `args`, `env`) pour outiller l’agent; compatibilité avec mcp‑proxy pour SSE. Le CLI peut aussi agir comme serveur MCP expérimental via `codex mcp`.
- Sécurité & conformité: ZDR supporté via `disable_response_storage=true`. Politique d’environnement pour sous‑processus (`[shell_environment_policy]`): hériter `all|core|none`, motifs d’exclusion, `include_only`, et overrides via `set`. Hook de notifications `notify` (appel d’un programme avec payload JSON d’événements, ex: notification desktop).
- Journaux & traces: `RUST_LOG` (par ex. TUI: `codex_core=info,codex_tui=info`). Logs TUI: `~/.codex/log/codex-tui.log` (suivi: `tail -F …`).
- AGENTS.md: mémoire/projet – fichiers `AGENTS.md` global/racine/sous‑dossier fusionnés pour guider le comportement.

Limites & licence

- Portabilité: Windows non officiellement supporté nativement; WSL2 recommandé. Environnements anciens ou noyaux non supportés peuvent nécessiter `danger-full-access` (ou conteneurisation) si la sandbox échoue.
- Permissions: par défaut, réseau bloqué et écriture limitée; modifications hors workspace, accès réseau et opérations Git internes (.git) exigent approbation selon le mode.
- Maturité: CLI open‑source actif, TUI robuste; mode serveur MCP noté expérimental; comportements/valeurs par défaut susceptibles d’évoluer.
- Licence: Apache‑2.0.

Sources (URLs)

- https://github.com/openai/codex
- https://github.com/openai/codex/blob/main/README.md
- https://github.com/openai/codex/blob/main/docs/getting-started.md
- https://github.com/openai/codex/blob/main/docs/config.md
- https://github.com/openai/codex/blob/main/docs/sandbox.md
- https://github.com/openai/codex/blob/main/docs/advanced.md
- https://github.com/openai/codex/blob/main/docs/authentication.md
- https://github.com/openai/codex/blob/main/docs/install.md
- https://github.com/openai/codex/blob/main/docs/faq.md
- https://github.com/openai/codex/releases/latest
