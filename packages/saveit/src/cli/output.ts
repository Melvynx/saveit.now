import pc from "picocolors";
import { globalFlags } from "./config.js";

interface OutputOptions {
  json?: boolean;
  format?: string;
  fields?: string[];
  noHeader?: boolean;
}

export function output(data: unknown, opts: OutputOptions = {}): void {
  const isJson = opts.json ?? globalFlags.json;
  const format = isJson ? "json" : (opts.format ?? globalFlags.format);

  switch (format) {
    case "json":
      printJson(data);
      break;
    case "csv":
      printCsv(data, opts.fields, opts.noHeader ?? globalFlags.noHeader);
      break;
    case "yaml":
      printYaml(data, 0);
      break;
    default:
      printText(data, opts.fields, opts.noHeader ?? globalFlags.noHeader);
  }
}

function unwrap(data: unknown): unknown {
  if (data && typeof data === "object" && "success" in data) {
    const { success: _success, ...rest } = data as Record<string, unknown>;
    const keys = Object.keys(rest);
    if (keys.length === 1 && keys[0]) return rest[keys[0]];
    return rest;
  }
  return data;
}

function printJson(data: unknown): void {
  const unwrapped = unwrap(data);
  const envelope: Record<string, unknown> = { ok: true, data: unwrapped };
  if (Array.isArray(unwrapped)) envelope.meta = { total: unwrapped.length };
  console.log(JSON.stringify(envelope, null, 2));
}

function printText(data: unknown, fields?: string[], noHeader?: boolean): void {
  const unwrapped = unwrap(data);
  if (Array.isArray(unwrapped)) {
    if (unwrapped.length === 0) {
      console.log(pc.dim("(no results)"));
      return;
    }
    printTable(unwrapped as Record<string, unknown>[], fields, noHeader);
    console.log(
      pc.dim(`\n${unwrapped.length} result${unwrapped.length === 1 ? "" : "s"}`),
    );
  } else if (unwrapped && typeof unwrapped === "object") {
    printKeyValue(unwrapped as Record<string, unknown>);
  } else {
    console.log(String(unwrapped));
  }
}

function printKeyValue(obj: Record<string, unknown>): void {
  const maxKey = Math.max(...Object.keys(obj).map((k) => k.length));
  for (const [k, v] of Object.entries(obj)) {
    console.log(`  ${pc.bold(k.padEnd(maxKey))}  ${formatValue(v)}`);
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return pc.dim("-");
  if (typeof v === "boolean") return v ? pc.green("true") : pc.red("false");
  if (typeof v === "number") return pc.cyan(String(v));
  if (typeof v === "object") return pc.dim(JSON.stringify(v));
  const s = String(v);
  if (/^https?:\/\//.test(s)) return pc.underline(pc.cyan(s));
  return s;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return pc.dim("-");
  if (typeof v === "boolean") return v ? pc.green("yes") : pc.red("no");
  if (typeof v === "number") return pc.cyan(String(v));
  if (typeof v === "object") return pc.dim(JSON.stringify(v));
  return String(v);
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function printTable(
  rows: Record<string, unknown>[],
  fields?: string[],
  noHeader?: boolean,
): void {
  const cols = fields ?? Object.keys(rows[0] ?? {});
  const widths = cols.map((col) => {
    const values = rows.map((r) => stripAnsi(formatCell(r[col])).length);
    return Math.min(Math.max(col.length, ...values), 40);
  });

  if (!noHeader) {
    console.log(
      cols.map((c, i) => pc.bold(c.padEnd(widths[i] ?? 10))).join("  "),
    );
    console.log(pc.dim(widths.map((w) => "─".repeat(w)).join("  ")));
  }

  for (const row of rows) {
    const line = cols.map((c, i) => {
      const formatted = formatCell(row[c]);
      const raw = stripAnsi(formatted);
      const w = widths[i] ?? 10;
      if (raw.length > w) {
        // Truncate the visible (ansi-stripped) value to avoid splitting an
        // escape sequence and bleeding color into the next column.
        return raw.slice(0, Math.max(0, w - 1)) + pc.dim("…");
      }
      return formatted + " ".repeat(Math.max(0, w - raw.length));
    });
    console.log(line.join("  "));
  }
}

function printCsv(data: unknown, fields?: string[], noHeader?: boolean): void {
  const unwrapped = unwrap(data);
  if (!Array.isArray(unwrapped)) {
    console.log(JSON.stringify(unwrapped));
    return;
  }
  if (unwrapped.length === 0) return;
  const cols = fields ?? Object.keys(unwrapped[0] as Record<string, unknown>);
  if (!noHeader) console.log(cols.join(","));
  for (const row of unwrapped as Record<string, unknown>[]) {
    console.log(
      cols.map((c) => csvEscape(String(row[c] ?? ""))).join(","),
    );
  }
}

function csvEscape(val: string): string {
  // Defang spreadsheet formula injection (Excel/Sheets/Numbers): cells starting
  // with =, +, -, @, tab, or CR are treated as formulas. Prefixing with a
  // single quote forces the cell to be parsed as text.
  let safe = val;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (
    safe.includes(",") ||
    safe.includes('"') ||
    safe.includes("\n") ||
    safe.includes("\r")
  ) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function printYaml(data: unknown, indent: number): void {
  const pad = "  ".repeat(indent);
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        console.log(`${pad}-`);
        printYaml(item, indent + 1);
      } else {
        console.log(`${pad}- ${String(item)}`);
      }
    }
  } else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object") {
        console.log(`${pad}${k}:`);
        printYaml(v, indent + 1);
      } else {
        console.log(`${pad}${k}: ${String(v)}`);
      }
    }
  } else {
    console.log(`${pad}${String(data)}`);
  }
}
