// Built-in document templates shown in the New File gallery.
// Kept in the frontend bundle (not Rust) so browser dev mode can use them
// too. Every Beamer template sticks to packages shipped with a standard TeX
// Live / MiKTeX / tectonic install.

import type { TemplateCard } from "./types";

export const BUILTIN_TEMPLATES: TemplateCard[] = [
  {
    id: "beamer-minimal",
    name: "Minimal Deck",
    description: "Clean 16:9 deck with a custom accent colour, blocks, columns, math, table and figure layouts.",
    kind: "beamer",
    builtin: true,
    content: String.raw`% TexForge template — Minimal Deck
% A clean, modern Beamer deck with a custom accent colour.
\documentclass[aspectratio=169]{beamer}

\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath, amssymb}
\usepackage{graphicx}
\usepackage{booktabs}

% ---- Accent colour (change to taste) ------------------------------------
\definecolor{accent}{HTML}{0F766E}
\setbeamercolor{structure}{fg=accent}
\setbeamercolor{frametitle}{fg=white, bg=accent}
\setbeamertemplate{navigation symbols}{}

\title{Presentation Title}
\subtitle{A short subtitle}
\author{Your Name}
\institute{Your Institution}
\date{\today}

\begin{document}

% --- Title slide ----------------------------------------------------------
\begin{frame}
  \titlepage
\end{frame}

% --- Outline ---------------------------------------------------------------
\begin{frame}{Outline}
  \tableofcontents
\end{frame}

\section{Introduction}

\begin{frame}{Why Beamer?}
  \begin{itemize}
    \item Structured, reproducible presentations
    \item Beautiful math typesetting out of the box
    \item One source file for slides and handouts
  \end{itemize}
\end{frame}

\begin{frame}[t]{A Little Math}
  The Gaussian integral:
  \begin{equation}
    \int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
    \label{eq:gauss}
  \end{equation}
  Referenced as Equation~\eqref{eq:gauss}.
\end{frame}

\section{Details}

\begin{frame}{Blocks}
  \begin{block}{Standard block}
    Neutral, important information.
  \end{block}
  \begin{alertblock}{Alert block}
    Something that deserves attention.
  \end{alertblock}
  \begin{exampleblock}{Example block}
    An illustrating example.
  \end{exampleblock}
\end{frame}

\begin{frame}{Two Columns}
  \begin{columns}[T]
    \begin{column}{0.48\textwidth}
      \begin{itemize}
        \item Left column bullet
        \item Another point
      \end{itemize}
    \end{column}
    \begin{column}{0.48\textwidth}
      \begin{itemize}
        \item Right column bullet
        \item Another point
      \end{itemize}
    \end{column}
  \end{columns}
\end{frame}

\begin{frame}{A Figure}
  \begin{figure}
    \centering
    \fbox{\parbox[c][4cm][c]{0.6\textwidth}{\centering Your figure here}}
    % Replace the fbox with:
    % \includegraphics[width=0.6\textwidth]{figures/figure1}
    \caption{Replace with your own image.}
  \end{figure}
\end{frame}

\begin{frame}{A Table}
  \begin{table}
    \centering
    \begin{tabular}{lcc}
      \toprule
      \textbf{Item} & \textbf{Qty} & \textbf{Price} \\
      \midrule
      Widget & 2 & 4.50 \\
      Gadget & 1 & 9.99 \\
      \bottomrule
    \end{tabular}
    \caption{A booktabs table.}
  \end{table}
\end{frame}

% --- Closing slide ---------------------------------------------------------
\begin{frame}
  \centering
  {\Huge Thank you!}\\[1em]
  Questions? \texttt{you@example.com}
\end{frame}

\end{document}
`,
  },
  {
    id: "beamer-academic",
    name: "Classic Academic",
    description: "Madrid theme with automatic per-section outline slides — the classic seminar look.",
    kind: "beamer",
    builtin: true,
    content: String.raw`% TexForge template — Classic Academic
% A traditional seminar deck using the Madrid theme.
\documentclass{beamer}

\usetheme{Madrid}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath, amssymb, amsthm}
\usepackage{booktabs}

\title{Classic Academic Presentation}
\subtitle{Subtitle goes here}
\author{Your Name}
\institute{Your University}
\date{\today}

% Show a mini table of contents at every section start.
\AtBeginSection[] {
  \begin{frame}<beamer>
    \frametitle{Outline}
    \tableofcontents[currentsection]
  \end{frame}
}

\begin{document}

\begin{frame}
  \titlepage
\end{frame}

\begin{frame}{Outline}
  \tableofcontents
\end{frame}

\section{Motivation}

\begin{frame}{Motivation}
  \begin{itemize}
    \item Why is this problem interesting?
    \item What did previous work miss?
    \item What do we contribute?
  \end{itemize}
\end{frame}

\section{Method}

\begin{frame}{Setup}
  We study the estimator
  \begin{equation}
    \hat{\theta}_n = \arg\min_{\theta \in \Theta} \; \frac{1}{n} \sum_{i=1}^{n} \ell(f_\theta(x_i), y_i)
  \end{equation}
  under standard regularity conditions.
\end{frame}

\begin{frame}{A Theorem}
  \begin{theorem}[Consistency]
    Under Assumptions~1--3, $\hat{\theta}_n \to \theta^\ast$ in probability.
  \end{theorem}
  \begin{proof}[Proof sketch]
    Apply the dominated convergence theorem. \qedhere
  \end{proof}
\end{frame}

\section{Results}

\begin{frame}{Results}
  \begin{table}
    \centering
    \begin{tabular}{lcc}
      \toprule
       & \textbf{Baseline} & \textbf{Ours} \\
      \midrule
      Accuracy & 82.1 & \textbf{88.7} \\
      Runtime  & 1.0$\times$ & 1.2$\times$ \\
      \bottomrule
    \end{tabular}
    \caption{Main comparison.}
  \end{table}
\end{frame}

\begin{frame}{Summary}
  \begin{itemize}
    \item We presented a clean, reproducible template.
    \item Math, theorems and tables are all set up.
    \item Add your own sections and frames below.
  \end{itemize}
\end{frame}

\begin{frame}
  \centering
  {\Large Thank you — questions?}
\end{frame}

\end{document}
`,
  },
  {
    id: "beamer-dark",
    name: "Dark Tech Talk",
    description: "Dark 16:9 deck with code-friendly colours — great for developer meetups.",
    kind: "beamer",
    builtin: true,
    content: String.raw`% TexForge template — Dark Tech Talk
% A dark deck that reads well on projectors.
\documentclass[aspectratio=169]{beamer}

\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath}
\usepackage{listings}

\setbeamercolor{background canvas}{bg=black!92}
\setbeamercolor{normal text}{fg=white!85!black}
\setbeamercolor{structure}{fg=cyan!60!white}
\setbeamercolor{frametitle}{fg=cyan!60!white}
\setbeamercolor{title}{fg=white}
\setbeamercolor{block title}{bg=cyan!18!black, fg=cyan!60!white}
\setbeamercolor{block body}{bg=black!60, fg=white!85!black}
\setbeamercolor{item}{fg=cyan!60!white}
\setbeamertemplate{navigation symbols}{}

% Dark-friendly code listings.
\lstset{
  basicstyle=\ttfamily\small\color{white!80!black},
  keywordstyle=\color{cyan!60!white},
  commentstyle=\color{gray},
  backgroundcolor=\color{black!60},
  frame=single,
  framerule=0pt,
  showstringspaces=false
}

\title{Dark Tech Talk}
\subtitle{A deck that survives bad projectors}
\author{Your Name}
\date{\today}

\begin{document}

\begin{frame}
  \titlepage
\end{frame}

\begin{frame}{Agenda}
  \tableofcontents
\end{frame}

\section{The Problem}

\begin{frame}{The Problem}
  \begin{itemize}
    \item Slide decks are usually built by hand
    \item Styles drift, typos creep in
    \item Reviewing \LaTeX{} source is easier than reviewing slides
  \end{itemize}
\end{frame}

\section{A Solution}

\begin{frame}[fragile]{Code on Slides}
  \begin{lstlisting}[language=Python]
def greet(name):
    return f"Hello, {name}!"

print(greet("TexForge"))
  \end{lstlisting}
  \begin{block}{Note}
    The \texttt{[fragile]} option is required for verbatim content.
  \end{block}
\end{frame}

\begin{frame}{Big Numbers}
  \begin{columns}[T]
    \begin{column}{0.3\textwidth}
      {\Huge 42\par} lines of config
    \end{column}
    \begin{column}{0.3\textwidth}
      {\Huge 0\par} manual exports
    \end{column}
    \begin{column}{0.3\textwidth}
      {\Huge 1\par} source of truth
    \end{column}
  \end{columns}
\end{frame}

\section{Wrap-up}

\begin{frame}
  \centering
  {\Huge Thank you!}\\[1em]
  {\large Slides, source and templates live in one repo.}
\end{frame}

\end{document}
`,
  },
  {
    id: "beamer-blank",
    name: "Blank Beamer",
    description: "A bare-bones Beamer skeleton — title slide plus a commented frame, nothing else.",
    kind: "beamer",
    builtin: true,
    content: String.raw`% TexForge template — Blank Beamer
\documentclass{beamer}

% \usetheme{Madrid}  % pick a theme if you like

\title{Untitled Presentation}
\author{Your Name}
\date{\today}

\begin{document}

\begin{frame}
  \titlepage
\end{frame}

% Add your slides here, for example:
% \begin{frame}{First slide}
%   \begin{itemize}
%     \item One point
%     \item Another point
%   \end{itemize}
% \end{frame}

\end{document}
`,
  },
  {
    id: "blank",
    name: "Empty Document",
    description: "A minimal plain-LaTeX article — write everything yourself.",
    kind: "basic",
    builtin: true,
    content: String.raw`\documentclass{article}

\title{Untitled Document}
\author{Your Name}
\date{\today}

\begin{document}

\maketitle

\end{document}
`,
  },
];
