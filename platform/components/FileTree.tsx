"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  FilePlus,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";

type FileNode = { type: "file"; name: string; path: string };
type FolderNode = { type: "folder"; name: string; path: string; children: TreeNode[] };
type TreeNode = FileNode | FolderNode;

const KEEP_FILE = ".gitkeep";

function buildTree(paths: string[]): TreeNode[] {
  type Raw = { folders: Map<string, Raw>; files: string[] };
  const root: Raw = { folders: new Map(), files: [] };

  for (const path of paths) {
    const parts = path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!cur.folders.has(part)) cur.folders.set(part, { folders: new Map(), files: [] });
      cur = cur.folders.get(part)!;
    }
    cur.files.push(parts[parts.length - 1]);
  }

  function toNodes(raw: Raw, prefix: string): TreeNode[] {
    const folderNodes: TreeNode[] = [...raw.folders.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, child]) => ({
        type: "folder" as const,
        name,
        path: prefix ? `${prefix}/${name}` : name,
        children: toNodes(child, prefix ? `${prefix}/${name}` : name),
      }));

    const visibleFiles = raw.files.filter((f) => f !== KEEP_FILE);
    const fileNodes: TreeNode[] = visibleFiles
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        type: "file" as const,
        name,
        path: prefix ? `${prefix}/${name}` : name,
      }));

    return [...folderNodes, ...fileNodes];
  }

  return toNodes(root, "");
}

export default function FileTree({
  files,
  active,
  dirty,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDeleteFile,
  onDeleteFolder,
}: {
  files: Record<string, string>;
  active: string;
  dirty: (path: string) => boolean;
  onSelect: (path: string) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onRename: (path: string, isFolder: boolean) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = buildTree(Object.keys(files));

  function isExpanded(path: string) {
    // Auto-expand everything by default; only collapse if explicitly toggled closed.
    return !expanded.has(`collapsed:${path}`);
  }

  function toggleCollapse(path: string) {
    setExpanded((prev) => {
      const key = `collapsed:${path}`;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderNodes(nodes: TreeNode[], depth: number) {
    return nodes.map((node) => {
      if (node.type === "folder") {
        const open = isExpanded(node.path);
        return (
          <div key={node.path}>
            <div
              className="group flex items-center justify-between px-1 py-1 text-xs hover:bg-paper-dim/60"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
              <button
                onClick={() => toggleCollapse(node.path)}
                className="flex flex-1 items-center gap-1 truncate text-left text-ink-soft"
              >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Folder size={12} className="text-amber" />
                <span className="truncate font-mono">{node.name}</span>
              </button>
              <span className="ml-1 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => onCreateFile(node.path)} title="New file">
                  <FilePlus size={11} />
                </button>
                <button onClick={() => onCreateFolder(node.path)} title="New folder">
                  <FolderPlus size={11} />
                </button>
                <button onClick={() => onRename(node.path, true)} title="Rename">
                  <Pencil size={11} />
                </button>
                <button onClick={() => onDeleteFolder(node.path)} title="Delete folder">
                  <Trash2 size={11} />
                </button>
              </span>
            </div>
            {open && renderNodes(node.children, depth + 1)}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          className={`group flex items-center justify-between px-1 py-1 text-xs ${
            active === node.path ? "bg-moss/10 text-ink" : "text-ink-soft hover:bg-paper-dim/60"
          }`}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <button
            onClick={() => onSelect(node.path)}
            className="flex flex-1 items-center gap-1 truncate text-left"
          >
            <FileText size={11} className="shrink-0 opacity-60" />
            <span className="truncate font-mono">{node.name}</span>
          </button>
          <span className="ml-1 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
            {dirty(node.path) && (
              <span className="mr-0.5 text-[10px] font-bold text-amber" title="Edited this session">
                M
              </span>
            )}
            <button onClick={() => onRename(node.path, false)} title="Rename">
              <Pencil size={11} />
            </button>
            <button onClick={() => onDeleteFile(node.path)} title="Delete">
              <Trash2 size={11} />
            </button>
          </span>
        </div>
      );
    });
  }

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft/70">root</span>
        <span className="flex items-center gap-1.5 text-ink-soft">
          <button onClick={() => onCreateFile("")} title="New file at root">
            <FilePlus size={12} />
          </button>
          <button onClick={() => onCreateFolder("")} title="New folder at root">
            <FolderPlus size={12} />
          </button>
        </span>
      </div>
      {renderNodes(tree, 0)}
    </div>
  );
}
