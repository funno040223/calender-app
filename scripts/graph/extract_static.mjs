// static 由来のノード・エッジを作る（TypeScript コンパイラ API＋SQL の正規表現）。
// 出力：docs/graph/data/static.json
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import ts from "typescript";

const ROOT = process.cwd();
const OUT = "docs/graph/data/static.json";
const SRC_RE = /\.(ts|tsx|mts|mjs|js|css|sql)$/;
const EXTRA = new Set(["package.json", "tsconfig.json", ".env.example"]);
const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)
  .filter((f) => (SRC_RE.test(f) || EXTRA.has(f)) && !f.endsWith("package-lock.json"));

const nodes = new Map(), edges = new Map();
const lineCountOf = (t) => (t.length === 0 ? 0 : t.replace(/\n$/, "").split("\n").length);
const addNode = (n) => { if (!nodes.has(n.id)) nodes.set(n.id, { source: "static", ...n }); return nodes.get(n.id); };
const addEdge = (type, from, to, file, ls, le) => {
  const id = `${type}:${from}->${to}`;
  if (!edges.has(id)) edges.set(id, { id, type, from, to, source: "static", file, line_start: ls, line_end: le });
};
const moduleKind = (f) => {
  if (/\.test\.(ts|tsx)$/.test(f)) return "test";
  if (f.endsWith(".css")) return "css";
  if (f.endsWith(".sql")) return "sql";
  if (f === "public/sw.js") return "worker";
  if (f.startsWith("scripts/")) return "script";
  if (/^src\/app\/.*\/route\.ts$/.test(f)) return "api";
  if (/^src\/app\/.*\/page\.tsx$/.test(f)) return "page";
  if (f.startsWith("src/components/")) return "component";
  if (f.startsWith("src/")) return "lib";
  return "config";
};

// 1) Module
const texts = {};
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  texts[f] = t;
  addNode({ id: `module:${f}`, label: "Module", name: path.basename(f), file: f, line_start: 1, line_end: Math.max(1, lineCountOf(t)), kind: moduleKind(f), loc: lineCountOf(t), external_imports: [] });
}

// 1b) SQL（表・関数）と Route（Next.js のファイル規約）。TS 走査で .from("表") を解決するため先に作る
for (const f of files.filter((x) => x.endsWith(".sql"))) {
  const t = texts[f], mid = `module:${f}`;
  const lineAt = (idx) => t.slice(0, idx).split("\n").length;
  const endAt = (idx) => { const e = t.indexOf(";", idx); return lineAt(e < 0 ? t.length : e); };
  for (const m of t.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    const id = `table:${m[1]}`, ls = lineAt(m.index), le = endAt(m.index);
    addNode({ id, label: "Table", name: m[1], file: f, line_start: ls, line_end: le });
    addEdge("DEFINES", mid, id, f, ls, le);
  }
  for (const m of t.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    const id = `table:${m[1]}`;
    if (nodes.has(id)) addEdge("USES", mid, id, f, lineAt(m.index), endAt(m.index));
  }
  for (const m of t.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    const id = `fn:${f}#${m[1]}`, ls = lineAt(m.index);
    const dollar = t.indexOf("$$", m.index), end2 = dollar >= 0 ? t.indexOf("$$", dollar + 2) : -1;
    const le = lineAt(end2 >= 0 ? end2 : m.index);
    addNode({ id, label: "Function", name: m[1], file: f, line_start: ls, line_end: Math.max(ls, le), exported: true, is_component: false, signature: m[0].slice(0, 160), lang: "sql" });
    addEdge("DEFINES", mid, id, f, ls, Math.max(ls, le));
  }
}
for (const f of files) {
  let m;
  if ((m = f.match(/^src\/app\/(.*)page\.tsx$/))) {
    const p = "/" + m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    const id = `route:page:${p}`, n = nodes.get(`module:${f}`);
    addNode({ id, label: "Route", name: p, file: f, line_start: 1, line_end: n.line_end, route_kind: "page", methods: [] });
    addEdge("DEFINES", `module:${f}`, id, f, 1, n.line_end);
  } else if ((m = f.match(/^src\/app\/(.*)route\.ts$/))) {
    const p = "/" + m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    const id = `route:api:${p}`, n = nodes.get(`module:${f}`);
    const methods = [...texts[f].matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]);
    addNode({ id, label: "Route", name: p, file: f, line_start: 1, line_end: n.line_end, route_kind: "api", methods });
    addEdge("DEFINES", `module:${f}`, id, f, 1, n.line_end);
  }
}

