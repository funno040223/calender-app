// アプリのアイコン（PNG）を作る。形を変えたら `node scripts/make-icons.mjs` で作り直す
import sharp from "sharp";

// 1024 四方。中身は中央 70% に収める（Android の丸や角丸で切られないように）
// 墨色の地に、朝ルーティン（水色）・タスク（紫）・習慣（緑）の予定が並び、「いま」の赤い線が横切る（今日の流れとカレンダーの見た目）
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26262a"/><stop offset="1" stop-color="#141416"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect x="222" y="250" width="330" height="116" rx="34" fill="#30b0c7"/>
  <rect x="332" y="420" width="470" height="184" rx="44" fill="#af52de"/>
  <rect x="222" y="658" width="260" height="116" rx="34" fill="#34c759"/>
  <rect x="222" y="502" width="600" height="20" rx="10" fill="#ff3b30"/>
  <circle cx="222" cy="512" r="36" fill="#ff3b30"/>
</svg>`;

const out = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon.png", 64],
];
for (const [file, size] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log(file, size);
}
