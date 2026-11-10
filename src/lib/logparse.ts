// TeX `.log` parsing for results produced by the built-in WASM engine
// (native engine logs are parsed in Rust — same rules, mirrored here).

import type { CompileIssue } from "../types";

const RE_FILELINE = /^(.+?\.(?:tex|sty|cls|cfg|def|fd|clo|ltx|bst)):(\d+):\s*(.*)$/;
const RE_BANG = /^!\s*(.*)$/;
const RE_LPOINT = /^l\.(\d+)/;
const RE_WARNING =
  /^((?:LaTeX|pdfTeX|LuaTeX|XeTeX|Package|Class|Font)[\w ()-]*[Ww]arning):\s*(.*)$/;
const RE_BADBOX =
  /^(Overfull|Underfull) \\([hv])box \(([^)]*)\)(?: detected at line (\d+)| in paragraph at lines (\d+)--(\d+))/;

export function parseTeXLog(log: string): CompileIssue[] {
  const lines = log.split("\n");
  const issues: CompileIssue[] = [];

  const push = (issue: CompileIssue) => {
    if (issues.length >= 250) return;
    const last = issues[issues.length - 1];
    if (
      last &&
      last.severity === issue.severity &&
      last.message === issue.message &&
      last.line === issue.line
    ) {
      return;
    }
    issues.push(issue);
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].replace(/\s+$/, "");

    let m = RE_FILELINE.exec(l);
    if (m) {
      push({
        severity: "error",
        line: parseInt(m[2], 10),
        file: m[1].replace(/^\.\//, ""),
        message: m[3].trim(),
      });
      continue;
    }

    m = RE_BANG.exec(l);
    if (m) {
      // Old-style errors carry their line number in a later "l.<n>" line.
      let line: number | null = null;
      for (let j = i + 1; j < Math.min(lines.length, i + 13); j++) {
        const lm = RE_LPOINT.exec(lines[j].replace(/\s+$/, ""));
        if (lm) {
          line = parseInt(lm[1], 10);
          break;
        }
      }
      push({
        severity: "error",
        line,
        file: "main.tex",
        message: m[1].trim(),
      });
      continue;
    }

    m = RE_WARNING.exec(l);
    if (m) {
      // TeX hard-wraps log lines at 79 columns; rejoin the continuation.
      // Keep whitespace at the break: the wrap often lands right on a space.
      let rest = m[2] + lines[i].replace(/\r$/, "").slice(l.length);
      while (lines[i].replace(/\r$/, "").length === 79 && i + 1 < lines.length) {
        rest += lines[++i].replace(/\r$/, "");
      }
      // The WASM engine loads pdftex.map repeatedly; these duplicates are harmless noise.
      if (/fontmap entry for .+ already exists/.test(rest)) continue;
      push({
        severity: "warning",
        line: null,
        file: null,
        message: `${m[1].trim()}: ${rest.trim()}`,
      });
      continue;
    }

    m = RE_BADBOX.exec(l);
    if (m) {
      push({
        severity: "badbox",
        line: m[4] ? parseInt(m[4], 10) : m[5] ? parseInt(m[5], 10) : null,
        file: null,
        message: `${m[1]} \\${m[2]}box (${m[3]})`,
      });
      continue;
    }
  }

  return issues;
}