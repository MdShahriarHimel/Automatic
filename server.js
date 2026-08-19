import express from "express";
import fs from "fs";
import path from "path";
import os from "os";

const CWD = process.cwd();

function loadConfig() {
  const cfg = {
    name: "Assistant",
    port: 3000,
    orbs: [
      { title: "Notes", path: "sample-notes", kind: "notes" },
      { title: "Props", path: "media", kind: "media" },
    ],
  };

  try {
    const raw = fs.readFileSync(path.join(CWD, "barehands.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.name) cfg.name = parsed.name;
    if (parsed.port) cfg.port = parsed.port;
    if (Array.isArray(parsed.orbs) && parsed.orbs.length > 0) {
      cfg.orbs = parsed.orbs;
    }
  } catch {
    // Keep default config
  }

  for (const orb of cfg.orbs) {
    if (orb.path && orb.path.startsWith("~")) {
      orb.path = path.join(os.homedir(), orb.path.slice(1));
    }
  }

  return cfg;
}

const CONFIG = loadConfig();

function orbRoot(idx) {
  try {
    const orb = CONFIG.orbs[Number(idx)];
    if (!orb || orb.kind !== "notes") return null;
    const p = path.isAbsolute(orb.path)
      ? path.resolve(orb.path)
      : path.resolve(CWD, orb.path);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

let _STATE = "{}";
const _CMDS = [];
const _ALLOWED = new Set([
  "add_img",
  "add_card",
  "clear",
  "reset",
  "hand",
  "give",
  "yank",
  "hover",
  "scroll_note",
  "widget",
  "explode",
  "assemble",
  "present",
]);

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: ["text/*", "application/json"], limit: "1mb" }));

// Disable caching for stage.html and serve root
app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(CWD, "stage.html"));
});

app.get("/stage.html", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(CWD, "stage.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /config - ring name + orb configuration
app.get("/config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    name: CONFIG.name || "Assistant",
    orbs: CONFIG.orbs.map((o) => ({
      title: o.title || "?",
      kind: o.kind || "notes",
    })),
  });
});

// POST /state - tracker heartbeat + returns queued commands
app.post("/state", (req, res) => {
  if (typeof req.body === "string") {
    _STATE = req.body;
  } else if (req.body && typeof req.body === "object") {
    _STATE = JSON.stringify(req.body);
  }

  const out = _CMDS.splice(0, 8);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.json(out);
});

// GET /state - render mirror gets scene state
app.get("/state", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.send(_STATE);
});

// Helper for finding files recursively
function getAllFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (item.name.startsWith(".")) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(getAllFiles(fullPath));
      } else if (item.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return results;
}

// POST /cmd - board commands
app.post("/cmd", (req, res) => {
  try {
    let cmd = req.body;
    if (typeof cmd === "string") {
      cmd = JSON.parse(cmd);
    }
    if (!cmd || typeof cmd !== "object" || !_ALLOWED.has(cmd.a)) {
      return res.status(400).end();
    }

    if (["add_img", "hand", "give", "present"].includes(cmd.a) && cmd.src) {
      let rel = String(cmd.src).replace(/^\/+/, "");
      if (rel.startsWith("media/")) {
        rel = rel.slice(6);
      }
      const mediaRoot = path.resolve(CWD, "media");
      let target = path.resolve(mediaRoot, rel);

      const isInside =
        target.startsWith(mediaRoot + path.sep) || target === mediaRoot;
      const fileExists = isInside && fs.existsSync(target) && fs.statSync(target).isFile();

      if (!fileExists) {
        const baseName = path.basename(rel).toLowerCase();
        const allMedia = getAllFiles(mediaRoot);
        const hits = allMedia.filter(
          (p) => path.basename(p).toLowerCase() === baseName
        );
        if (hits.length !== 1) {
          return res.status(400).end();
        }
        target = hits[0];
      }

      const normalizedRel = path
        .relative(mediaRoot, target)
        .split(path.sep)
        .join("/");
      cmd.src = "/media/" + normalizedRel;
    }

    _CMDS.push(cmd);
    return res.status(204).end();
  } catch {
    return res.status(400).end();
  }
});

