import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  Play, ArrowLeft, RotateCcw, Moon, Sun, Sparkles, Layout, Code2, Eye, 
  Terminal, Folder, Settings, Share2, Plus, Upload, RefreshCw, 
  Laptop, Tablet, Smartphone, ExternalLink, Package, ArrowRight
} from "lucide-react";
import okikeLogo from "@/assets/okike-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: FileNode[];
}

function buildFileTree(fileKeys: string[]): FileNode[] {
  const roots: FileNode[] = [];
  for (const key of fileKeys) {
    const parts = key.split("/");
    let currentLevel = roots;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      let existing = currentLevel.find(node => node.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isLast ? "file" : "directory",
          children: []
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }
  }
  
  const sortTree = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
      if (n.children.length > 0) sortTree(n.children);
    });
  };
  sortTree(roots);
  return roots;
}

interface FileTreeItemProps {
  node: FileNode;
  activeFile: string;
  setActiveFile: (path: string) => void;
  deleteFile: (path: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}

function FileTreeItem({ node, activeFile, setActiveFile, deleteFile, expandedDirs, toggleDir }: FileTreeItemProps) {
  if (node.type === "file") {
    const isHtml = node.name.endsWith(".html");
    const isCss = node.name.endsWith(".css");
    const isJs = node.name.endsWith(".js") || node.name.endsWith(".jsx") || node.name.endsWith(".tsx");
    const isCore = node.path === "index.html" || node.path === "main.js" || node.path === "style.css";

    return (
      <div className={`flex items-center justify-between group px-2 py-1 rounded-md text-[11px] font-mono transition cursor-pointer ${
        activeFile === node.path
          ? "bg-[#eab308]/15 text-[#eab308] font-bold"
          : "hover:bg-gray-800/30 text-gray-450"
      }`}>
        <button
          onClick={() => setActiveFile(node.path)}
          className="flex-1 flex items-center gap-1.5 text-left truncate cursor-pointer"
        >
          <span className={isHtml ? "text-orange-500 font-bold" : isCss ? "text-sky-400 font-bold" : "text-yellow-500 font-bold"}>
            {isHtml ? "<>" : isCss ? "#" : "JS"}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        {!isCore && (
          <button
            onClick={() => deleteFile(node.path)}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 px-1 font-bold cursor-pointer"
            title="Delete File"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const isExpanded = expandedDirs.has(node.path);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => toggleDir(node.path)}
        className="w-full flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-800/20 text-gray-400 hover:text-gray-200 text-[11px] font-semibold text-left cursor-pointer"
      >
        <span className="text-[10px] text-gray-500">
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className="text-yellow-600 font-bold">📁</span>
        <span className="truncate font-mono">{node.name}</span>
      </button>

      {isExpanded && node.children && (
        <div className="pl-3 border-l border-gray-800/50 ml-2.5 space-y-0.5 mt-0.5">
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              activeFile={activeFile}
              setActiveFile={setActiveFile}
              deleteFile={deleteFile}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SandboxSearch = {
  html?: string;
  css?: string;
  js?: string;
  python?: string;
  title?: string;
  mode?: "frontend" | "python";
  files?: string;
};

export const Route = createFileRoute("/sandbox")({
  validateSearch: (search: Record<string, unknown>): SandboxSearch => {
    return {
      html: typeof search.html === "string" ? search.html : undefined,
      css: typeof search.css === "string" ? search.css : undefined,
      js: typeof search.js === "string" ? search.js : undefined,
      python: typeof search.python === "string" ? search.python : undefined,
      title: typeof search.title === "string" ? search.title : undefined,
      mode: search.mode === "frontend" || search.mode === "python" ? search.mode : undefined,
      files: typeof search.files === "string" ? search.files : undefined,
    };
  },
  component: SandboxPage,
});

function SandboxPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Mode state
  const [mode, setMode] = useState<"frontend" | "python">(search.mode || "frontend");
  const [srcDoc, setSrcDoc] = useState("");
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  // Theme & Split states
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<"split" | "code" | "preview">("split");
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [sidebarTab, setSidebarTab] = useState<"explorer" | "packages">("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default sidebar closed for beginners

  // File system states
  const [activeFile, setActiveFile] = useState<string>("App.js"); // Default App.js for beginners
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["src"]));

  // NPM Package states
  const [pkgInput, setPkgInput] = useState("");
  const [installedPackages, setInstalledPackages] = useState<string[]>(["canvas-confetti"]);

  // Console states
  const [logs, setLogs] = useState<{ method: string; text: string }[]>([]);
  const [autoRun, setAutoRun] = useState(true);
  const [showConsole, setShowConsole] = useState(true);

  // Folder uploader ref
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Default starter templates
  const defaultHtml = `<!-- Mount point for React bundle -->
<div id="root"></div>`;

  const defaultCss = `/* Clean Stylesheet */
body {
  font-family: 'Outfit', system-ui, sans-serif;
  background: #09090b;
  color: #f4f4f5;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}`;

  const defaultJs = `// Entry mounting logic
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);`;

  const defaultApp = `// React Workspace Component
import React, { useState } from 'react';
import confetti from 'canvas-confetti';

export default function App() {
  const [count, setCount] = useState(0);

  const celebration = () => {
    setCount(count + 1);
    confetti();
    console.log("React Counter updated to:", count + 1);
  };

  return (
    <div style={{ textAlign: 'center', padding: '30px' }}>
      <h2 style={{ color: '#eab308' }}>OKIKE React Sandbox IDE ⚛️</h2>
      <p style={{ color: '#a1a1aa', fontSize: '13px' }}>
        A professional development runtime with ESM package resolves.
      </p>
      
      <div style={{ margin: '25px 0' }}>
        <button 
          onClick={celebration}
          style={{
            background: '#eab308',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(234, 179, 8, 0.2)'
          }}
        >
          Increment Counter: {count}
        </button>
      </div>

      <p style={{ fontSize: '11px', color: '#52525b' }}>
        Edit script files or inspect output console below.
      </p>
    </div>
  );
}`;

  const getInitialFiles = () => {
    if (search.files) {
      try {
        return JSON.parse(search.files);
      } catch (e) {
        console.error("Failed to parse search files:", e);
      }
    }
    return {
      "index.html": search.html || defaultHtml,
      "style.css": search.css || defaultCss,
      "main.js": search.js || defaultJs,
      "App.js": defaultApp,
      "script.py": search.python || `# Python Wasm Console
def run():
    print("Welcome to OKIKE WebAssembly Python!")

run()`
    };
  };

  const [files, setFiles] = useState<Record<string, string>>(getInitialFiles());

  function updateActiveFileContent(content: string) {
    setFiles(prev => ({
      ...prev,
      [activeFile]: content
    }));
  }

  function toggleDir(path: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  // Load templates
  const TEMPLATES = {
    frontend: {
      counter: {
        title: "Counter Application",
        files: {
          "index.html": `<div id="root"></div>`,
          "style.css": `body { background: #000; color: #fff; text-align: center; font-family: sans-serif; }`,
          "main.js": `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\n\nconst root = createRoot(document.getElementById('root'));\nroot.render(<App />);`,
          "App.js": `import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ padding: '20px' }}>\n      <h2>Counter Application</h2>\n      <button \n        onClick={() => setCount(count + 1)}\n        style={{ background: '#eab308', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}\n      >\n        Count: {count}\n      </button>\n    </div>\n  );\n}`
        }
      },
      card: {
        title: "Modern Profile Card",
        files: {
          "index.html": `<div id="root"></div>`,
          "style.css": `body { background: #111; color: #eee; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }`,
          "main.js": `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\n\nconst root = createRoot(document.getElementById('root'));\nroot.render(<App />);`,
          "App.js": `import React from 'react';\n\nexport default function App() {\n  return (\n    <div style={{ border: '1px solid #333', padding: '20px', borderRadius: '12px', background: '#222' }}>\n      <h3>Developer Profile</h3>\n      <p>React ESM Sandbox runtime active.</p>\n    </div>\n  );\n}`
        }
      }
    },
    python: {
      math: {
        title: "Fibonacci Sequence",
        files: {
          "script.py": `def fibonacci(n):\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq\n\nprint(fibonacci(10))`
        }
      },
      stats: {
        title: "Lists Statistics Analytics",
        files: {
          "script.py": `scores = [88, 92, 79, 93, 85]\nprint("Average:", sum(scores) / len(scores))`
        }
      }
    }
  };

  function loadTemplate(key: string) {
    if (mode === "python") {
      const t = (TEMPLATES.python as any)[key];
      if (t) {
        setFiles(t.files);
        setActiveFile("script.py");
        setTimeout(runCode, 50);
      }
    } else {
      const t = (TEMPLATES.frontend as any)[key];
      if (t) {
        setFiles(t.files);
        setActiveFile("index.html");
        setTimeout(runCode, 50);
      }
    }
  }

  // Auto-align file path on mode toggle
  useEffect(() => {
    if (mode === "python") {
      setActiveFile("script.py");
    } else {
      if (!isAdvancedMode) {
        setActiveFile("App.js");
      } else {
        setActiveFile("index.html");
      }
    }
  }, [mode, isAdvancedMode]);

  // Load Babel Standalone dynamically
  useEffect(() => {
    if (!(window as any).Babel) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@babel/standalone@7.24.0/babel.min.js";
      script.async = true;
      script.onload = () => {
        console.log("Babel runtime mapped.");
        runCode();
      };
      document.head.appendChild(script);
    }
  }, []);

  // Listen to console warnings
  useEffect(() => {
    function handleMsg(e: MessageEvent) {
      if (e.data && e.data.type === "console") {
        setLogs(prev => [...prev, { method: e.data.method, text: e.data.message }]);
      }
    }
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  // Auto-run trigger
  useEffect(() => {
    if (!autoRun) return;
    const timeout = setTimeout(() => {
      runCode();
    }, 600);
    return () => clearTimeout(timeout);
  }, [files, autoRun, installedPackages]);

  function runCode() {
    setLogs([]);
    if (mode === "python") {
      const code = files["script.py"] || "";
      const escaped = code.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
      const combined = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: monospace; background: #000; color: #eab308; padding: 20px; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap; }
              .status { color: #a1a1aa; border-bottom: 1px solid #1f1f22; padding-bottom: 8px; margin-bottom: 12px; font-family: system-ui, sans-serif; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="status">Python Console Active...</div>
            <div id="output">Loading Python runtime environment (this may take a few seconds)...</div>
            <script>
              function loadScript(url) {
                return new Promise((resolve) => {
                  const s = document.createElement("script");
                  s.src = url;
                  s.onload = resolve;
                  document.head.appendChild(s);
                });
              }
              async function main() {
                const outputDiv = document.getElementById("output");
                try {
                  await loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");
                  let pyodide = await loadPyodide();
                  outputDiv.innerHTML = "";
                  let stdout = "";
                  pyodide.setStdout({
                    write: (text) => { stdout += text; outputDiv.innerHTML = stdout; return text.length; }
                  });
                  await pyodide.runPythonAsync(\`${escaped}\`);
                  if (!stdout) outputDiv.innerHTML = "[Script finished with no output]";
                } catch (err) {
                  outputDiv.innerHTML += "\\n\\nError: " + err.message;
                }
              }
              main();
            </script>
          </body>
        </html>
      `;
      setSrcDoc(combined);
    } else {
      const Babel = (window as any).Babel;
      if (!Babel) {
        setSrcDoc(`<html><body style="background:#000;color:#aaa;font-family:sans-serif;text-align:center;padding-top:40px;">Compiling environment...</body></html>`);
        return;
      }

      // Automatically extract custom imports
      const imports = new Set<string>();
      const importRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;

      for (const name in files) {
        if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.tsx')) {
          let match;
          while ((match = importRegex.exec(files[name])) !== null) {
            const dep = match[1];
            if (!dep.startsWith('.') && !dep.startsWith('/') && !dep.startsWith('http')) {
              imports.add(dep);
            }
          }
        }
      }

      const importMap = {
        imports: {
          "react": "https://esm.sh/react@19?dev",
          "react-dom": "https://esm.sh/react-dom@19?dev",
          "react-dom/client": "https://esm.sh/react-dom@19/client?dev",
        } as Record<string, string>
      };

      // Map dynamic npm modules
      imports.forEach(dep => {
        if (dep !== "react" && dep !== "react-dom" && dep !== "react-dom/client") {
          importMap.imports[dep] = `https://esm.sh/${dep}`;
        }
      });
      installedPackages.forEach(dep => {
        importMap.imports[dep] = `https://esm.sh/${dep}`;
      });

      // Compile JSX modules
      const compiled: Record<string, string> = {};
      for (const name in files) {
        if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.tsx')) {
          try {
            compiled[name] = Babel.transform(files[name], {
              presets: ['react'],
              filename: name
            }).code;
          } catch (err: any) {
            setLogs(prev => [...prev, { method: "error", text: `Compiler error in ${name}: ${err.message}` }]);
            setSrcDoc(`<html><body style="background:#1a0505;color:#ff6b6b;padding:20px;font-family:monospace;"><h3>Babel Compilation Error</h3><pre>${err.message}</pre></body></html>`);
            return;
          }
        }
      }

      // Resolve object maps
      const blobUrls: Record<string, string> = {};
      for (const name in compiled) {
        const blob = new Blob([compiled[name]], { type: 'application/javascript' });
        blobUrls[name] = URL.createObjectURL(blob);
      }

      for (const name in blobUrls) {
        importMap.imports[`./${name}`] = blobUrls[name];
        const base = name.replace(/\.(js|jsx|tsx)$/, '');
        importMap.imports[`./${base}`] = blobUrls[name];
      }

      const htmlContent = files["index.html"] || `<div id="root"></div>`;
      const cssContent = files["style.css"] || "";

      const combined = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>${cssContent}</style>
            <script type="importmap">
              ${JSON.stringify(importMap, null, 2)}
            </script>
            <script>
              (function() {
                const _log = console.log;
                const _error = console.error;
                const _warn = console.warn;
                console.log = function(...args) {
                  window.parent.postMessage({ type: 'console', method: 'log', message: args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ') }, '*');
                  _log.apply(console, args);
                };
                console.error = function(...args) {
                  window.parent.postMessage({ type: 'console', method: 'error', message: args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ') }, '*');
                  _error.apply(console, args);
                };
                console.warn = function(...args) {
                  window.parent.postMessage({ type: 'console', method: 'warn', message: args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ') }, '*');
                  _warn.apply(console, args);
                };
                window.onerror = function(msg, url, line) {
                  window.parent.postMessage({ type: 'console', method: 'error', message: msg + ' (Line ' + line + ')' }, '*');
                };
              })();
            </script>
          </head>
          <body>
            ${htmlContent}
            <script type="module" src="${blobUrls["main.js"]}"></script>
          </body>
        </html>
      `;
      setSrcDoc(combined);
    }
  }

  // File explorer controls
  function createFile() {
    const name = window.prompt("Enter new file path (e.g. src/utils.js, components/Button.jsx):");
    if (!name) return;
    if (files[name] !== undefined) {
      toast.error("File already exists!");
      return;
    }
    let defaultContent = "";
    if (name.endsWith(".html")) {
      defaultContent = "<div>New template</div>";
    } else if (name.endsWith(".css")) {
      defaultContent = "/* CSS */";
    } else {
      defaultContent = `import React from 'react';\n\nexport default function Component() {\n  return <div>New Component</div>;\n}`;
    }
    setFiles(prev => ({ ...prev, [name]: defaultContent }));
    setActiveFile(name);
    toast.success(`Created file ${name}`);
  }

  function deleteFile(name: string) {
    if (name === "index.html" || name === "main.js" || name === "style.css" || name === "script.py") {
      toast.error("Cannot delete core workspace file!");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setFiles(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      if (activeFile === name) {
        setActiveFile("index.html");
      }
      toast.success(`Deleted file ${name}`);
    }
  }

  // Folder uploader
  function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    const newFilesMap: Record<string, string> = {};
    const promises: Promise<void>[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const rawPath = file.webkitRelativePath || file.name;
      const pathParts = rawPath.split("/");
      pathParts.shift(); // Strip parent directory name
      const cleanPath = pathParts.join("/");

      if (!cleanPath) continue;

      promises.push(
        new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            newFilesMap[cleanPath] = (event.target?.result as string) || "";
            resolve();
          };
          reader.readAsText(file);
        })
      );
    }

    Promise.all(promises).then(() => {
      setFiles(prev => ({
        ...prev,
        ...newFilesMap
      }));
      const keys = Object.keys(newFilesMap);
      if (keys.length > 0) {
        setActiveFile(keys[0]);
      }
      toast.success(`Uploaded folder with ${keys.length} files successfully!`);
    });
  }

  // Install custom package
  function installPackage(e: React.FormEvent) {
    e.preventDefault();
    if (!pkgInput.trim()) return;
    if (installedPackages.includes(pkgInput.trim())) {
      toast.error("Package is already installed!");
      return;
    }
    setInstalledPackages(prev => [...prev, pkgInput.trim()]);
    toast.success(`Installed NPM module: ${pkgInput}`);
    setPkgInput("");
  }

  function uninstallPackage(pkg: string) {
    setInstalledPackages(prev => prev.filter(x => x !== pkg));
    toast.success(`Removed package: ${pkg}`);
  }



  function resetCode() {
    if (window.confirm("Are you sure you want to reset current sandbox workspace?")) {
      setFiles(getInitialFiles());
      setTimeout(runCode, 50);
    }
  }

  // Keyboard hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files, mode]);

  // Build Explorer Nodes
  const fileTree = buildFileTree(
    Object.keys(files).filter(name => {
      if (mode === "python") return name === "script.py";
      return name !== "script.py";
    })
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      darkMode ? "bg-[#09090b] text-gray-200" : "bg-gray-50 text-gray-800"
    }`}>
      {/* Dynamic Activity Header */}
      <header className={`px-4 py-2.5 flex items-center justify-between border-b ${
        darkMode ? "border-gray-800 bg-[#0d0d11]" : "border-gray-200 bg-white"
      }`}>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${
              darkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src={okikeLogo} alt="OKIKE" className="h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#eab308]">React ESM Sandbox</span>
            {search.title && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                darkMode ? "bg-yellow-950 text-yellow-400 border border-yellow-800/40" : "bg-yellow-100 text-yellow-800"
              }`}>
                {search.title}
              </span>
            )}
          </div>
        </div>

        {/* Templates Picker & Modes */}
        <div className="flex items-center gap-2">
          {/* Simple vs Pro Mode Toggle */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold select-none ${
            darkMode ? "border-gray-800 bg-gray-950/80" : "border-gray-250 bg-gray-105"
          }`}>
            <span className={!isAdvancedMode ? "text-[#eab308] font-bold" : "text-gray-500"}>Simple</span>
            <button
              type="button"
              onClick={() => {
                const next = !isAdvancedMode;
                setIsAdvancedMode(next);
                if (next) {
                  setSidebarOpen(true);
                } else {
                  setSidebarOpen(false);
                  setViewMode("split");
                }
              }}
              className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                isAdvancedMode ? "bg-[#eab308]" : "bg-gray-700"
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-black transition-transform ${
                isAdvancedMode ? "translate-x-3.5" : "translate-x-0"
              }`} />
            </button>
            <span className={isAdvancedMode ? "text-[#eab308] font-bold" : "text-gray-500"}>Pro</span>
          </div>

          <select
            onChange={(e) => {
              if (e.target.value) {
                loadTemplate(e.target.value);
                e.target.value = "";
              }
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold outline-none transition cursor-pointer ${
              darkMode ? "bg-gray-900 border-gray-800 text-gray-300" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <option value="">Load Blueprint...</option>
            {mode === "frontend" ? (
              <>
                <option value="counter">Counter App Demo</option>
                <option value="card">Modern Profile Hover Card</option>
              </>
            ) : (
              <>
                <option value="math">Fibonacci Computations</option>
                <option value="stats">Lists Grade Statistics</option>
              </>
            )}
          </select>

          {/* Engine Mode */}
          <div className={`flex rounded-lg p-0.5 border ${
            darkMode ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-gray-100"
          }`}>
            <button
              onClick={() => setMode("frontend")}
              className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition ${
                mode === "frontend" ? "bg-[#eab308] text-black" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              React ⚛️
            </button>
            <button
              onClick={() => setMode("python")}
              className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition ${
                mode === "python" ? "bg-[#eab308] text-black" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Python 🐍
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-855 transition text-yellow-400 cursor-pointer"
            title="Theme Toggle"
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      {/* Main Bolt.new layout columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Activity Bar (Vertical narrow strip) */}
        {isAdvancedMode && (
          <div className={`w-12 shrink-0 border-r flex flex-col items-center py-4 gap-4 ${
            darkMode ? "bg-[#0c0c0e] border-gray-800" : "bg-gray-100 border-gray-200"
          }`}>
            <button
              onClick={() => {
                setSidebarOpen(true);
                setSidebarTab("explorer");
              }}
              className={`p-2 rounded-lg transition ${
                sidebarOpen && sidebarTab === "explorer" ? "bg-[#eab308]/15 text-[#eab308]" : "text-gray-400 hover:text-gray-200"
              }`}
              title="File Explorer"
            >
              <Folder className="size-5" />
            </button>
            <button
              onClick={() => {
                setSidebarOpen(true);
                setSidebarTab("packages");
              }}
              className={`p-2 rounded-lg transition ${
                sidebarOpen && sidebarTab === "packages" ? "bg-[#eab308]/15 text-[#eab308]" : "text-gray-400 hover:text-gray-200"
              }`}
              title="Package Manager (NPM)"
            >
              <Package className="size-5" />
            </button>
            <div className="flex-1"></div>
            
            <button
              onClick={resetCode}
              className="p-2 text-red-400 hover:text-red-300 transition"
              title="Reset Workspace"
            >
              <RotateCcw className="size-5" />
            </button>
          </div>
        )}

        {/* Sidebar explorer/packages */}
        {sidebarOpen && (
          <div className={`w-60 border-r flex flex-col text-left ${
            darkMode ? "bg-[#0e0e12] border-gray-800" : "bg-gray-55 border-gray-200"
          }`}>
            {sidebarTab === "explorer" ? (
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-2.5 border-b border-gray-800/10 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Workspace</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={createFile}
                      className="px-1.5 py-0.5 rounded bg-brand/10 hover:bg-brand/20 text-[#eab308] text-[10px] font-bold cursor-pointer"
                      title="New File"
                    >
                      + File
                    </button>
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="p-1 rounded bg-brand/10 hover:bg-brand/20 text-[#eab308] text-[10px] font-bold cursor-pointer flex items-center gap-1"
                      title="Upload Directory Folder"
                    >
                      <Upload className="size-3" />
                    </button>
                    <input
                      type="file"
                      ref={folderInputRef}
                      className="hidden"
                      {...({
                        webkitdirectory: "",
                        directory: ""
                      } as any)}
                      multiple
                      onChange={handleFolderUpload}
                    />
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-1">
                  {fileTree.map(node => (
                    <FileTreeItem
                      key={node.path}
                      node={node}
                      activeFile={activeFile}
                      setActiveFile={setActiveFile}
                      deleteFile={deleteFile}
                      expandedDirs={expandedDirs}
                      toggleDir={toggleDir}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-3">
                <div className="border-b border-gray-850 pb-2 mb-3">
                  <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest">NPM Dependencies</h4>
                  <p className="text-[10px] text-gray-550 mt-1">Install packages directly from ESM registry.</p>
                </div>
                
                <form onSubmit={installPackage} className="flex gap-1.5 mb-4">
                  <input
                    type="text"
                    value={pkgInput}
                    onChange={(e) => setPkgInput(e.target.value)}
                    placeholder="Package e.g. lodash"
                    className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border outline-none ${
                      darkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-black"
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#eab308] text-black hover:bg-opacity-90 rounded-lg text-xs font-bold font-mono cursor-pointer"
                  >
                    Install
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Installed Map</span>
                  {installedPackages.map(pkg => (
                    <div key={pkg} className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-gray-800 text-xs font-mono">
                      <span className="truncate">{pkg}</span>
                      <button
                        onClick={() => uninstallPackage(pkg)}
                        className="text-red-400 hover:text-red-500 text-xs px-1 cursor-pointer font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Code workspace area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Segment Toggle Workspace */}
          <div className={`px-4 py-2 border-b flex items-center justify-between ${
            darkMode ? "bg-[#0b0b0e] border-gray-800" : "bg-gray-100 border-gray-200"
          }`}>
            <div className="flex items-center gap-1.5">
              {isAdvancedMode ? (
                <>
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`p-1 rounded hover:bg-gray-800/30 text-gray-400`}
                    title="Toggle Explorer"
                  >
                    <Layout className="size-4" />
                  </button>
                  <div className="h-4 w-px bg-gray-800"></div>
                  
                  {/* Segment Toggle Mode selector */}
                  <div className={`flex rounded-lg p-0.5 border ${
                    darkMode ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-gray-100"
                  }`}>
                    {["split", "code", "preview"].map(v => (
                      <button
                        key={v}
                        onClick={() => setViewMode(v as any)}
                        className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
                          viewMode === v ? "bg-[#eab308] text-black" : "text-gray-555 hover:text-gray-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-xs font-bold text-[#eab308] uppercase tracking-wider select-none px-1">
                  ⚡ Editor Workspace
                </span>
              )}
            </div>

            {/* Run manual compiler */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRun}
                  onChange={(e) => setAutoRun(e.target.checked)}
                  className="accent-[#eab308] size-3.5"
                />
                <span>Auto-run</span>
              </label>
              
              <button
                onClick={runCode}
                className="px-3.5 py-1.5 bg-[#eab308] text-black hover:bg-opacity-95 rounded-lg flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Play className="size-3 fill-current" /> Run Code
              </button>
            </div>
          </div>

          {/* Panes workspace grids */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Editor panel */}
            {(viewMode === "split" || viewMode === "code") && (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* File tab bar */}
                <div className={`flex border-b overflow-x-auto scrollbar-none ${
                  darkMode ? "bg-gray-955/60 border-gray-800" : "bg-gray-100 border-gray-200"
                }`}>
                  <div className="px-4 py-2.5 text-xs font-mono font-bold bg-[#eab308]/10 text-[#eab308] border-b-2 border-[#eab308] flex items-center gap-1.5">
                    <span>{activeFile}</span>
                  </div>
                </div>

                {/* Main Code Gutter & Editor workspace */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Gutters line numbers */}
                  <div className={`w-10 select-none font-mono text-[11px] text-right pr-2.5 pt-3 leading-6 border-r text-gray-600 ${
                    darkMode ? "bg-[#050507] border-gray-800" : "bg-gray-100/50 border-gray-200"
                  }`}>
                    {Array.from({ length: (files[activeFile] || "").split("\n").length }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Code editor pane */}
                  <div className="flex-1 flex flex-col relative">
                    <textarea
                      value={files[activeFile] || ""}
                      onChange={(e) => updateActiveFileContent(e.target.value)}
                      className={`flex-1 w-full font-mono text-xs p-3 focus:outline-none resize-none leading-6 ${
                        darkMode ? "bg-black text-gray-200" : "bg-white text-gray-800"
                      }`}
                      placeholder={`// Write ${activeFile} script code here...`}
                      spellCheck="false"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview Frame */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className={`flex-1 flex flex-col overflow-hidden border-l ${
                darkMode ? "border-gray-800" : "border-gray-200"
              }`}>
                {/* Mock Browser address bar header */}
                <div className={`px-4 py-2 border-b flex items-center justify-between gap-4 select-none ${
                  darkMode ? "bg-[#0b0b0d] border-gray-800" : "bg-gray-55 border-gray-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={runCode}
                      className="p-1 rounded hover:bg-gray-800 text-gray-400"
                      title="Reload Live Server"
                    >
                      <RefreshCw className="size-3.5" />
                    </button>
                    <div className={`text-xs px-3 py-1 rounded-md border font-mono truncate select-all flex items-center gap-1.5 ${
                      darkMode ? "bg-gray-900 border-gray-800 text-gray-400" : "bg-white border-gray-200 text-gray-600"
                    }`} style={{ width: "240px" }}>
                      <span className="text-emerald-500 text-[10px]">●</span> http://localhost:5173/
                    </div>
                  </div>

                  {/* Responsive viewport sizes switches */}
                  <div className="flex items-center gap-1 border border-gray-800 rounded p-0.5">
                    {[
                      { id: "desktop", icon: Laptop },
                      { id: "tablet", icon: Tablet },
                      { id: "mobile", icon: Smartphone },
                    ].map(x => (
                      <button
                        key={x.id}
                        onClick={() => setViewportSize(x.id as any)}
                        className={`p-1 rounded transition cursor-pointer ${
                          viewportSize === x.id ? "bg-[#eab308] text-black" : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        <x.icon className="size-3.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Browser preview iframe workspace */}
                <div className={`flex-1 flex items-center justify-center p-4 bg-zinc-955 overflow-hidden`}>
                  <div 
                    style={{
                      width: viewportSize === "mobile" ? "375px" : viewportSize === "tablet" ? "768px" : "100%",
                      height: "100%",
                      borderRadius: viewportSize !== "desktop" ? "12px" : "0",
                      boxShadow: viewportSize !== "desktop" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "none"
                    }}
                    className="border border-gray-800 overflow-hidden bg-white relative transition-all duration-350"
                  >
                    <iframe
                      srcDoc={srcDoc}
                      title="Live sandbox compiler result"
                      sandbox="allow-scripts"
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  </div>
                </div>

                {/* Collapsible output developer console */}
                {mode === "frontend" && showConsole && (
                  <div className="h-44 border-t border-gray-850 bg-[#070709] flex flex-col font-mono text-xs text-left">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800 select-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Terminal className="size-3 text-[#eab308]" /> Integrated Console logs
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLogs([])}
                          className="text-[9px] uppercase tracking-wider text-gray-500 hover:text-gray-300"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowConsole(false)}
                          className="text-[9px] uppercase tracking-wider text-gray-500 hover:text-gray-300"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-3 overflow-y-auto space-y-1 bg-black scrollbar-none font-mono">
                      {logs.length === 0 ? (
                        <div className="text-gray-600 text-[10px] italic">No logs capture. Script outputs printed here.</div>
                      ) : (
                        logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`py-0.5 border-b border-gray-900 last:border-b-0 ${
                              log.method === "error" ? "text-red-400" : log.method === "warn" ? "text-amber-400" : "text-[#eab308]"
                            }`}
                          >
                            <span className="text-gray-500 text-[9px] mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                            {log.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* Trigger to show logs if hidden */}
                {mode === "frontend" && !showConsole && (
                  <button
                    onClick={() => setShowConsole(true)}
                    className="py-1 px-3 bg-gray-900 text-gray-500 border-t border-gray-800 text-left text-[10px] font-bold uppercase select-none hover:text-gray-300 transition"
                  >
                    ▲ Open Terminal Console
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VS Code bottom status statusbar */}
      <footer className={`px-4 py-1 border-t text-[10px] font-mono select-none flex items-center justify-between ${
        darkMode ? "bg-[#09090b] border-gray-800 text-gray-500" : "bg-gray-100 border-gray-200 text-gray-600"
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500 font-bold">● Workspace Mounted</span>
          <span>Babel Standalone active</span>
          <span>Modules: {Object.keys(files).length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Active: {activeFile}</span>
          <span>Line count: {(files[activeFile] || "").split("\n").length}</span>
        </div>
      </footer>
    </div>
  );
}
