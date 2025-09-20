#!/usr/bin/env bun
// @ts-nocheck

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path: string;
    content: string;
  };
  tool_response: {
    filePath: string;
    success: boolean;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
  };
}

// Check for debug mode
const DEBUG = process.argv.includes("--debug");

function log(message: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(message, ...args);
  }
}

async function runCommand(
  command: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  try {
    const proc = Bun.spawn(command, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: cwd,
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const success = (await proc.exited) === 0;

    return { stdout, stderr, success };
  } catch (error) {
    return { stdout: "", stderr: String(error), success: false };
  }
}

async function main() {
  log("Hook started for file processing");

  // Lire l'input JSON depuis stdin
  const input = await Bun.stdin.text();
  log("Input received, length:", input.length);

  let hookData: HookInput;
  try {
    hookData = JSON.parse(input);
  } catch (error) {
    log("Error parsing JSON input:", error);
    process.exit(0);
  }

  const filePath = hookData.tool_input?.file_path;
  if (!filePath) {
    log("Unable to extract file path from input");
    process.exit(0);
  }

  // Vérifier que c'est un fichier .ts ou .tsx uniquement
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    log(`Skipping ${filePath}: not a TypeScript file`);
    process.exit(0);
  }

  // Ignorer les fichiers de hook
  if (filePath.includes("/.claude/hooks/")) {
    log(`Skipping ${filePath}: hook file outside of project scope`);
    process.exit(0);
  }

  log("Processing file:", filePath);

  // Vérifier que le fichier existe
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    log("File not found:", filePath);
    process.exit(1);
  }

  // Déterminer le répertoire de travail approprié
  const projectRoot = "/Users/melvynx/Developer/saas/saveit.now-mono";
  let workingDirectory = projectRoot;

  // Si le fichier est dans apps/web, utiliser ce répertoire pour les commandes
  if (filePath.includes("/apps/web/")) {
    workingDirectory = `${projectRoot}/apps/web`;
  } else if (filePath.includes("/apps/mobile/")) {
    workingDirectory = `${projectRoot}/apps/mobile`;
  }

  // 1. Exécuter Prettier
  log("Running Prettier formatting");
  const prettierResult = await runCommand(
    ["bun", "x", "prettier", "--write", filePath],
    workingDirectory,
  );
  if (!prettierResult.success) {
    log("Prettier failed:", prettierResult.stderr);
  }

  // 2. ESLint --fix
  log("Running ESLint --fix");
  if (workingDirectory.includes("/apps/web")) {
    await runCommand(["pnpm", "lint", "--fix"], workingDirectory);
  } else if (workingDirectory.includes("/apps/mobile")) {
    await runCommand(["bun", "x", "eslint", "--fix", filePath], workingDirectory);
  }

  // 3. Run ESLint check and TypeScript check in parallel
  log("Running ESLint and TypeScript checks in parallel");
  let eslintCheckResult, tscResult;

  if (workingDirectory.includes("/apps/web")) {
    [eslintCheckResult, tscResult] = await Promise.all([
      runCommand(["pnpm", "lint"], workingDirectory),
      runCommand(["pnpm", "ts"], workingDirectory),
    ]);
  } else if (workingDirectory.includes("/apps/mobile")) {
    [eslintCheckResult, tscResult] = await Promise.all([
      runCommand(["bun", "x", "eslint", filePath], workingDirectory),
      runCommand(["pnpm", "type-check"], workingDirectory),
    ]);
  } else {
    // Pour les autres fichiers, utiliser ESLint directement depuis la racine
    [eslintCheckResult, tscResult] = await Promise.all([
      runCommand(
        ["bun", "x", "eslint", "--config", ".eslintrc.js", filePath],
        projectRoot,
      ),
      runCommand(
        ["bun", "x", "tsc", "--noEmit", "--pretty", "false"],
        projectRoot,
      ),
    ]);
  }

  const eslintErrors = (
    eslintCheckResult.stdout + eslintCheckResult.stderr
  ).trim();

  // Filtrer les lignes "info", les messages de succès et les headers de commande
  const filteredEslintErrors = eslintErrors
    .split("\n")
    .filter((line) => !line.startsWith("info  - Need to disable some ESLint rules?"))
    .filter((line) => !line.includes("✔ No ESLint warnings or errors"))
    .filter((line) => !line.startsWith("> web@"))
    .filter((line) => !line.startsWith("> @saveit/mobile@"))
    .filter((line) => !line.startsWith("> next lint"))
    .filter((line) => !line.startsWith("> expo lint"))
    .filter((line) => !line.startsWith("env: load"))
    .filter((line) => !line.startsWith("env: export"))
    .filter((line) => !line.includes("Using legacy ESLint config"))
    .filter((line) => !line.includes("[MODULE_TYPELESS_PACKAGE_JSON]"))
    .filter((line) => !line.includes("Reparsing as ES module"))
    .filter((line) => !line.includes("To eliminate this warning"))
    .filter((line) => !line.includes("Use `node --trace-warnings"))
    .filter((line) => line.trim() !== "")
    .join("\n")
    .trim();

  const tsErrors = tscResult.stderr
    .split("\n")
    .filter((line) => line.includes(filePath))
    .join("\n");

  // Construire le message d'erreurs
  let errorMessage = "";

  if (tsErrors || filteredEslintErrors) {
    errorMessage = `Fix NOW the following errors AND warning detected in ${filePath
      .split("/")
      .pop()}:\\n`;

    if (tsErrors) {
      errorMessage += `\\n TypeScript errors:\\n${tsErrors}\\n`;
    }

    if (filteredEslintErrors) {
      errorMessage += `\\n ESLint errors:\\n${filteredEslintErrors}\\n`;
    }
  }

  log("Error message", errorMessage);

  // Sortir le résultat seulement s'il y a des erreurs
  if (errorMessage) {
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: errorMessage,
      },
    };

    log("Output", JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
  }
  // Ne rien afficher si pas d'erreurs
}

main().catch((error) => {
  log("Error in hook:", error);
  process.exit(1);
});
