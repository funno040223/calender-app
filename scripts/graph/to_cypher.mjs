// graph.json → Neo4j に入れる Cypher（docs/graph/data/import.cypher）。Neo4j が使える環境で cypher-shell から実行する。
import fs from "node:fs";
const g = JSON.parse(fs.readFileSync("docs/graph/data/graph.json", "utf8"));
const q = (v) => JSON.stringify(v);
const props = (o, skip) => Object.entries(o).filter(([k, v]) => !skip.includes(k) && v !== undefined && !(typeof v === "object" && v !== null && !Array.isArray(v)) && !(Array.isArray(v) && v.some((x) => typeof x === "object"))).map(([k, v]) => `${k}: ${q(v)}`).join(", ");
let out = "// 自動生成：scripts/graph/to_cypher.mjs\nCREATE CONSTRAINT node_id IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE;\n";
for (const n of g.nodes) out += `CREATE (:Node:${n.label} {${props(n, ["label"])}});\n`;
for (const e of g.edges) out += `MATCH (a:Node {id:${q(e.from)}}), (b:Node {id:${q(e.to)}}) CREATE (a)-[:${e.type} {${props(e, ["type", "from", "to"])}}]->(b);\n`;
fs.writeFileSync("docs/graph/data/import.cypher", out);
console.log("import.cypher", out.split("\n").length, "行");