// 2) TypeScript プログラム
const tsFiles = files.filter((f) => /\.(ts|tsx|mts|mjs|js)$/.test(f));
const cfg = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, ROOT);
const program = ts.createProgram(tsFiles.map((f) => path.resolve(ROOT, f)), { ...parsed.options, noEmit: true, allowJs: true, checkJs: false });
const checker = program.getTypeChecker();
const rel = (p) => path.relative(ROOT, p);
const isSrc = (sf) => !sf.isDeclarationFile && files.includes(rel(sf.fileName));
const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
const hasExport = (n) => (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0 || (ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

const declToId = new Map(); // ts.Node(宣言) → ノード id
const topFns = []; // {id, node, sf}
const register = (id, decl) => declToId.set(decl, id);

for (const sf of program.getSourceFiles()) {
  if (!isSrc(sf)) continue;
  const f = rel(sf.fileName), mid = `module:${f}`;
  const isComp = (name) => /^[A-Z]/.test(name) && /\.(tsx|jsx)$/.test(f);
  const addFn = (name, node, declNode, exported, extra = {}) => {
    let id = `fn:${f}#${name}`, k = 2;
    while (nodes.has(id)) id = `fn:${f}#${name}~${k++}`;
    addNode({ id, label: "Function", name, file: f, line_start: lineOf(sf, node.getStart(sf)), line_end: lineOf(sf, node.getEnd()), exported, is_component: isComp(name), signature: (declNode.getText(sf).split("\n")[0] ?? "").slice(0, 160), ...extra });
    register(id, declNode);
    if (declNode !== node) register(id, node);
    addEdge("DEFINES", mid, id, f, nodes.get(id).line_start, nodes.get(id).line_end);
    topFns.push({ id, node, sf });
  };
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) addFn(st.name.text, st, st, hasExport(st));
    else if (ts.isClassDeclaration(st) && st.name) {
      const cid = `type:${f}#${st.name.text}`;
      addNode({ id: cid, label: "Type", name: st.name.text, file: f, line_start: lineOf(sf, st.getStart(sf)), line_end: lineOf(sf, st.getEnd()), exported: hasExport(st), type_kind: "class" });
      register(cid, st); addEdge("DEFINES", mid, cid, f, nodes.get(cid).line_start, nodes.get(cid).line_end);
      for (const m of st.members) if ((ts.isMethodDeclaration(m) || ts.isConstructorDeclaration(m)) && (m.body)) addFn(`${st.name.text}.${m.name ? m.name.getText(sf) : "constructor"}`, m, m, hasExport(st));
    } else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) {
      const id = `type:${f}#${st.name.text}`;
      addNode({ id, label: "Type", name: st.name.text, file: f, line_start: lineOf(sf, st.getStart(sf)), line_end: lineOf(sf, st.getEnd()), exported: hasExport(st), type_kind: ts.isInterfaceDeclaration(st) ? "interface" : ts.isEnumDeclaration(st) ? "enum" : "type" });
      register(id, st); addEdge("DEFINES", mid, id, f, nodes.get(id).line_start, nodes.get(id).line_end);
    } else if (ts.isVariableStatement(st)) {
      const exported = hasExport(st);
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) continue;
        const name = d.name.text;
        let init = d.initializer;
        while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init)) init = init.expression;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) addFn(name, st, d, exported);
        else if (ts.isCallExpression(init) && ["memo", "forwardRef", "useCallback"].includes(init.expression.getText(sf).replace(/^React\./, "")) && init.arguments[0] && (ts.isArrowFunction(init.arguments[0]) || ts.isFunctionExpression(init.arguments[0]))) addFn(name, st, d, exported);
        else if (exported || /^[A-Z][A-Z0-9_]+$/.test(name)) {
          const id = `const:${f}#${name}`;
          addNode({ id, label: "Constant", name, file: f, line_start: lineOf(sf, st.getStart(sf)), line_end: lineOf(sf, st.getEnd()), exported, value_text: d.initializer.getText(sf).replace(/\s+/g, " ").slice(0, 200) });
          register(id, d); addEdge("DEFINES", mid, id, f, nodes.get(id).line_start, nodes.get(id).line_end);
        }
      }
    } else if (ts.isExportAssignment(st) && (ts.isArrowFunction(st.expression) || ts.isFunctionExpression(st.expression))) addFn("default", st, st, true);
    if (ts.isFunctionDeclaration(st) && !st.name && hasExport(st)) addFn("default", st, st, true);
  }
}

