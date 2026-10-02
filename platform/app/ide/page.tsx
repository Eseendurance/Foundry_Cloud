"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Download,
  RotateCcw,
  LayoutPanelLeft,
  Rows3,
} from "lucide-react";
import {
  Group,
  Panel,
  Separator,
} from "react-resizable-panels";
import AgentPanel from "@/components/AgentPanel";
import GitHubConnect from "@/components/GitHubConnect";
import FileTree from "@/components/FileTree";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_FILES: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>My app</title>
  </head>
  <body>
    <h1>Edit me</h1>
    <p>Change any file on the left, then hit Run.</p>
    <button id="count-btn">Clicked 0 times</button>
  </body>
</html>
`,
  "styles.css": `body {
  font-family: system-ui, sans-serif;
  padding: 2.5rem;
  background: #faf7f1;
  color: #202b24;
}

button {
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: 1px solid #dfd6c4;
  background: #33513c;
  color: white;
  cursor: pointer;
}
`,
  "script.js": `let count = 0;
const btn = document.getElementById("count-btn");
btn.addEventListener("click", () => {
  count += 1;
  btn.textContent = \`Clicked \${count} times\`;
});
`,
};

const CLASSIC_TABS = ["index.html", "styles.css", "script.js"];
const IMPORT_KEY = "groundwork:ide-import";
const IMPORT_FILES_KEY = "groundwork:ide-import-files";

const LANGUAGE_BY_EXT: Record<string, string> = {
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  xml: "xml",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  lua: "lua",
  r: "r",
  dart: "dart",
  scala: "scala",
  pl: "perl",
  vue: "html",
  env: "shell",
};

function languageFor(path: string): string {
  const file = path.split("/").pop() || path;
  if (file.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = file.includes(".") ? file.split(".").pop()!.toLowerCase() : "";
  return LANGUAGE_BY_EXT[ext] || "plaintext";
}

function compose(files: Record<string, string>): { html: string; log: string[] } {
  const log: string[] = [];
  const htmlKey = "index.html" in files
    ? "index.html"
    : Object.keys(files).find((k) => k.endsWith(".html"));

  if (!htmlKey) {
    return {
      html: "<!DOCTYPE html><html><body><p>No index.html — create one to preview.</p></body></html>",
      log: ["No index.html found. Preview needs one file ending in .html."],
    };
  }

  const cssFiles = Object.keys(files).filter((k) => k.endsWith(".css")).sort();
  const jsFiles = Object.keys(files).filter((k) => k.endsWith(".js")).sort();

  let doc = files[htmlKey].includes("<html")
    ? files[htmlKey]
    : `<!DOCTYPE html><html><head></head><body>${files[htmlKey]}</body></html>`;

  const css = cssFiles.map((f) => files[f]).join("\n");
  const js = jsFiles.map((f) => files[f]).join("\n");

  doc = doc.includes("</head>")
    ? doc.replace("</head>", `<style>${css}</style></head>`)
    : `<style>${css}</style>${doc}`;
  doc = doc.includes("</body>")
    ? doc.replace("</body>", `<script>${js}<\/script></body>`)
    : `${doc}<script>${js}<\/script>`;

  log.push(`Entry point: ${htmlKey}`);
  log.push(
    cssFiles.length
      ? `Inlined ${cssFiles.length} stylesheet(s): ${cssFiles.join(", ")}`
      : "No stylesheets found."
  );
  log.push(
    jsFiles.length
      ? `Inlined ${jsFiles.length} script(s): ${jsFiles.join(", ")}`
      : "No scripts found."
  );
  log.push(`Preview updated — ${doc.length.toLocaleString()} characters.`);

  return { html: doc, log };
}

function initialState(): { files: Record<string, string>; importedFlat: boolean } {
  if (typeof window === "undefined") {
    return { files: DEFAULT_FILES, importedFlat: false };
  }

  const importedFiles = window.sessionStorage.getItem(IMPORT_FILES_KEY);
  if (importedFiles) {
    window.sessionStorage.removeItem(IMPORT_FILES_KEY);
    try {
      const parsed = JSON.parse(importedFiles);
      if (parsed && typeof parsed === "object") {
        return { files: parsed, importedFlat: false };
      }
    } catch {
      // fall through to other import paths
    }
  }

  const imported = window.sessionStorage.getItem(IMPORT_KEY);
  if (imported) {
    window.sessionStorage.removeItem(IMPORT_KEY);
    return { files: { ...DEFAULT_FILES, "index.html": imported }, importedFlat: true };
  }
  return { files: DEFAULT_FILES, importedFlat: false };
}

function initialGithubBanner(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const gh = params.get("github");
  if (!gh) return null;
  window.history.replaceState(null, "", window.location.pathname);
  if (gh === "connected") return "Connected to GitHub.";
  if (gh === "state_mismatch") return "GitHub connection failed — please try again.";
  if (gh === "error") {
    const detail = params.get("detail");
    return `GitHub connection failed${detail ? `: ${detail}` : "."}`;
  }
  return null;
}

export default function Ide() {
  const [view, setView] = useState<"classic" | "pro">("classic");
  const [{ files, importedFlat, original }, setState] = useState(() => {
    const init = initialState();
    return { ...init, original: init.files };
  });
  const [active, setActive] = useState("index.html");
  const [preview, setPreview] = useState("");
  const [buildLog, setBuildLog] = useState<string[]>([
    "Ready. Edit a file and hit Run to see output here.",
  ]);
  const [githubBanner, setGithubBanner] = useState<string | null>(initialGithubBanner);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!githubBanner) return;
    const t = setTimeout(() => setGithubBanner(null), 6000);
    return () => clearTimeout(t);
  }, [githubBanner]);

  function setFiles(updater: (f: Record<string, string>) => Record<string, string>) {
    setState((s) => ({ ...s, files: updater(s.files) }));
  }

  function log(line: string) {
    setBuildLog((prev) => [...prev.slice(-49), `${new Date().toLocaleTimeString()}  ${line}`]);
  }

  function run() {
    const result = compose(files);
    setPreview(result.html);
    result.log.forEach(log);
  }

  function reset() {
    setState({ files: DEFAULT_FILES, importedFlat: false, original: DEFAULT_FILES });
    setPreview("");
    setBuildLog(["Reset to the starter files."]);
    setActive("index.html");
  }

  function download() {
    const { html } = compose(files);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app.html";
    a.click();
    URL.revokeObjectURL(url);
    log("Downloaded composed app.html");
  }

  function leafName(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1];
  }

  function parentOf(path: string): string {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
  }

  function addFile(parent: string) {
    let name = window.prompt(parent ? `New file name inside ${parent}/` : "New file name (e.g. about.html, utils.js)");
    if (!name) return;
    name = name.trim().replace(/^\/+/, "");
    if (!name) return;
    const fullPath = parent ? `${parent}/${name}` : name;
    if (files[fullPath] !== undefined) {
      window.alert(`${fullPath} already exists.`);
      return;
    }
    setFiles((f) => ({ ...f, [fullPath]: "" }));
    setActive(fullPath);
    log(`Created ${fullPath}`);
  }

  function addFolder(parent: string) {
    let name = window.prompt(parent ? `New folder name inside ${parent}/` : "New folder name");
    if (!name) return;
    name = name.trim().replace(/^\/+|\/+$/g, "");
    if (!name) return;
    const fullPath = parent ? `${parent}/${name}` : name;
    const keepPath = `${fullPath}/.gitkeep`;
    if (files[keepPath] !== undefined) {
      window.alert(`${fullPath} already exists.`);
      return;
    }
    setFiles((f) => ({ ...f, [keepPath]: "" }));
    log(`Created folder ${fullPath}`);
  }

  function deleteFile(name: string) {
    if (Object.keys(files).length <= 1) {
      window.alert("Keep at least one file.");
      return;
    }
    if (!window.confirm(`Delete ${name}?`)) return;
    setFiles((f) => {
      const next = { ...f };
      delete next[name];
      return next;
    });
    if (active === name) {
      setActive(Object.keys(files).find((k) => k !== name) || "index.html");
    }
    log(`Deleted ${name}`);
  }

  function deleteFolder(path: string) {
    const prefix = `${path}/`;
    const affected = Object.keys(files).filter((k) => k.startsWith(prefix));
    if (affected.length === 0) {
      window.alert("That folder is already empty.");
      return;
    }
    if (affected.length >= Object.keys(files).length) {
      window.alert("Keep at least one file — can't delete everything.");
      return;
    }
    if (!window.confirm(`Delete folder "${path}" and its ${affected.length} file(s)?`)) return;
    setFiles((f) => {
      const next = { ...f };
      for (const k of affected) delete next[k];
      return next;
    });
    if (active.startsWith(prefix)) {
      const remaining = Object.keys(files).filter((k) => !k.startsWith(prefix));
      setActive(remaining[0] || "index.html");
    }
    log(`Deleted folder ${path} (${affected.length} file(s))`);
  }

  function renamePath(path: string, isFolder: boolean) {
    const newLeaf = window.prompt("Rename to:", leafName(path));
    if (!newLeaf || !newLeaf.trim() || newLeaf.trim() === leafName(path)) return;
    const parent = parentOf(path);
    const newPath = parent ? `${parent}/${newLeaf.trim()}` : newLeaf.trim();

    if (isFolder) {
      const prefix = `${path}/`;
      const newPrefix = `${newPath}/`;
      const affected = Object.keys(files).filter((k) => k.startsWith(prefix));
      const collision = affected.some((k) => {
        const newKey = newPrefix + k.slice(prefix.length);
        return files[newKey] !== undefined && !affected.includes(newKey);
      });
      if (collision) {
        window.alert(`${newPath} already has conflicting files.`);
        return;
      }
      setFiles((f) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(f)) {
          next[k.startsWith(prefix) ? newPrefix + k.slice(prefix.length) : k] = v;
        }
        return next;
      });
      if (active.startsWith(prefix)) setActive(newPrefix + active.slice(prefix.length));
      log(`Renamed folder ${path} → ${newPath}`);
    } else {
      if (files[newPath] !== undefined) {
        window.alert(`${newPath} already exists.`);
        return;
      }
      setFiles((f) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(f)) next[k === path ? newPath : k] = v;
        return next;
      });
      if (active === path) setActive(newPath);
      log(`Renamed ${path} → ${newPath}`);
    }
  }

  const fileNames = Object.keys(files).sort();
  const visibleTabs = view === "classic" ? CLASSIC_TABS.filter((t) => t in files) : fileNames;

  return (
    <div className="flex h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={16} />
          Workspace
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-line bg-paper-dim/40 p-0.5">
          <button
            onClick={() => setView("classic")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              view === "classic" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Rows3 size={13} />
            Classic
          </button>
          <button
            onClick={() => setView("pro")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              view === "pro" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            <LayoutPanelLeft size={13} />
            Pro
          </button>
        </div>

        <div className="flex items-center gap-2">
          <GitHubConnect files={files} />
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink hover:text-ink"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={download}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink hover:text-ink"
          >
            <Download size={13} />
            Download
          </button>
          <button
            onClick={run}
            className="flex items-center gap-1.5 rounded-full bg-moss px-4 py-1.5 text-xs font-medium text-paper hover:bg-moss-deep"
          >
            <Play size={13} />
            Run
          </button>
        </div>
      </header>

      {githubBanner && (
        <p className="border-b border-line bg-moss/10 px-6 py-2 text-xs text-ink">
          {githubBanner}
        </p>
      )}

      {importedFlat && (
        <p className="border-b border-line bg-amber/10 px-6 py-2 text-xs text-ink-soft">
          Imported a single-file app from the builder into{" "}
          <code className="font-mono">index.html</code>.
        </p>
      )}

      {view === "classic" ? (
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
          <div className="flex flex-col border-r border-line" ref={editorRef}>
            <div className="flex border-b border-line bg-paper-dim/40">
              {visibleTabs.map((name) => (
                <button
                  key={name}
                  onClick={() => setActive(name)}
                  className={`border-r border-line px-4 py-2 font-mono text-xs ${
                    active === name ? "bg-paper text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex-1">
              <Editor
                key={active}
                path={active}
                language={languageFor(active)}
                value={files[active] ?? ""}
                onChange={(val) => setFiles((f) => ({ ...f, [active]: val ?? "" }))}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
          <iframe
            title="preview"
            srcDoc={preview}
            sandbox="allow-scripts"
            className="h-full w-full bg-white"
          />
        </div>
      ) : (
        <Group orientation="horizontal" className="flex-1 overflow-hidden">
          {/* File explorer */}
          <Panel defaultSize="20" minSize="14" maxSize="34">
            <div className="flex h-full flex-col border-r border-line bg-paper-dim/30">
              <div className="flex-1 overflow-auto">
                <FileTree
                  files={files}
                  active={active}
                  dirty={(path) => files[path] !== original[path]}
                  onSelect={setActive}
                  onCreateFile={addFile}
                  onCreateFolder={addFolder}
                  onRename={renamePath}
                  onDeleteFile={deleteFile}
                  onDeleteFolder={deleteFolder}
                />
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-line hover:bg-moss/40" />

          {/* Editor + preview/log */}
          <Panel defaultSize="60">
            <Group orientation="vertical">
              <Panel defaultSize="65" minSize="30">
                <Group orientation="horizontal" className="h-full">
                  <Panel defaultSize="50" minSize="25">
                    <div className="flex h-full flex-col">
                      <div className="border-b border-line bg-paper-dim/40 px-3 py-1.5 font-mono text-xs text-ink-soft">
                        {active}
                      </div>
                      <div className="flex-1">
                        <Editor
                          key={active}
                          path={active}
                          language={languageFor(active)}
                          value={files[active] ?? ""}
                          onChange={(val) => setFiles((f) => ({ ...f, [active]: val ?? "" }))}
                          theme="vs-dark"
                          options={{
                            fontSize: 13,
                            minimap: { enabled: false },
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    </div>
                  </Panel>
                  <Separator className="w-1 bg-line hover:bg-moss/40" />
                  <Panel defaultSize="50" minSize="25">
                    <iframe
                      title="preview"
                      srcDoc={preview}
                      sandbox="allow-scripts"
                      className="h-full w-full bg-white"
                    />
                  </Panel>
                </Group>
              </Panel>

              <Separator className="h-1 bg-line hover:bg-moss/40" />

              {/* Build log — real output from Run/file actions, not a general shell */}
              <Panel defaultSize="35" minSize="15">
                <div className="h-full overflow-auto bg-ink px-4 py-3 font-mono text-xs text-paper/80">
                  <div className="mb-2 text-paper/40">
                    build log — reflects Run and file actions only, not an arbitrary
                    shell (that needs a sandboxed execution service we haven&apos;t
                    connected)
                  </div>
                  {buildLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </Panel>
            </Group>
          </Panel>

          <Separator className="w-1 bg-line hover:bg-moss/40" />

          {/* AI agent — reasons over current files, proposes edits as
              real diffs, never applies anything without a click */}
          <Panel defaultSize="22" minSize="16" maxSize="35">
            <AgentPanel
              files={files}
              onApply={(path, content) => {
                setFiles((f) => ({ ...f, [path]: content }));
                if (!files[path]) log(`Agent created ${path}`);
                else log(`Agent edited ${path}`);
              }}
            />
          </Panel>
        </Group>
      )}
    </div>
  );
}
