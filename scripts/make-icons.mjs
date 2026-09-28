// アプリのアイコン（PNG）を作る。形を変えたら `node scripts/make-icons.mjs` で作り直す
import sharp from "sharp";

// 1024 四方。中身は中央 70% に収める（Android の丸や角丸で切られないように）
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#ff3b30"/>
  <rect x="232" y="262" width="560" height="530" rx="72" fill="#ffffff"/>
  <path d="M232 334a72 72 0 0 1 72-72h416a72 72 0 0 1 72 72v70H232z" fill="#ffd9d6"/>
  <rect x="352" y="212" width="44" height="110" rx="22" fill="#ffffff"/>
  <rect x="628" y="212" width="44" height="110" rx="22" fill="#ffffff"/>
  <path d="M292 600 C352 600 362 500 422 500 S492 680 552 680 S622 540 682 540 L732 540"
        fill="none" stroke="#ff3b30" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
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
