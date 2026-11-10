// LaTeX source structure helpers: document outline, Beamer frame parsing
// and the PowerPoint-style "Add Slide" layouts.

export interface OutlineItem {
  kind: "section" | "subsection" | "subsubsection" | "frame";
  title: string;
  line: number;
}

export interface Frame {
  index: number;
  startLine: number; // 1-based, the \begin{frame} line
  endLine: number; // 1-based, the \end{frame} line
  title: string | null;
  bullets: string[];
}

export function isBeamer(source: string): boolean {
  return /\\documentclass(\[[^\]]*\])?\s*\{beamer\}/.test(source);
}

export function parseOutline(source: string): OutlineItem[] {
  const out: OutlineItem[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("%")) continue;

    let m = /\\(subsubsection|subsection|section)\*?\s*\{([^}]*)\}/.exec(l);
    if (m) {
      out.push({
        kind: m[1] as OutlineItem["kind"],
        title: m[2].trim(),
        line: i + 1,
      });
      continue;
    }
    m = /\\frametitle(<[^>]*>)?\s*\{([^}]*)\}/.exec(l);
    if (m) {
      out.push({ kind: "frame", title: m[2].trim(), line: i + 1 });
      continue;
    }
    // Slides titled via the frame argument: \begin{frame}{Title}
    m = /\\begin\{frame\}(?:<[^>]*>)?(?:\[[^\]]*\])?\s*\{([^}]+)\}/.exec(l);
    if (m) {
      out.push({ kind: "frame", title: m[1].trim(), line: i + 1 });
    }
  }
  return out;
}

function cleanItemText(s: string): string {
  let t = s.trim();
  // Strip trailing comments.
  const c = t.indexOf("%");
  if (c >= 0 && !t.slice(0, c).includes("\\")) t = t.slice(0, c);
  t = t
    .replace(/\\pause\b\s*/g, "")
    .replace(/\\alert\s*\{([^}]*)\}/g, "$1")
    .replace(/\\textbf\s*\{([^}]*)\}/g, "$1")
    .replace(/\\emph\s*\{([^}]*)\}/g, "$1")
    .replace(/\\item\b\s*/g, "")
    .replace(/\\[a-zA-Z]+/g, (mm) => (mm === "\\LaTeX" ? "LaTeX" : mm.slice(1)))
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 46 ? t.slice(0, 45) + "…" : t;
}

export function parseFrames(source: string): Frame[] {
  const lines = source.split("\n");
  const frames: Frame[] = [];
  let i = 0;
  while (i < lines.length) {
    if (/\\begin\{frame\}/.test(lines[i])) {
      const startLine = i + 1;
      let j = i + 1;
      while (j < lines.length && !/\\end\{frame\}/.test(lines[j])) j++;
      const endLine = Math.min(j + 1, lines.length);
      const body = lines.slice(i, j + 1).join("\n");

      let title: string | null = null;
      const ft = /\\frametitle(?:<[^>]*>)?\s*\{([^}]*)\}/.exec(body);
      const fa = /\\begin\{frame\}(?:\[[^\]]*\])?\s*\{([^}]*)\}/.exec(lines[i]);
      if (ft) title = ft[1].trim();
      else if (fa) title = fa[1].trim();

      const bullets = Array.from(body.matchAll(/\\item(?:<[^>]*>)?\s+(.*)/g))
        .slice(0, 3)
        .map((m) => cleanItemText(m[1]));

      frames.push({ index: frames.length, startLine, endLine, title, bullets });
      i = j + 1;
    } else {
      i++;
    }
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Frame manipulation (move / duplicate / delete) — all line-splice based.
// ---------------------------------------------------------------------------

export function moveFrame(source: string, frame: Frame, dir: -1 | 1): string {
  const frames = parseFrames(source);
  const lines = source.split("\n");
  const s = frame.startLine - 1;
  const e = frame.endLine - 1;
  const len = e - s + 1;

  if (dir === -1) {
    const prev = frames[frame.index - 1];
    if (!prev) return source;
    const block = lines.splice(s, len);
    lines.splice(prev.startLine - 1, 0, ...block);
  } else {
    const next = frames[frame.index + 1];
    if (!next) return source;
    const block = lines.splice(s, len);
    lines.splice(next.endLine - 1 - len + 1, 0, ...block);
  }
  return lines.join("\n");
}

