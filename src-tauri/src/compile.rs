//! LaTeX engine detection, compilation pipeline and TeX log parsing.
//!
//! Compilation strategy:
//! * the source is written to an isolated temp directory (`main.tex`),
//! * when the document lives on disk, the engine runs with the document's
//!   folder as its working directory (tectonic) or on `TEXINPUTS` (TeX Live /
//!   MiKTeX engines) so that `\input{}`/`\includegraphics{}` keep working,
//! * all output (`.pdf`, `.log`) lands in the temp directory, never next to
//!   the user's file,
//! * the log is parsed into structured errors / warnings / bad boxes which
//!   the frontend can turn into clickable problems.

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use regex::Regex;
use serde::Serialize;
use wait_timeout::ChildExt;

/// Engines we know how to drive, in order of preference.
pub const PREFERRED_ENGINES: [&str; 4] = ["xelatex", "pdflatex", "lualatex", "tectonic"];

/// Hard ceiling per compilation pass (tectonic may download its bundle first).
const PASS_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Serialize, Clone, Debug)]
pub struct EngineInfo {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Issue {
    /// "error" | "warning" | "badbox"
    pub severity: String,
    pub line: Option<u32>,
    pub file: Option<String>,
    pub message: String,
}

#[derive(Serialize, Debug)]
pub struct CompileResult {
    pub success: bool,
    pub pdf_b64: Option<String>,
    pub issues: Vec<Issue>,
    pub log_tail: String,
    pub engine_used: String,
    pub duration_ms: u64,
    pub passes: u32,
}

/// Detect which LaTeX engines are installed on the user's PATH.
#[tauri::command]
pub fn detect_engines() -> Vec<EngineInfo> {
    PREFERRED_ENGINES
        .iter()
        .filter_map(|name| {
            which::which(name).ok().map(|p| EngineInfo {
                name: (*name).to_string(),
                path: p.to_string_lossy().into_owned(),
            })
        })
        .collect()
}

/// Compile `source` with a native engine. Runs on a blocking thread because
/// LaTeX can easily take seconds (or minutes on a cold tectonic cache).
#[tauri::command]
pub async fn compile_latex(
    source: String,
    path: Option<String>,
    engine: Option<String>,
    custom_path: Option<String>,
) -> Result<CompileResult, String> {
    let handle = tauri::async_runtime::spawn_blocking(move || {
        compile_blocking(
            &source,
            path.as_deref(),
            engine.as_deref(),
            custom_path.as_deref(),
        )
    });
    let inner = handle
        .await
        .map_err(|e| format!("Compile task failed: {e}"))?;
    inner
}

fn resolve_engine(
    engine: Option<&str>,
    custom_path: Option<&str>,
) -> Result<(String, bool), String> {
    // An explicitly configured custom engine binary wins.
    if let Some(cp) = custom_path.map(str::trim).filter(|p| !p.is_empty()) {
        let p = PathBuf::from(cp);
        if !p.is_file() {
            return Err("CUSTOM_ENGINE_NOT_FOUND".into());
        }
        let is_tectonic = p
            .file_name()
            .map(|n| n.to_string_lossy().to_lowercase().contains("tectonic"))
            .unwrap_or(false);
        return Ok((cp.to_string(), is_tectonic));
    }

    let wanted = engine.unwrap_or("auto").trim();
    let chosen = if wanted.is_empty() || wanted == "auto" {
        PREFERRED_ENGINES
            .iter()
            .find_map(|n| which::which(n).ok().map(|_| *n))
    } else {
        // A specific engine was requested; make sure it is actually there.
        which::which(wanted).ok().map(|_| wanted)
    };
    match chosen {
        Some(name) => Ok((name.to_string(), name == "tectonic")),
        None => Err("NO_ENGINE".into()),
    }
}

fn compile_blocking(
    source: &str,
    doc_path: Option<&str>,
    engine: Option<&str>,
    custom_path: Option<&str>,
) -> Result<CompileResult, String> {
    let started = Instant::now();

    let (engine_cmd, is_tectonic) = resolve_engine(engine, custom_path)?;
    let engine_used = Path::new(&engine_cmd)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| engine_cmd.clone());