function walkTree(d, root, orbIdx) {
  const out = { name: path.basename(d), notes: [], dirs: [] };
  const entries = fs.readdirSync(d, { withFileTypes: true });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) {
      const sub = walkTree(full, root, orbIdx);
      if (sub.notes.length > 0 || sub.dirs.length > 0) {
        out.dirs.push(sub);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "CLAUDE.md") {
      const relPath = path.relative(root, full).split(path.sep).join("/");
      out.notes.push({
        title: path.parse(entry.name).name,
        file: `${orbIdx}/${relPath}`,
      });
    }
  }

  return out;
}

// GET /tree?orb=N - notes folder tree
app.get("/tree", (req, res) => {
  const orbIdx = parseInt(String(req.query.orb || "0"), 10);
  const root = orbRoot(orbIdx);
  if (!root) {
    return res.status(404).json({ name: "?", notes: [], dirs: [] });
  }

  try {
    const tree = walkTree(root, root, orbIdx);
    tree.name = CONFIG.orbs[orbIdx]?.title || tree.name;
    return res.json(tree);
  } catch {
    return res.status(500).json({ name: "?", notes: [], dirs: [] });
  }
});

const PROP_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".webm",
  ".glb",
  ".gltf",
]);

function walkProps(d, mediaRoot) {
  const out = { name: path.basename(d), items: [], dirs: [] };
  const entries = fs.readdirSync(d, { withFileTypes: true });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) {
      const sub = walkProps(full, mediaRoot);
      if (sub.items.length > 0 || sub.dirs.length > 0) {
        out.dirs.push(sub);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (PROP_EXTS.has(ext)) {
        const rel = path.relative(mediaRoot, full).split(path.sep).join("/");
        out.items.push(rel);
      }
    }
  }

  return out;
}

// GET /props - media airlock browsable tree
app.get("/props", (_req, res) => {
  const mediaRoot = path.resolve(CWD, "media");
  if (!fs.existsSync(mediaRoot)) {
    return res.json({ name: "Props", items: [], dirs: [] });
  }

  try {
    const tree = walkProps(mediaRoot, mediaRoot);
    tree.name = "Props";
    return res.json(tree);
  } catch {
    return res.status(500).json({ name: "Props", items: [], dirs: [] });
  }
});

// GET /orb - assistant live state
app.get("/orb", (_req, res) => {
  const stateDir = path.join(CWD, "state");
  const out = {
    state: "idle",
    mood: "green",
    wave: null,
  };

  try {
    const s = fs
      .readFileSync(path.join(stateDir, "state"), "utf-8")
      .trim()
      .toLowerCase();
    if (["idle", "listening", "thinking", "speaking"].includes(s)) {
      out.state = s;
    }
  } catch {
    // soft fail
  }

  const nowSec = Date.now() / 1000;

  try {
    const m = JSON.parse(
      fs.readFileSync(path.join(stateDir, "mood.json"), "utf-8")
    );
    if (nowSec - Number(m?.ts || 0) < 45.0) {
      out.mood = m.mood || "green";
    }
  } catch {
    // soft fail
  }

  if (out.state === "speaking") {
    try {
      const w = JSON.parse(
        fs.readFileSync(path.join(stateDir, "wave.json"), "utf-8")
      );
      if (nowSec - Number(w?.ts || 0) < 0.6 && Array.isArray(w?.samples)) {
        out.wave = w.samples.slice(0, 64);
      }
    } catch {
      // soft fail
    }
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json(out);
});

// GET /note?f=N/<rel> - note text
app.get("/note", (req, res) => {
  const relQuery = String(req.query.f || "");
  const firstSlash = relQuery.indexOf("/");
  if (firstSlash === -1) {
    return res.status(404).end();
  }

  const orbIdx = relQuery.slice(0, firstSlash);
  const relPath = relQuery.slice(firstSlash + 1);

  const root = orbRoot(orbIdx);
  if (!root) {
    return res.status(404).end();
  }

  const target = path.resolve(root, relPath);
  const isInside = target.startsWith(root + path.sep) || target === root;
  if (!isInside || !target.endsWith(".md") || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return res.status(404).end();
  }

  try {
    const content = fs.readFileSync(target, "utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(content);
  } catch {
    return res.status(404).end();
  }
});

// Static assets serving
app.use("/media", express.static(path.join(CWD, "media")));
app.use("/sample-notes", express.static(path.join(CWD, "sample-notes")));
app.use(express.static(CWD));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`barehands server running on http://0.0.0.0:${PORT}`);
});