export function duplicateFrame(source: string, frame: Frame): string {
  const lines = source.split("\n");
  const s = frame.startLine - 1;
  const e = frame.endLine - 1;
  const block = lines.slice(s, e + 1);
  lines.splice(e + 1, 0, "", ...block);
  return lines.join("\n");
}

export function deleteFrame(source: string, frame: Frame): string {
  const lines = source.split("\n");
  let s = frame.startLine - 1;
  let e = frame.endLine - 1;
  // Swallow one blank line after the frame so deletions don't pile up gaps.
  if (e + 1 < lines.length && lines[e + 1].trim() === "") e += 1;
  else if (s - 1 >= 0 && lines[s - 1].trim() === "") s -= 1;
  lines.splice(s, e - s + 1);
  return lines.join("\n");
}

/** Where a newly inserted frame should go: after the frame the cursor is in,
 *  otherwise right before \end{document}, otherwise at the end. */
export function frameInsertionLine(source: string, cursorLine: number): number {
  const frames = parseFrames(source);
  const inside = frames.find((f) => cursorLine >= f.startLine && cursorLine <= f.endLine);
  if (inside) return inside.endLine + 1;
  const lines = source.split("\n");
  const endDoc = lines.findIndex((l) => /\\end\{document\}/.test(l));
  return endDoc >= 0 ? endDoc + 1 : lines.length;
}

export function insertBlockAtLine(source: string, lineNo: number, block: string): string {
  const lines = source.split("\n");
  const idx = Math.min(Math.max(0, lineNo - 1), lines.length);
  lines.splice(idx, 0, block);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PowerPoint-style slide layouts.
// ---------------------------------------------------------------------------

export interface SlideLayout {
  id: string;
  name: string;
  description: string;
  snippet: string;
}

export const SLIDE_LAYOUTS: SlideLayout[] = [
  {
    id: "title",
    name: "Title Slide",
    description: "Big centered title page with author and date.",
    snippet: String.raw`\begin{frame}
  \titlepage
\end{frame}`,
  },
  {
    id: "content",
    name: "Title + Content",
    description: "A frametitle with a bulleted list.",
    snippet: String.raw`\begin{frame}{Slide title}
  \begin{itemize}
    \item First point
    \item Second point
    \item Third point
  \end{itemize}
\end{frame}`,
  },
  {
    id: "two-col",
    name: "Two Columns",
    description: "Side-by-side columns for comparisons.",
    snippet: String.raw`\begin{frame}{Slide title}
  \begin{columns}[T]
    \begin{column}{0.48\textwidth}
      Left column content
    \end{column}
    \begin{column}{0.48\textwidth}
      Right column content
    \end{column}
  \end{columns}
\end{frame}`,
  },
  {
    id: "section",
    name: "Section Divider",
    description: "A large section heading slide.",
    snippet: String.raw`\begin{frame}
  \centering
  {\Huge\textbf{Section title}}\\[1em]
  {\large Optional subtitle}
\end{frame}`,
  },
  {
    id: "image",
    name: "Image + Caption",
    description: "Centered figure with a caption.",
    snippet: String.raw`\begin{frame}{Slide title}
  \begin{figure}
    \centering
    \fbox{\parbox[c][4cm][c]{0.7\textwidth}{\centering Your figure here}}
    % Replace the fbox with: \includegraphics[width=0.7\textwidth]{figures/figure1}
    \caption{Describe your figure.}
  \end{figure}
\end{frame}`,
  },
  {
    id: "closing",
    name: "Closing",
    description: "Thank-you slide with contact info.",
    snippet: String.raw`\begin{frame}
  \centering
  {\Huge Thank you!}\\[1em]
  Questions? \texttt{you@example.com}
\end{frame}`,
  },
];