    // Isolated work directory.
    let workdir = std::env::temp_dir().join(format!("texforge-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&workdir)
        .map_err(|e| format!("Could not create the build directory: {e}"))?;
    std::fs::write(workdir.join("main.tex"), source)
        .map_err(|e| format!("Could not write the source file: {e}"))?;

    // When the document is saved on disk, its folder is where images and
    // \input'ed files live.
    let doc_dir: Option<PathBuf> = doc_path
        .and_then(|p| Path::new(p).parent().map(|d| d.to_path_buf()))
        .filter(|d| d.is_dir());

    // Up to three passes — beamer tables of contents need a second run.
    let mut log = String::new();
    let mut pdf_ok = false;
    let mut passes = 0u32;
    for pass in 0..3 {
        let (l, ok) = run_one_pass(&engine_cmd, is_tectonic, &workdir, doc_dir.as_deref())?;
        passes += 1;
        log = l;
        pdf_ok = ok;
        let needs_rerun = log.contains("Rerun to get") || log.contains("Label(s) may have changed");
        if !ok || !needs_rerun || pass == 2 {
            break;
        }
    }

    let mut issues = parse_log(&log);
    if !pdf_ok && !issues.iter().any(|i| i.severity == "error") {
        issues.push(Issue {
            severity: "error".into(),
            line: None,
            file: None,
            message: "The compiler produced no PDF. Inspect the raw log below for details.".into(),
        });
    }

    let pdf_b64 = if pdf_ok {
        std::fs::read(workdir.join("main.pdf"))
            .map(|b| B64.encode(b))
            .ok()
    } else {
        None
    };

    let result = CompileResult {
        success: pdf_b64.is_some(),
        pdf_b64,
        issues,
        log_tail: tail_chars(&log, 24_000),
        engine_used,
        duration_ms: started.elapsed().as_millis() as u64,
        passes,
    };

    // Best-effort cleanup of the temp directory.
    let _ = std::fs::remove_dir_all(&workdir);
    Ok(result)
}

fn run_one_pass(
    engine_cmd: &str,
    is_tectonic: bool,
    workdir: &Path,
    doc_dir: Option<&Path>,
) -> Result<(String, bool), String> {
    let log_path = workdir.join("main.log");
    let pdf_path = workdir.join("main.pdf");
    let _ = std::fs::remove_file(&log_path);
    let _ = std::fs::remove_file(&pdf_path);

    let mut cmd = Command::new(engine_cmd);
    if is_tectonic {
        cmd.arg("--untrusted")
            .arg("--keep-logs")
            .arg("--chatter")
            .arg("minimal")
            .arg("--outdir")
            .arg(workdir);
        match doc_dir {
            Some(dd) => {
                cmd.current_dir(dd);
                cmd.arg(workdir.join("main.tex"));
            }
            None => {
                cmd.current_dir(workdir);
                cmd.arg("main.tex");
            }
        }
    } else {
        // TeX Live / MiKTeX engines.
        cmd.current_dir(workdir)
            .args([
                "-no-shell-escape",
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-file-line-error",
            ])
            .arg("main.tex");
        if let Some(dd) = doc_dir {
            // "<docdir>:" — the trailing empty entry keeps the default paths.
            let texinputs = std::env::join_paths([dd, Path::new("")]).unwrap_or_default();
            cmd.env("TEXINPUTS", texinputs);
        }
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Could not start the LaTeX engine '{engine_cmd}': {e}"))?;

    let started = Instant::now();
    loop {
        match child
            .wait_timeout(Duration::from_millis(200))
            .map_err(|e| format!("Waiting for the engine failed: {e}"))?
        {
            Some(_) => break,
            None => {
                if started.elapsed() > PASS_TIMEOUT {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("TIMEOUT".into());
                }
            }
        }
    }

    let log = std::fs::read(&log_path)
        .map(|b| String::from_utf8_lossy(&b).into_owned())
        .unwrap_or_default();
    let ok = pdf_path.is_file();
    Ok((log, ok))
}

// ---------------------------------------------------------------------------
// TeX log parsing
// ---------------------------------------------------------------------------

fn re_fileline() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"^(.+?\.(?:tex|sty|cls|cfg|def|fd|clo|ltx|bst)):(\d+):\s*(.*)$")
            .expect("static regex must compile")
    })
}

