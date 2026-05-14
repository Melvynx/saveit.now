import pc from "picocolors";
import { globalFlags } from "./config.js";

interface JsonEnvelope {
  ok: true;
  data: unknown;
  meta?: { total?: number; page?: number };
}

export function output(
  data: unknown,
  opts: { json?: boolean; format?: string; fields?: string[]; noHeader?: boolean } = {},
): void {
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

function printJson(data: unknown): void {
  const envelope: JsonEnvelope = { ok: true, data };
  if (Array.isArray(data)) {
    envelope.meta = { total: data.length };
  }
  console.log(JSON.stringify(envelope, null, 2));
}

function printText(data: unknown, fields?: string[], noHeader?: boolean): void {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(pc.dim("(no results)"));
      return;
    }
    printTable(data as Record<string, unknown>[], fields, noHeader);
    console.log(pc.dim(`\n${data.length} result${data.length === 1 ? "" : "s"}`));
  } else if (typeof data === "object" && data !== null) {
    printKeyValue(data as Record<string, unknown>);
  } else {
    console.log(String(data));
  }
}

function printKeyValue(obj: Record<string, unknown>): void {
  const keys = Object.keys(obj);
  if (keys.length === 0) return;
  const maxKey = Math.max(...keys.map((k) => k.length));
  for (const [k, v] of Object.entries(obj)) {
    const label = pc.bold(k.padEnd(maxKey));
    const val = formatValue(v);
    console.log(`  ${label}  ${val}`);
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return pc.dim("-");
  if (typeof v === "boolean") return v ? pc.green("true") : pc.red("false");
  if (typeof v === "number") return pc.cyan(String(v));
  if (typeof v === "object") return pc.dim(JSON.stringify(v));
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return pc.dim(s);
  if (/^https?:\/\//.test(s)) return pc.underline(pc.cyan(s));
  return s;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return pc.dim("-");
  if (typeof v === "boolean") return v ? pc.green("yes") : pc.red("no");
  if (typeof v === "number") return pc.cyan(String(v));
  if (typeof v === "object") return pc.dim(JSON.stringify(v));
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return pc.dim(s.replace("T", " ").replace(/\.\d+Z$/, "Z"));
  }
  return s;
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
    const header = cols.map((c, i) => pc.bold(pc.white(c.padEnd(widths[i] ?? 10)))).join("  ");
    console.log(header);
    console.log(pc.dim(widths.map((w) => "\u2500".repeat(w)).join("  ")));
  }

  for (const row of rows) {
    const line = cols.map((c, i) => {
      const formatted = formatCell(row[c]);
      const raw = stripAnsi(formatted);
      const w = widths[i] ?? 10;
      if (raw.length > w) {
        return formatted.slice(0, formatted.length - (raw.length - w) - 1) + pc.dim("\u2026");
      }
      const padding = w - raw.length;
      return formatted + " ".repeat(padding > 0 ? padding : 0);
    });
    console.log(line.join("  "));
  }
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function printCsv(data: unknown, fields?: string[], noHeader?: boolean): void {
  if (!Array.isArray(data)) {
    console.log(JSON.stringify(data));
    return;
  }
  if (data.length === 0) return;

  const cols = fields ?? Object.keys((data[0] as Record<string, unknown>) ?? {});

  if (!noHeader) {
    console.log(cols.join(","));
  }

  for (const row of data as Record<string, unknown>[]) {
    console.log(cols.map((c) => csvEscape(String(row[c] ?? ""))).join(","));
  }
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function printYaml(data: unknown, indent: number): void {
  const pad = "  ".repeat(indent);
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        console.log(`${pad}-`);
        printYaml(item, indent + 1);
      } else {
        console.log(`${pad}- ${String(item)}`);
      }
    }
  } else if (typeof data === "object" && data !== null) {
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "object" && v !== null) {
        console.log(`${pad}${k}:`);
        printYaml(v, indent + 1);
      } else {
        console.log(`${pad}${k}: ${String(v)}`);
      }
    }
  }
}
