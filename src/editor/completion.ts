// LaTeX autocompletion: \commands and \begin{...} environments.
//
// Environment completions expand into full begin/end skeletons (snippet
// style); command completions insert the command with argument placeholders.

import { snippet, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";

interface CmdEntry {
  label: string; // without leading backslash
  detail: string;
  apply?: string; // snippet template; defaults to "\<label>"
}

const C = (label: string, detail: string, apply?: string): CmdEntry => ({ label, detail, apply });

const COMMANDS: CmdEntry[] = [
  // Preamble
  C("documentclass", "Document class, e.g. article or beamer", "\\documentclass{${article}}"),
  C("usepackage", "Load a package", "\\usepackage{${package}}"),
  C("title", "Document title", "\\title{${title}}"),
  C("author", "Author name(s)", "\\author{${author}}"),
  C("date", "Document date", "\\date{${\\today}}"),
  C("maketitle", "Render the title page"),
  C("tableofcontents", "Table of contents"),
  C("usetheme", "Beamer theme", "\\usetheme{${Madrid}}"),
  C("setbeamercolor", "Beamer colour", "\\setbeamercolor{${element}}{fg=${teal}}"),
  C("setbeamerfont", "Beamer font", "\\setbeamerfont{${element}}{size=\\large}"),
  C("institute", "Beamer institute", "\\institute{${institute}}"),
  C("logo", "Beamer logo", "\\logo{${\\includegraphics{logo.png}}}"),
  // Structure
  C("section", "Section heading", "\\section{${title}}"),
  C("section*", "Unnumbered section", "\\section*{${title}}"),
  C("subsection", "Subsection heading", "\\subsection{${title}}"),
  C("subsection*", "Unnumbered subsection", "\\subsection*{${title}}"),
  C("subsubsection", "Sub-subsection heading", "\\subsubsection{${title}}"),
  C("paragraph", "Run-in heading", "\\paragraph{${title}}"),
  C("appendix", "Start the appendix"),
  C("label", "Label for referencing", "\\label{${key}}"),
  C("ref", "Reference a label", "\\ref{${key}}"),
  C("eqref", "Reference an equation", "\\eqref{${key}}"),
  C("cite", "Cite bibliography entry", "\\cite{${key}}"),
  C("footnote", "Footnote", "\\footnote{${text}}"),
  C("thanks", "Author footnote"),
  // Beamer
  C("frametitle", "Frame title", "\\frametitle{${title}}"),
  C("framesubtitle", "Frame subtitle", "\\framesubtitle{${subtitle}}"),
  C("titlepage", "Title slide content"),
  C("item", "List item"),
  C("pause", "Reveal the next overlay"),
  C("alert", "Highlighted text", "\\alert{${text}}"),
  C("only", "Overlay-only content", "\\only<${2-}>{${content}}"),
  // Text styling
  C("textbf", "Bold", "\\textbf{${text}}"),
  C("textit", "Italic", "\\textit{${text}}"),
  C("emph", "Emphasis", "\\emph{${text}}"),
  C("underline", "Underline", "\\underline{${text}}"),
  C("texttt", "Typewriter", "\\texttt{${text}}"),
  C("textsc", "Small caps", "\\textsc{${text}}"),
  C("textrm", "Roman", "\\textrm{${text}}"),
  C("textsf", "Sans serif", "\\textsf{${text}}"),
  C("tiny", "Tiny size"),
  C("small", "Small size"),
  C("large", "Large size"),
  C("Large", "Larger size"),
  C("huge", "Huge size"),
  C("Huge", "Hugest size"),
  // Math
  C("frac", "Fraction", "\\frac{${num}}{${den}}"),
  C("sqrt", "Square root", "\\sqrt{${x}}"),
  C("sum", "Sum", "\\sum_{${i=1}}^{${n}}"),
  C("prod", "Product", "\\prod_{${i=1}}^{${n}}"),
  C("int", "Integral", "\\int_{${a}}^{${b}}"),
  C("lim", "Limit", "\\lim_{${x \\to 0}}"),
  C("infty", "Infinity"),
  C("mathrm", "Roman in math", "\\mathrm{${x}}"),
  C("mathbf", "Bold in math", "\\mathbf{${x}}"),
  C("mathbb", "Blackboard bold", "\\mathbb{${R}}"),
  C("mathcal", "Calligraphic", "\\mathcal{${L}}"),
  // Greek letters
  C("alpha", "Greek alpha"),
  C("beta", "Greek beta"),
  C("gamma", "Greek gamma"),
  C("delta", "Greek delta"),
  C("epsilon", "Greek epsilon"),
  C("zeta", "Greek zeta"),
  C("theta", "Greek theta"),
  C("lambda", "Greek lambda"),
  C("mu", "Greek mu"),
  C("pi", "Greek pi"),
  C("sigma", "Greek sigma"),
  C("phi", "Greek phi"),
  C("omega", "Greek omega"),
  C("Gamma", "Greek Gamma"),
  C("Delta", "Greek Delta"),
  C("Omega", "Greek Omega"),
  // Tables & figures
  C("includegraphics", "Embed an image", "\\includegraphics[width=${0.8}\\textwidth]{${file}}"),
  C("caption", "Caption", "\\caption{${text}}"),
  C("label", "Label", "\\label{${key}}"),
  C("centering", "Centre the environment"),
  C("hline", "Horizontal table rule"),
  C("cline", "Partial table rule", "\\cline{${1-2}}"),
  C("multicolumn", "Merged cells", "\\multicolumn{${2}}{${c}}{${text}}"),
  C("vspace", "Vertical space", "\\vspace{${1em}}"),
  C("hspace", "Horizontal space", "\\hspace{${1em}}"),
  // Misc
  C("href", "Hyperlink", "\\href{${https://}}{${text}}"),
  C("url", "Bare URL", "\\url{${https://}}"),
  C("newcommand", "Define a macro", "\\newcommand{\\${name}}{${definition}}"),
  C("renewcommand", "Redefine a macro", "\\renewcommand{\\${name}}{${definition}}"),
  C("qed", "QED square"),
];

interface EnvEntry {
  label: string;
  detail: string;
  snippet?: string;
}

const E = (label: string, detail: string, snippet?: string): EnvEntry => ({ label, detail, snippet });

const ENVIRONMENTS: EnvEntry[] = [
  E("document", "The document body"),
  E("frame", "Beamer slide", "\\begin{frame}{${Title}}\n  $0\n\\end{frame}"),
  E("itemize", "Bulleted list", "\\begin{itemize}\n  \\item $0\n\\end{itemize}"),
  E("enumerate", "Numbered list", "\\begin{enumerate}\n  \\item $0\n\\end{enumerate}"),
  E("description", "Description list", "\\begin{description}\n  \\item[${label}] $0\n\\end{description}"),
  E("block", "Beamer block", "\\begin{block}{${Title}}\n  $0\n\\end{block}"),
  E("alertblock", "Emphasised block", "\\begin{alertblock}{${Title}}\n  $0\n\\end{alertblock}"),
  E("exampleblock", "Example block", "\\begin{exampleblock}{${Title}}\n  $0\n\\end{exampleblock}"),
  E("columns", "Beamer columns", "\\begin{columns}[T]\n  \\begin{column}{0.48\\textwidth}\n    $0\n  \\end{column}\n  \\begin{column}{0.48\\textwidth}\n\n  \\end{column}\n\\end{columns}"),
  E("column", "A single column", "\\begin{column}{${0.48}\\textwidth}\n  $0\n\\end{column}"),
  E("equation", "Numbered equation", "\\begin{equation}\n  $0\n\\end{equation}"),
  E("equation*", "Unnumbered equation", "\\begin{equation*}\n  $0\n\\end{equation*}"),
  E("align", "Aligned equations", "\\begin{align}\n  $0\n\\end{align}"),
  E("align*", "Unnumbered aligned equations", "\\begin{align*}\n  $0\n\\end{align*}"),
  E("gather", "Gathered equations", "\\begin{gather}\n  $0\n\\end{gather}"),
  E("figure", "Floating figure", "\\begin{figure}\n  \\centering\n  \\includegraphics[width=${0.7}\\textwidth]{$0}\n  \\caption{${Caption}}\n\\end{figure}"),
  E("figure*", "Two-column figure", "\\begin{figure*}\n  \\centering\n  \\includegraphics[width=${0.8}\\textwidth]{$0}\n  \\caption{${Caption}}\n\\end{figure*}"),
  E("table", "Floating table", "\\begin{table}\n  \\centering\n  \\caption{${Caption}}\n  \\begin{tabular}{lll}\n    $0 &  &  \\\\\n  \\end{tabular}\n\\end{table}"),
  E("tabular", "Table", "\\begin{tabular}{${|c|c|}}\n  $0\n\\end{tabular}"),
  E("theorem", "Theorem", "\\begin{theorem}\n  $0\n\\end{theorem}"),
  E("lemma", "Lemma", "\\begin{lemma}\n  $0\n\\end{lemma}"),
  E("corollary", "Corollary", "\\begin{corollary}\n  $0\n\\end{corollary}"),
  E("proof", "Proof", "\\begin{proof}\n  $0\n\\end{proof}"),
  E("definition", "Definition", "\\begin{definition}\n  $0\n\\end{definition}"),
  E("example", "Example", "\\begin{example}\n  $0\n\\end{example}"),
  E("center", "Centred content", "\\begin{center}\n  $0\n\\end{center}"),
  E("flushleft", "Left-aligned", "\\begin{flushleft}\n  $0\n\\end{flushleft}"),
  E("flushright", "Right-aligned", "\\begin{flushright}\n  $0\n\\end{flushright}"),
  E("quote", "Quotation (short)", "\\begin{quote}\n  $0\n\\end{quote}"),
  E("quotation", "Quotation (long)", "\\begin{quotation}\n  $0\n\\end{quotation}"),
  E("abstract", "Abstract", "\\begin{abstract}\n  $0\n\\end{abstract}"),
  E("minipage", "Side-by-side box", "\\begin{minipage}{${0.48}\\textwidth}\n  $0\n\\end{minipage}"),
  E("verbatim", "Verbatim text", "\\begin{verbatim}\n$0\n\\end{verbatim}"),
  E("semiverbatim", "Beamer verbatim", "\\begin{semiverbatim}\n$0\n\\end{semiverbatim}"),
  E("cases", "Case distinction", "\\begin{cases}\n  $0\n\\end{cases}"),
  E("pmatrix", "Matrix (parentheses)", "\\begin{pmatrix}\n  $0\n\\end{pmatrix}"),
  E("bmatrix", "Matrix (brackets)", "\\begin{bmatrix}\n  $0\n\\end{bmatrix}"),
  E("overlayarea", "Beamer overlay area", "\\begin{overlayarea}{\\textwidth}{${3cm}}\n  $0\n\\end{overlayarea}"),
  E("overprint", "Beamer overprint", "\\begin{overprint}\n  \\onslide<${1}>\n\\end{overprint}"),
];

function envCompletion(e: EnvEntry, closing: boolean): Completion {
  if (closing) {
    return {
      label: e.label,
      type: "type",
      detail: e.detail,
      apply: e.label,
      boost: e.label === "frame" ? 1 : undefined,
    };
  }
  const template =
    e.snippet ?? `\\begin{${e.label}}\n  $0\n\\end{${e.label}}`;
  return {
    label: `\\begin{${e.label}}`,
    type: "type",
    detail: e.detail,
    apply: snippet(template),
    boost: e.label === "frame" ? 1 : undefined,
  };
}

export function latexCompletion(context: CompletionContext): CompletionResult | null {
  // \begin{… — offer environments with full begin/end skeletons.
  let word = context.matchBefore(/\\begin\{[\w*]*$/);
  if (word) {
    return {
      from: word.from,
      options: ENVIRONMENTS.map((e) => envCompletion(e, false)),
      validFor: /^\\begin\{[\w*]*$/,
    };
  }

  // \end{… — offer the closing environment name only.
  word = context.matchBefore(/\\end\{[\w*]*$/);
  if (word) {
    return {
      from: word.from,
      options: ENVIRONMENTS.map((e) => envCompletion(e, true)),
      validFor: /^\\end\{[\w*]*$/,
    };
  }

  // \command — the general command list.
  word = context.matchBefore(/\\[a-zA-Z@]*$/);
  if (word) {
    return {
      from: word.from,
      options: COMMANDS.map((c) => {
        const template = c.apply ?? `\\${c.label} `;
        return {
          label: `\\${c.label}`,
          type: "function",
          detail: c.detail,
          apply: template.includes("$") ? snippet(template) : template,
        } as Completion;
      }),
      validFor: /^\\[a-zA-Z@]*$/,
    };
  }

  return null;
}