fn re_bang() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^!\s*(.*)$").expect("static regex must compile"))
}

fn re_lpoint() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^l\.(\d+)").expect("static regex must compile"))
}

fn re_warning() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"^((?:LaTeX|pdfTeX|LuaTeX|XeTeX|Package|Class|Font)[\w ()-]*[Ww]arning):\s*(.*)$",
        )
        .expect("static regex must compile")
    })
}

fn re_badbox() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"^(Overfull|Underfull) \\([hv])box \(([^)]*)\)(?: detected at line (\d+)| in paragraph at lines (\d+)--(\d+))",
        )
        .expect("static regex must compile")
    })
}

/// Parse a TeX engine `.log` into structured issues.
pub fn parse_log(log: &str) -> Vec<Issue> {
    let lines: Vec<&str> = log.lines().collect();
    let mut issues: Vec<Issue> = Vec::new();

    let push = |issue: Issue, issues: &mut Vec<Issue>| {
        if issues.len() >= 250 {
            return;
        }
        // Skip exact duplicates (beamer logs repeat errors per overlay).
        if let Some(last) = issues.last() {
            if last.severity == issue.severity
                && last.message == issue.message
                && last.line == issue.line
            {
                return;
            }
        }
        issues.push(issue);
    };

    let mut i = 0usize;
    while i < lines.len() {
        let l = lines[i].trim_end();

        if let Some(caps) = re_fileline().captures(l) {
            let file = caps[1].trim_start_matches("./").to_string();
            let line = caps[2].parse::<u32>().ok();
            let message = caps[3].trim().to_string();
            push(
                Issue {
                    severity: "error".into(),
                    line,
                    file: Some(file),
                    message,
                },
                &mut issues,
            );
            i += 1;
            continue;
        }

        if let Some(caps) = re_bang().captures(l) {
            let message = caps[1].trim().to_string();
            // Old-style errors carry their line in a later "l.<n>" line.
            let mut line: Option<u32> = None;
            let mut j = i + 1;
            let mut looked = 0;
            while j < lines.len() && looked < 12 {
                if let Some(c2) = re_lpoint().captures(lines[j].trim_end()) {
                    line = c2[1].parse::<u32>().ok();
                    break;
                }
                j += 1;
                looked += 1;
            }
            push(
                Issue {
                    severity: "error".into(),
                    line,
                    file: Some("main.tex".into()),
                    message,
                },
                &mut issues,
            );
            i += 1;
            continue;
        }

        if let Some(caps) = re_warning().captures(l) {
            let message = format!("{}: {}", caps[1].trim(), caps[2].trim());
            push(
                Issue {
                    severity: "warning".into(),
                    line: None,
                    file: None,
                    message,
                },
                &mut issues,
            );
            i += 1;
            continue;
        }

        if let Some(caps) = re_badbox().captures(l) {
            let line = caps
                .get(4)
                .or_else(|| caps.get(5))
                .and_then(|m| m.as_str().parse::<u32>().ok());
            // regex >= 1.11: indexing a Captures yields &str directly
            // (note: the Index place is unsized `str`, so borrow it for format!).
            let message = format!("{} \\{}box ({})", &caps[1], &caps[2], &caps[3]);
            push(
                Issue {
                    severity: "badbox".into(),
                    line,
                    file: None,
                    message,
                },
                &mut issues,
            );
            i += 1;
            continue;
        }

        i += 1;
    }

    issues
}

fn tail_chars(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut start = s.len() - max_bytes;
    while start < s.len() && !s.is_char_boundary(start) {
        start += 1;
    }
    let slice = &s[start..];
    match slice.find('\n') {
        Some(idx) if idx < 80 => slice[idx + 1..].to_string(),
        _ => slice.to_string(),
    }
}