// 3) import / 呼び出し / 参照
const resolveDecl = (sym) => {
  if (!sym) return null;
  if (sym.flags & ts.SymbolFlags.Alias) { try { sym = checker.getAliasedSymbol(sym); } catch { return null; } }
  for (const d of sym.declarations ?? []) if (declToId.has(d)) return declToId.get(d);
  return null;
};
const ownerOf = (node) => { // 最上位の関数 id、なければ null（Module に帰属）
  for (let n = node; n; n = n.parent) {
    const id = declToId.get(n);
    if (id && id.startsWith("fn:")) return id;
    if (n.parent && ts.isSourceFile(n.parent)) break;
  }
  return null;
};
for (const sf of program.getSourceFiles()) {
  if (!isSrc(sf)) continue;
  const f = rel(sf.fileName), mid = `module:${f}`;
  const modNode = nodes.get(mid);
  const visit = (node) => {
    // import / export from / dynamic import / require
    let spec = null;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) spec = node.moduleSpecifier.text;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) spec = node.arguments[0].text;
    if (spec) {
      const r = ts.resolveModuleName(spec, sf.fileName, parsed.options, ts.sys).resolvedModule;
      const target = r && !r.isExternalLibraryImport ? rel(r.resolvedFileName) : null;
      if (target && nodes.has(`module:${target}`)) addEdge("IMPORTS", mid, `module:${target}`, f, lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd()));
      else if (!spec.startsWith(".") && !spec.startsWith("@/") && !modNode.external_imports.includes(spec)) modNode.external_imports.push(spec);
    }
    // 呼び出し
    const from = (n) => ownerOf(n) ?? mid;
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression;
      const id = resolveDecl(checker.getSymbolAtLocation(ts.isPropertyAccessExpression(callee) ? callee.name : callee));
      if (id && id.startsWith("fn:") && id !== from(node)) addEdge("CALLS", from(node), id, f, lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd()));
      // .from("table")
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(callee) && callee.name.text === "from" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const tid = `table:${node.arguments[0].text}`;
        if (nodes.has(tid)) addEdge("USES", from(node), tid, f, lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd()));
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const id = resolveDecl(checker.getSymbolAtLocation(node.tagName));
      if (id && id.startsWith("fn:") && id !== from(node)) addEdge("CALLS", from(node), id, f, lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd()));
    }
    // 型・定数の参照
    if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && !ts.isExportSpecifier(node.parent) && !ts.isImportClause(node.parent)) {
      const id = resolveDecl(checker.getSymbolAtLocation(node));
      if (id && (id.startsWith("type:") || id.startsWith("const:"))) {
        const decl = nodes.get(id);
        const inDecl = decl.file === f && lineOf(sf, node.getStart(sf)) >= decl.line_start && lineOf(sf, node.getStart(sf)) <= decl.line_end;
        if (!inDecl && from(node) !== id) addEdge("USES", from(node), id, f, lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd()));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}


// 出力
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = { generated: new Date().toISOString(), nodes: [...nodes.values()], edges: [...edges.values()] };
fs.writeFileSync(OUT, JSON.stringify(out));
const cnt = (arr, k) => arr.reduce((a, x) => ((a[x[k]] = (a[x[k]] ?? 0) + 1), a), {});
console.log("nodes", out.nodes.length, cnt(out.nodes, "label"));
console.log("edges", out.edges.length, cnt(out.edges, "type"));
