import { MEAL_SLOTS, quantityKey, type LifeProjection, type MealSlot, type Presence, type Quantity, type Recipe } from "./model";

/*
 * 料理のカタログ（2026-11-21 作り直し）
 * 一人暮らし・炊飯器なし（パックご飯）・冷凍のひき肉と豚バラ・カット野菜を軸にした 1人分のレシピと、実際の買い物の単位に合わせた定番の買い物。
 * - いつもある物（STAPLE）：調味料は量を数えず、「切れた」にしない限りある扱い（kind "pantry"）。
 *   パックご飯・冷凍の肉・パスタは、買った・数えた記録があれば数を使い、なければある扱い（kind "stock"）。
 * - 前のカタログのレシピ（LEGACY_RECIPES）は候補・一覧に出さないが、ID から引けるように残す（過去の予定・記録の表示のため）。
 */

type Kind = "pantry" | "stock";
interface Ingredient {
  name: string;
  /** レシピで使う単位（在庫の単位） */
  unit: string;
  /** 切れたとき・定番で買う量 */
  buy: number;
  /** 買う単位がレシピの単位と違うとき（調味料：本・袋など） */
  buyUnit?: string;
  /** 予定の食事に足りない分を買うときの刻み（パック単位に切り上げる） */
  step?: number;
  kind?: Kind;
  /** いつもある物（stock）が「切れた」とみなす量（1食ぶん） */
  serving?: number;
  /** 傷みやすい物（家にあれば先に使う候補にする） */
  fresh?: boolean;
}

const INGREDIENTS: Record<string, Ingredient> = {
  // いつもある（数える）
  "pack-rice": { name: "パックご飯", unit: "パック", buy: 10, step: 1, kind: "stock", serving: 1 },
  "ground-meat-frozen": { name: "ひき肉（冷凍）", unit: "g", buy: 300, step: 300, kind: "stock", serving: 50 },
  "pork-belly-frozen": { name: "豚バラ肉（冷凍）", unit: "g", buy: 300, step: 300, kind: "stock", serving: 60 },
  "dry-pasta": { name: "パスタ（乾麺）", unit: "g", buy: 500, step: 500, kind: "stock", serving: 100 },
  // いつもある（調味料。量は数えない）
  "soy-sauce": { name: "しょうゆ", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  mirin: { name: "みりん", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  sake: { name: "酒", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  sugar: { name: "砂糖", unit: "小さじ", buy: 1, buyUnit: "袋", kind: "pantry" },
  "salt-pepper": { name: "塩こしょう", unit: "少々", buy: 1, buyUnit: "本", kind: "pantry" },
  oil: { name: "油", unit: "小さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  "sesame-oil": { name: "ごま油", unit: "小さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  "chicken-stock": { name: "鶏ガラスープの素", unit: "小さじ", buy: 1, buyUnit: "個", kind: "pantry" },
  "noodle-base": { name: "めんつゆ（3倍濃縮）", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  "potato-starch": { name: "片栗粉", unit: "小さじ", buy: 1, buyUnit: "袋", kind: "pantry" },
  "ginger-tube": { name: "しょうが（チューブ）", unit: "cm", buy: 1, buyUnit: "本", kind: "pantry" },
  "garlic-tube": { name: "にんにく（チューブ）", unit: "cm", buy: 1, buyUnit: "本", kind: "pantry" },
  ketchup: { name: "ケチャップ", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  doubanjiang: { name: "豆板醤", unit: "小さじ", buy: 1, buyUnit: "個", kind: "pantry" },
  miso: { name: "みそ", unit: "大さじ", buy: 1, buyUnit: "個", kind: "pantry" },
  "granulated-consomme": { name: "顆粒コンソメ", unit: "小さじ", buy: 1, buyUnit: "個", kind: "pantry" },
  "oyster-sauce": { name: "オイスターソース", unit: "小さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  ponzu: { name: "ポン酢", unit: "大さじ", buy: 1, buyUnit: "本", kind: "pantry" },
  cocoa: { name: "ココア（粉）", unit: "大さじ", buy: 1, buyUnit: "袋", kind: "pantry" },
  // ふだん買い足す物
  egg: { name: "卵", unit: "個", buy: 10, step: 10 },
  "veg-pack": { name: "カット野菜（野菜炒め用）", unit: "袋", buy: 3, step: 1, fresh: true },
  onion: { name: "玉ねぎ", unit: "個", buy: 3, step: 1 },
  potato: { name: "じゃがいも", unit: "個", buy: 3, step: 1 },
  "tofu-pack": { name: "豆腐（150g）", unit: "個", buy: 3, step: 1, fresh: true },
  "chicken-thigh": { name: "鶏もも肉", unit: "g", buy: 300, step: 300, fresh: true },
  kanikama: { name: "カニカマ", unit: "パック", buy: 1, step: 1, fresh: true },
  "tuna-can": { name: "ツナ缶", unit: "缶", buy: 2, step: 1 },
  "tomato-can": { name: "カットトマト缶", unit: "缶", buy: 1, step: 1 },
  shimeji: { name: "しめじ", unit: "パック", buy: 1, step: 1, fresh: true },
  "frozen-udon": { name: "冷凍うどん", unit: "玉", buy: 5, step: 5 },
  milk: { name: "牛乳", unit: "mL", buy: 1000, step: 1000, fresh: true },
  bread: { name: "食パン", unit: "枚", buy: 6, step: 6 },
  banana: { name: "バナナ", unit: "本", buy: 4, step: 1 },
  yogurt: { name: "プレーンヨーグルト", unit: "g", buy: 400, step: 400, fresh: true },
  "slice-cheese": { name: "スライスチーズ", unit: "枚", buy: 7, step: 7 },
};

const ing = (ingredientId: string, amount: number): Quantity => {
  const { name, unit } = INGREDIENTS[ingredientId];
  return { ingredientId, name, amount, unit };
};
/** 買う量（定番・切れた物）。調味料は「1本」など買う単位で */
function buyOf(ingredientId: string, amount?: number): Quantity {
  const info = INGREDIENTS[ingredientId];
  return { ingredientId, name: info.name, amount: amount ?? info.buy, unit: info.buyUnit ?? info.unit };
}

export const isPantryStaple = (ingredientId: string) => INGREDIENTS[ingredientId]?.kind === "pantry";
export const isStaple = (ingredientId: string) => INGREDIENTS[ingredientId]?.kind !== undefined;
/** 「豚バラ肉（冷凍）」→「豚バラ肉」 */
export const shortName = (name: string) => name.replace(/（.*?）/g, "");

const FRACTIONS: [number, string][] = [[0.25, "1/4"], [0.5, "1/2"], [0.75, "3/4"], [1.5, "1と1/2"]];
/** 量の見せ方：大さじ1/2、1/2個、100g、少々 */
export function amountText({ amount, unit }: Pick<Quantity, "amount" | "unit">): string {
  if (unit === "少々") return "少々";
  const n = FRACTIONS.find(([v]) => Math.abs(v - amount) < 1e-6)?.[1] ?? String(Math.round(amount * 100) / 100);
  return unit === "大さじ" || unit === "小さじ" ? unit + n : n + unit;
}

const SLOT_TAG = { breakfast: "朝食", lunch: "昼食", dinner: "夕食" } as const;
function recipe(
  id: string, name: string, slots: MealSlot[], minutes: number, ingredients: Quantity[],
  tools: string[], steps: string[], source?: string,
): Recipe {
  const ids = new Set(ingredients.map((q) => q.ingredientId));
  const base = ids.has("dry-pasta") ? "パスタ" : ids.has("frozen-udon") ? "うどん" : ids.has("pack-rice") ? "ご飯" : undefined;
  return { id, name, slots, minutes, ingredients, servings: 1, tools, steps, source,
    tags: [...slots.map((slot) => SLOT_TAG[slot]), ...(base ? [base] : []), ...tools, minutes + "分"] };
}

const LD: MealSlot[] = ["lunch", "dinner"];
const rice = ing("pack-rice", 1);
const pork = (g: number) => ing("pork-belly-frozen", g);
const mince = (g: number) => ing("ground-meat-frozen", g);
const pasta = ing("dry-pasta", 100);
const udon = ing("frozen-udon", 1);
const veg = (bags = 1) => ing("veg-pack", bags);
const egg = (n = 1) => ing("egg", n);
const onion = (n = 0.5) => ing("onion", n);
const soy = (tbsp: number) => ing("soy-sauce", tbsp);
const tsp = (id: string, n: number) => ing(id, n);
const pinch = ing("salt-pepper", 1);

export const BREAKFAST_RECIPES = [
  recipe("toast", "トースト", ["breakfast"], 5,
    [{ ingredientId: "bread", name: "食パン", amount: 1, unit: "枚" }, { ingredientId: "slice-cheese", name: "スライスチーズ", amount: 1, unit: "枚" },
      { ingredientId: "milk", name: "牛乳", amount: 200, unit: "mL" }],
    ["トースター"], ["パンにチーズをのせて焼き、牛乳を添える。"]),
  recipe("banana-yogurt", "バナナ＋ヨーグルト", ["breakfast"], 2,
    [{ ingredientId: "banana", name: "バナナ", amount: 1, unit: "本" }, { ingredientId: "yogurt", name: "プレーンヨーグルト", amount: 150, unit: "g" }],
    ["火を使わない"], ["ヨーグルトにひと口大のバナナを合わせる。"]),
  recipe("tkg", "卵かけご飯", ["breakfast"], 3, [rice, egg(), soy(0.5)],
    ["電子レンジ"], ["パックご飯をレンジで温める。", "卵をのせ、しょうゆをかける。"]),
  recipe("cocoa-banana", "ホットココア＋バナナ", ["breakfast"], 3,
    [ing("milk", 200), ing("cocoa", 2), ing("banana", 1)],
    ["電子レンジ"], ["マグにココアと牛乳少しを入れて練り、残りの牛乳を足す。", "レンジで1分半ほど温めて混ぜる。バナナを添える。"]),
  recipe("banana-shake", "バナナシェイク", ["breakfast"], 3,
    [ing("banana", 1), ing("milk", 200), tsp("sugar", 1)],
    ["ミキサー"], ["バナナ・牛乳・砂糖をミキサーにかける。", "ミキサーがなければ、バナナをフォークでよくつぶして牛乳と混ぜる。"]),
];

export const RECIPES = [
  ...BREAKFAST_RECIPES,
  // 豚バラ
  recipe("pork-veg-stirfry", "肉野菜炒め（豚バラ）", LD, 10,
    [pork(100), veg(), tsp("chicken-stock", 0.5), soy(0.5), pinch, tsp("oil", 1), rice],
    ["フライパン"], ["ご飯をレンジで温める。", "豚バラを炒め、色が変わったらカット野菜を入れて強火で2〜3分炒める。", "鶏ガラ・しょうゆ・塩こしょうで味をつける。"]),
  recipe("hoikoro", "ホイコーロー", LD, 12,
    [pork(100), veg(), ing("miso", 0.5), tsp("sugar", 1), tsp("doubanjiang", 0.5), soy(0.5), ing("garlic-tube", 1), tsp("oil", 1), rice],
    ["フライパン"], ["みそ・砂糖・しょうゆ・豆板醤・にんにくを混ぜておく。", "豚バラを炒め、カット野菜（キャベツ入り）を加えて炒める。", "合わせた調味料を入れて全体にからめる。"]),
  recipe("pork-ginger-yaki", "豚バラの生姜焼き", LD, 12,
    [pork(100), onion(), ing("ginger-tube", 2), soy(1), ing("mirin", 1), rice],
    ["フライパン"], ["玉ねぎを薄切りにする。", "豚バラと玉ねぎを炒める。", "しょうゆ・みりん・しょうがを入れ、汁気が少なくなるまでからめる。"]),
  recipe("pork-veg-steam", "豚バラと野菜のレンジ蒸し", LD, 8,
    [veg(), pork(100), ing("ponzu", 1.5), rice],
    ["電子レンジ"], ["耐熱皿にカット野菜を広げ、豚バラを重ならないようにのせる。", "ふんわりラップをして600Wで4〜5分、肉の色が変わるまで加熱する。", "ポン酢をかける。"]),
  recipe("pork-egg-don", "豚バラの卵とじ丼", LD, 12,
    [pork(100), onion(), egg(2), ing("noodle-base", 1.5), rice],
    ["フライパン"], ["小さめのフライパンにめんつゆと水大さじ4、薄切りの玉ねぎを入れて2分煮る。", "豚バラを入れ、色が変わるまで煮る。", "溶き卵を回し入れ、半熟でご飯にのせる。"]),
  recipe("pork-don", "豚バラの甘辛丼", LD, 10,
    [pork(100), soy(1), ing("mirin", 1), tsp("sugar", 1), rice],
    ["フライパン"], ["豚バラを焼く。玉ねぎがあれば一緒に。", "しょうゆ・みりん・砂糖を入れて煮からめ、ご飯にのせる。"]),
  recipe("sukiyaki-pork", "すき焼き風煮（豚バラ）", ["dinner"], 15,
    [pork(100), ing("tofu-pack", 1), onion(), egg(), soy(1.5), ing("sugar", 3), ing("mirin", 1), rice],
    ["フライパン"], ["小さめのフライパンでしょうゆ・砂糖・みりん・水大さじ3を煮立てる。", "玉ねぎ・豆腐・豚バラを入れ、肉に火が通るまで5分ほど煮る。", "溶き卵につけて食べる。"]),
  recipe("nikujaga", "レンジ肉じゃが", ["dinner"], 20,
    [pork(80), ing("potato", 2), onion(), ing("noodle-base", 2), tsp("sugar", 1), rice],
    ["電子レンジ"], ["じゃがいもはひと口大、玉ねぎはくし切りにする。", "耐熱容器に野菜・豚バラ・めんつゆ・水大さじ4・砂糖を入れ、ふんわりラップで600W 8分。", "混ぜて、じゃがいもに竹串が通るまで2〜3分足す。"]),
  // ひき肉
  recipe("mince-veg-stirfry", "ひき肉の野菜炒め", LD, 10,
    [mince(100), veg(), tsp("oyster-sauce", 1.5), soy(0.5), ing("garlic-tube", 1), tsp("oil", 1), rice],
    ["フライパン"], ["ひき肉とにんにくを炒め、ほぐれたらカット野菜を加えて強火で炒める。", "オイスターソースとしょうゆで味をつける。"]),
  recipe("soboro-don", "レンジそぼろ丼", LD, 8,
    [mince(100), egg(), soy(1), tsp("sugar", 2), ing("ginger-tube", 1), rice],
    ["電子レンジ"], ["耐熱容器にひき肉・しょうゆ・砂糖・しょうがを混ぜ、ラップをして600Wで2分。ほぐしてさらに1分、中まで火を通す。",
      "別の容器で溶き卵を40秒ずつ加熱して混ぜ、いり卵にする。", "ご飯にのせる。"]),
  recipe("niku-miso-don", "肉みそ丼", LD, 8,
    [mince(100), ing("miso", 1), tsp("sugar", 2), ing("ginger-tube", 1), rice],
    ["電子レンジ"], ["耐熱容器にひき肉・みそ・砂糖・しょうがを混ぜる。カット野菜があれば一緒に。",
      "ラップをして600Wで2分、ほぐしてさらに1〜2分、中まで火を通す。", "ご飯にのせる。"]),
  recipe("gapao", "ガパオ風ひき肉ご飯", LD, 12,
    [mince(100), onion(), egg(), tsp("oyster-sauce", 2), soy(0.5), tsp("sugar", 0.5), ing("garlic-tube", 1), tsp("oil", 2), rice],
    ["フライパン"], ["目玉焼きを焼いて取り出す。", "同じフライパンでにんにく・ひき肉・刻んだ玉ねぎを炒める。", "オイスターソース・しょうゆ・砂糖で味をつけ、ご飯に盛って目玉焼きをのせる。"]),
  recipe("mapo-tofu", "麻婆豆腐", LD, 15,
    [mince(80), ing("tofu-pack", 1), tsp("doubanjiang", 0.5), tsp("miso", 1), tsp("soy-sauce", 1), tsp("chicken-stock", 0.5),
      tsp("potato-starch", 1), ing("garlic-tube", 1), ing("ginger-tube", 1), tsp("sesame-oil", 1), rice],
    ["フライパン"], ["豆腐を2cm角に切る。", "ごま油でひき肉・にんにく・しょうが・豆板醤を炒める。", "水100mL・鶏ガラ・みそ・しょうゆを入れて煮立て、豆腐を入れて2分煮る。", "水で溶いた片栗粉でとろみをつける。"]),
  recipe("mince-fried-rice", "ひき肉チャーハン", LD, 10,
    [rice, egg(), mince(50), tsp("chicken-stock", 0.5), tsp("soy-sauce", 0.5), pinch, tsp("oil", 2)],
    ["フライパン"], ["パックご飯をレンジで温めておく。", "ひき肉を炒め、溶き卵を入れてすぐご飯を加え、ほぐしながら炒める。", "鶏ガラ・塩こしょうで味をつけ、しょうゆを鍋肌から回す。"]),
  // 鶏・卵・カニカマ
  recipe("oyakodon", "親子丼", LD, 15,
    [ing("chicken-thigh", 100), onion(), egg(2), ing("noodle-base", 1.5), rice],
    ["フライパン"], ["鶏肉はひと口大、玉ねぎは薄切りにする。", "小さめのフライパンにめんつゆと水大さじ4、玉ねぎと鶏肉を入れ、ふたをして5〜6分煮る。", "溶き卵を回し入れ、半熟でご飯にのせる。"]),
  recipe("kanikama-fried-rice", "カニカマチャーハン", LD, 10,
    [rice, egg(), ing("kanikama", 0.5), tsp("chicken-stock", 0.5), pinch, tsp("oil", 2)],
    ["フライパン"], ["パックご飯をレンジで温め、カニカマをほぐす。", "溶き卵を入れてすぐご飯を加え、ほぐしながら炒める。", "カニカマを入れ、鶏ガラ・塩こしょうで味をつける。"]),
  recipe("kanikama-tenshin", "カニカマ天津飯（レンジ）", LD, 10,
    [egg(2), ing("kanikama", 0.5), rice, tsp("chicken-stock", 0.5), tsp("soy-sauce", 1), tsp("sugar", 1), tsp("potato-starch", 1)],
    ["電子レンジ"], ["耐熱皿に溶き卵とほぐしたカニカマを入れ、600Wで1分。混ぜてさらに30秒〜1分。", "温めたご飯にのせる。",
      "別の容器で水大さじ4・鶏ガラ・しょうゆ・砂糖・片栗粉を混ぜ、40秒加熱して混ぜる。とろみがついたらかける。"]),
  // パスタ
  recipe("meat-sauce-pasta", "ミートソースパスタ", LD, 20,
    [pasta, mince(100), onion(), ing("tomato-can", 0.5), ing("ketchup", 1), tsp("granulated-consomme", 0.5), ing("garlic-tube", 1), tsp("oil", 1)],
    ["鍋", "フライパン"], ["湯を沸かし、パスタを袋の表示どおりゆでる。", "玉ねぎをみじん切りにし、にんにく・ひき肉と炒める。", "トマト缶・ケチャップ・コンソメを入れて5分ほど煮詰め、パスタにかける。"]),
  recipe("pork-veg-peperoncino", "豚バラと野菜のペペロンチーノ", LD, 15,
    [pasta, pork(60), veg(), ing("garlic-tube", 2), tsp("chicken-stock", 0.5), tsp("oil", 3), pinch],
    ["鍋", "フライパン"], ["パスタを表示より1分短くゆでる。", "油とにんにくで豚バラを炒め、カット野菜を加えて炒める。", "パスタとゆで汁大さじ3・鶏ガラを入れて混ぜ、塩こしょうで整える。"]),
  recipe("tuna-shimeji-pasta", "ツナとしめじの和風パスタ", LD, 12,
    [pasta, ing("tuna-can", 1), ing("shimeji", 0.5), ing("noodle-base", 1.5), tsp("oil", 1)],
    ["鍋"], ["パスタをゆで、残り3分でほぐしたしめじを同じ鍋に入れる。", "湯を切り、ツナ（油ごと）・めんつゆ・油を混ぜる。"]),
  recipe("kanikama-carbonara", "カニカマのカルボナーラ風", LD, 12,
    [pasta, egg(), ing("milk", 50), ing("kanikama", 0.5), tsp("granulated-consomme", 0.5), pinch],
    ["鍋"], ["器に卵・牛乳・コンソメを混ぜ、ほぐしたカニカマを入れておく。", "ゆでたパスタを熱いうちに器に入れて手早く混ぜる。とろみが足りなければレンジで10秒ずつ温める。", "塩こしょうで整える。"]),
  // うどん
  recipe("pork-veg-udon", "豚バラ野菜うどん", LD, 10,
    [udon, pork(60), veg(0.5), ing("noodle-base", 3)],
    ["鍋"], ["鍋に水300mLとめんつゆを煮立て、豚バラとカット野菜を入れて3分煮る。", "冷凍うどんを入れ、表示の時間煮る。"]),
  recipe("yaki-udon", "焼きうどん", LD, 10,
    [udon, pork(60), veg(), ing("noodle-base", 1.5), tsp("oil", 1)],
    ["電子レンジ", "フライパン"], ["冷凍うどんをレンジで表示どおり温める。", "豚バラとカット野菜を炒め、うどんとめんつゆを入れて炒め合わせる。"]),
  recipe("kamatama-udon", "釜玉うどん", LD, 5,
    [udon, egg(), ing("noodle-base", 1)],
    ["電子レンジ"], ["冷凍うどんをレンジで表示どおり温める。", "器で卵・めんつゆと手早く混ぜる。"]),
];

/*
 * 前のカタログ（2026-11-21 まで）。候補・一覧には出さないが、過去の予定・記録・ユーザーの直しが ID で引けるように残す。
 */
const old = (ingredientId: string, name: string, amount: number, unit: string): Quantity => ({ ingredientId, name, amount, unit });
const oldRice = (amount: number) => old("cooked-rice", "ご飯（炊飯済み）", amount, "g");
const oldTofu = (amount: number) => old("silken-tofu", "絹豆腐", amount, "g");
const oldCheese = (amount: number) => old("pizza-cheese", "ピザ用チーズ", amount, "g");
const oldSoy = (amount: number) => old("soy-sauce", "しょうゆ", amount, "mL");
const oldMayo = (amount: number) => old("mayo", "マヨネーズ", amount, "mL");
const oldOnion = (amount: number) => old("onion", "玉ねぎ", amount, "個");
const oldShimeji = (amount: number) => old("shimeji", "しめじ", amount, "g");
const oldTomato = (amount: number) => old("tomato-can", "カットトマト缶", amount, "g");
const oldSoup = (amount: number) => old("noodle-base", "めんつゆ（3倍濃縮）", amount, "mL");
const oldFlour = (amount: number) => old("flour", "薄力粉", amount, "mL");
const oldSake = (amount: number) => old("sake", "酒", amount, "mL");
const oldSugar = (amount: number) => old("sugar", "砂糖", amount, "mL");
const oldOil = (amount: number) => old("oil", "油", amount, "mL");
const ajinomoto = (id: number) => "https://park.ajinomoto.co.jp/recipe/card/" + id + "/";
const delish = (id: string) => "https://delishkitchen.tv/recipes/" + id;

export const LEGACY_RECIPES = [
  recipe("onigiri-egg", "おにぎり＋卵", ["breakfast"], 5,
    [oldRice(100), old("boiled-egg", "ゆで卵", 1, "個")], ["火を使わない"], ["炊飯済みのご飯でおにぎりを作り、ゆで卵を添える。"]),
  recipe("tofu-chili-bowl", "豆腐のねぎだれラー油丼", ["lunch"], 5,
    [oldRice(200), oldTofu(150), old("chili-oil", "食べるラー油", 15, "g"), old("nori", "刻みのり", 3, "g"), old("scallion", "細ねぎ", 15, "mL"), oldSoup(7.5)],
    ["電子レンジ"], ["耐熱容器で豆腐を温める。ご飯に移し、たれと薬味を添える。辛味は好みで調整。"], delish("267626750568038806")),
  recipe("tofu-herb-bowl", "豆腐と薬味の混ぜ丼", ["lunch"], 5,
    [oldRice(200), oldTofu(150), old("myoga", "みょうが", 1, "本"), old("takuan", "たくあん", 3, "cm"), oldSoy(15),
      old("sesame", "白ごま", 5, "mL"), old("sesame-oil", "ごま油", 5, "mL")],
    ["火を使わない"], ["薬味とたくあんを細かく切る。ご飯の上で豆腐と調味料を合わせる。"], delish("163395251153666540")),
  recipe("mackerel-egg-bowl", "さば缶の温玉丼", ["lunch"], 10,
    [oldRice(200), old("stirfry-vegetables", "五目カット野菜", 65, "g"), old("soy-mackerel", "さばしょうゆ煮", 75, "g"),
      old("onsen-egg", "温泉卵", 1, "個"), old("seasoning-paste", "香味ペースト", 4, "g")],
    ["電子レンジ"], ["耐熱容器で野菜とさばを加熱する。温かいご飯に移し、温泉卵をのせる。"], ajinomoto(708122)),
  recipe("tuna-mushroom-toast", "ツナしめじチーズトースト", ["lunch"], 12,
    [old("baguette", "フランスパン", 2, "枚"), old("water-tuna", "ツナ水煮", 40, "g"), oldShimeji(17), oldOnion(0.25), oldSoy(1.25), oldMayo(7.5), oldCheese(20)],
    ["トースター"], ["薄切りにした玉ねぎとしめじをツナと合わせ、パンに広げる。チーズをのせて焼く。"], ajinomoto(703571)),
  recipe("tofu-egg-cheese", "豆腐と卵のチーズ蒸し", ["lunch", "dinner"], 5,
    [old("egg", "卵", 1, "個"), oldTofu(150), old("dashi", "和風顆粒だし", 5 / 3, "mL"), oldCheese(20)],
    ["電子レンジ"], ["深めの耐熱容器で卵、豆腐、だしを混ぜ、チーズを加えて中心まで火を通す。夕食はご飯を添えても。"], delish("635674931002081584")),
  recipe("tomato-cheese-toast", "焼きトマトのチーズトースト", ["lunch"], 12,
    [old("bread", "食パン", 1, "枚"), oldMayo(5), old("bacon", "ベーコン", 1, "枚"), old("tomato", "トマト", 0.5, "個"), oldCheese(20)],
    ["トースター"], ["パンに具を広げ、トースター対応皿にのせて焼く。"], ajinomoto(700184)),
  recipe("ginger-pork", "基本の豚しょうが焼き", ["dinner"], 15,
    [old("pork-sliced", "豚しょうが焼き用肉", 100, "g"), oldFlour(5), oldSake(11.25), oldSoy(7.5), old("ginger", "しょうが", 0.75, "片"), oldSugar(2.5),
      old("cabbage", "キャベツ", 50, "g"), oldOil(3.75)],
    ["フライパン"], ["キャベツを切る。薄力粉をまぶした豚肉を焼き、たれをからめて皿に盛る。"], ajinomoto(706344)),
  recipe("microwave-mackerel-tomato", "レンジさばトマト煮", ["dinner"], 7,
    [old("miso-mackerel-can", "さばみそ煮缶", 0.5, "缶"), oldTomato(100), old("granulated-consomme", "顆粒コンソメ", 2.5, "mL")],
    ["電子レンジ"], ["耐熱容器に材料を合わせ、電子レンジで温める。お好みで炊飯済みのご飯を添える。"], ajinomoto(801579)),
  recipe("fresh-mackerel-tomato", "さばと野菜のトマト煮", ["dinner"], 25,
    [old("fresh-mackerel", "生さば", 1, "切れ"), oldFlour(3.75), oldOnion(0.25), oldShimeji(25), old("broccoli", "ブロッコリー", 3, "房"),
      old("garlic", "おろしにんにく", 2.5, "mL"), oldTomato(100), old("consomme-cube", "固形コンソメ", 0.5, "個"), oldSugar(2.5), oldOil(7.5)],
    ["鍋"], ["さばの骨を確認し、水気を拭いて薄力粉をまぶす。さばと切った野菜を煮て、中心まで加熱する。"], ajinomoto(803054)),
  recipe("chicken-egg-bowl", "鶏玉ねぎ卵とじ丼", ["dinner"], 15,
    [old("chicken-thigh", "鶏もも肉", 100, "g"), oldOnion(0.5), old("egg", "卵", 1, "個"), oldRice(200), oldSoup(15)],
    ["フライパン"], ["仮レシピ。鶏肉と玉ねぎを切り、めんつゆと水で煮る。火が通ったら溶き卵を加え、ご飯に盛る。"]),
  recipe("sweet-soy-tofu-bowl", "甘辛焼き豆腐丼", ["dinner"], 15,
    [oldRice(200), old("firm-tofu", "木綿豆腐", 150, "g"), old("leek", "長ねぎ", 50, "g"), old("potato-starch", "片栗粉", 15, "mL"), oldOil(15),
      old("bonito-flakes", "かつお節", 4, "g"), oldSake(15), oldSugar(7.5), oldSoy(15)],
    ["フライパン"], ["水気を取った豆腐に片栗粉をまぶして焼く。ねぎとたれを加え、ご飯にのせる。"], delish("261227894045409765")),
  recipe("egg-meat-udon", "卵入り肉うどん", ["lunch", "dinner"], 10,
    [old("udon", "うどん", 1, "玉"), old("sliced-meat", "薄切り肉", 80, "g"), old("egg", "卵", 1, "個"), old("frozen-vegetables", "冷凍野菜", 100, "g")],
    ["鍋"], ["うどんと冷凍野菜は商品の表示に従う。肉と卵まで火を通す。"]),
  recipe("frozen-bento-rice", "冷凍弁当＋ご飯", ["lunch", "dinner"], 8,
    [old("frozen-bento", "冷凍弁当", 1, "個"), oldRice(180)], ["電子レンジ"], ["商品表示に従って温める。"]),
];

/** 定番の買い物。量は売り場で買う単位（レシピと同じ ID・単位なので、買うと候補に効く） */
export const SHOPPING_TEMPLATES = [
  { id: "weekly", name: "週の買い足し", ingredients: [buyOf("veg-pack"), buyOf("egg"), buyOf("tofu-pack"), buyOf("onion")] },
  { id: "freezer", name: "冷凍庫の補充", ingredients: [buyOf("pork-belly-frozen"), buyOf("ground-meat-frozen"), buyOf("chicken-thigh"), buyOf("frozen-udon")] },
  { id: "rice-box", name: "パックご飯の箱", ingredients: [buyOf("pack-rice")] },
  { id: "pasta", name: "パスタの日", ingredients: [buyOf("dry-pasta"), buyOf("tuna-can"), buyOf("tomato-can"), buyOf("shimeji"), buyOf("kanikama")] },
  { id: "morning", name: "朝ごはんと牛乳", ingredients: [buyOf("bread"), buyOf("banana"), buyOf("yogurt"), buyOf("milk")] },
];

export function allRecipes(projection: LifeProjection): Recipe[] {
  const recipes = new Map(RECIPES.map((value) => [value.id, value]));
  for (const { value } of Object.values(projection.recipes)) recipes.set(value.id, value);
  return [...recipes.values()].filter((value) => !value.hidden);
}

const LEGACY_BY_ID = new Map(LEGACY_RECIPES.map((value) => [value.id, value]));
/** ID からレシピを引く（外したもの・前のカタログのものも）。過去の予定・記録の表示に使う */
export function findRecipe(projection: LifeProjection, id: string | undefined): Recipe | undefined {
  if (!id) return;
  return projection.recipes[id]?.value ?? RECIPES.find((value) => value.id === id) ?? LEGACY_BY_ID.get(id);
}

export function ingredientsFor(recipe: Recipe, servings: number, slot?: MealSlot): Quantity[] {
  const ingredients = slot === "dinner" && recipe.id === "tofu-egg-cheese" ? [...recipe.ingredients, oldRice(200)] : recipe.ingredients;
  return ingredients.map((quantity) => ({ ...quantity, amount: quantity.amount * servings / recipe.servings }));
}

/** 食べた記録に残す材料（量を数えない調味料は除く） */
export function consumptionsFor(recipe: Recipe, servings: number, slot?: MealSlot): Quantity[] {
  return ingredientsFor(recipe, servings, slot).filter((quantity) => !isPantryStaple(quantity.ingredientId));
}

export function pantryStatus(quantity: Quantity, projection: LifeProjection): Presence {
  const noted = projection.presence[quantity.ingredientId]?.value;
  if (noted === "missing") return "missing";
  const kind = INGREDIENTS[quantity.ingredientId]?.kind;
  if (kind === "pantry") return "available";
  const available = projection.inventory[quantityKey(quantity)];
  if (available && available.amount >= quantity.amount - 1e-8) return "available";
  if (noted === "available") return "available";
  if (available) return "missing";
  return kind === "stock" ? "available" : "unknown";
}

/** そのレシピで家にない（または分からない）材料 */
export function recipeLacking(recipe: Recipe, projection: LifeProjection, slot?: MealSlot): Quantity[] {
  return ingredientsFor(recipe, recipe.servings, slot).filter((quantity) => pantryStatus(quantity, projection) !== "available");
}

/** 足りない材料のひとこと：「卵を買えば」（ないと分かっている）／「卵があれば」（分からない） */
export function lackingText(lacking: Quantity[], projection: LifeProjection): string {
  if (!lacking.length) return "";
  const names = lacking.slice(0, 2).map((q) => shortName(q.name)).join("・") + (lacking.length > 2 ? "など" : "");
  return names + (lacking.every((q) => pantryStatus(q, projection) === "missing") ? "を買えば" : "があれば");
}

export interface MealOption {
  recipe: Recipe;
  /** 家にない・分からない材料（0 なら今すぐ作れる） */
  lacking: Quantity[];
}

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

/**
 * 食事の候補：今あるもので作れるもの（最大3つ）→ あと1つ買えば作れるもの（合わせて4つまで、最低1つ）。
 * 同じ段の中では、傷みやすい物・期限の近い物を使うもの → 最近食べていないもの → 日ごとに入れ替わる順。
 */
export function mealOptions(projection: LifeProjection, date: string, slot: MealSlot, minutes: number): MealOption[] {
  const order = (mealSlot: MealSlot) => MEAL_SLOTS.indexOf(mealSlot);
  const prior = Object.values(projection.meals)
    .filter(({ value }) => value.status === "eaten_home" && (value.date < date || value.date === date && order(value.slot) < order(slot)))
    .sort((a, b) => b.value.date.localeCompare(a.value.date) || order(b.value.slot) - order(a.value.slot)).slice(0, 4);
  const recent = new Set(prior.map(({ value }) => value.recipe?.id));
  const ranked = allRecipes(projection)
    .filter((recipe) => recipe.slots.includes(slot) && recipe.ingredients.length > 0 && (recipe.minutes ?? Infinity) <= minutes)
    .map((recipe) => {
      const ingredients = ingredientsFor(recipe, recipe.servings, slot);
      const lacking = ingredients.filter((quantity) => pantryStatus(quantity, projection) !== "available");
      const fresh = ingredients.some((quantity) => {
        const stock = projection.inventory[quantityKey(quantity)];
        if (!stock || stock.amount < quantity.amount - 1e-8) return false;
        const soon = stock.expiresOn !== undefined && stock.expiresOn >= date && (Date.parse(stock.expiresOn) - Date.parse(date)) / 86_400_000 <= 2;
        return soon || INGREDIENTS[quantity.ingredientId]?.fresh === true;
      });
      return { recipe, lacking, fresh, recent: recent.has(recipe.id), turn: hash(date + slot + recipe.id) };
    })
    .filter(({ lacking }) => lacking.length <= 1)
    .sort((a, b) => a.lacking.length - b.lacking.length || Number(b.fresh) - Number(a.fresh)
      || Number(a.recent) - Number(b.recent) || a.turn - b.turn);
  const ready = ranked.filter(({ lacking }) => !lacking.length).slice(0, 3);
  const almost = ranked.filter(({ lacking }) => lacking.length === 1).slice(0, Math.max(1, 4 - ready.length));
  return [...ready, ...almost].map(({ recipe, lacking }) => ({ recipe, lacking }));
}

/** 今あるもので作れる候補（最大3つ） */
export function mealSuggestions(projection: LifeProjection, date: string, slot: MealSlot, minutes: number): Recipe[] {
  return mealOptions(projection, date, slot, minutes).filter(({ lacking }) => !lacking.length).map(({ recipe }) => recipe);
}

export function shoppingNeeds(projection: LifeProjection, planned: Quantity[], template: Quantity[] = []): Quantity[] {
  const needed = new Map<string, Quantity>();
  for (const quantity of planned) {
    const key = quantityKey(quantity);
    needed.set(key, { ...quantity, amount: (needed.get(key)?.amount ?? 0) + quantity.amount });
  }
  for (const quantity of template) {
    const key = quantityKey(quantity);
    if ((needed.get(key)?.amount ?? 0) < quantity.amount) needed.set(key, quantity);
  }
  return [...needed.values()].flatMap((quantity) => {
    const amount = Math.max(0, quantity.amount - (projection.inventory[quantityKey(quantity)]?.amount ?? 0));
    return amount > 1e-8 ? [{ ...quantity, amount }] : [];
  });
}

/** 足りない分を売り場の単位に切り上げる（卵 2個 → 10個、ひき肉 50g → 300g） */
function roundUp(quantity: Quantity): Quantity {
  const info = INGREDIENTS[quantity.ingredientId];
  if (!info?.step || info.unit !== quantity.unit) return quantity;
  return { ...quantity, amount: Math.max(1, Math.ceil(quantity.amount / info.step - 1e-9)) * info.step };
}

/**
 * 買い物の一覧：
 * 1. 予定した家の食事に足りない分（家にある物・いつもある物は除く。売り場の単位に切り上げ）
 * 2. 「ない」にした物と、数えているいつもある物（パックご飯・冷凍の肉など）が切れたもの
 * 3. 選んだ定番（家に半分以上あるものは除く）
 */
export function shoppingList(
  projection: LifeProjection,
  { planned = [], templates = [], known = [] }: { planned?: Quantity[]; templates?: Quantity[]; known?: Quantity[] },
): Quantity[] {
  const out = new Map<string, Quantity>();
  const add = (quantity: Quantity) => {
    const key = quantityKey(quantity);
    if ((out.get(key)?.amount ?? 0) < quantity.amount) out.set(key, quantity);
  };
  const has = (id: string) => [...out.values()].some((quantity) => quantity.ingredientId === id);
  const totals = new Map<string, Quantity>();
  for (const quantity of planned) {
    const key = quantityKey(quantity);
    totals.set(key, { ...quantity, amount: (totals.get(key)?.amount ?? 0) + quantity.amount });
  }
  for (const quantity of totals.values()) {
    if (pantryStatus(quantity, projection) === "available") continue;
    if (isPantryStaple(quantity.ingredientId)) {
      add(buyOf(quantity.ingredientId));
      continue;
    }
    const missing = projection.presence[quantity.ingredientId]?.value === "missing";
    const have = missing ? 0 : (projection.inventory[quantityKey(quantity)]?.amount ?? 0);
    add(roundUp({ ...quantity, amount: quantity.amount - have }));
  }
  const fallback = new Map(known.map((quantity) => [quantity.ingredientId, quantity]));
  const ids = new Set([...Object.keys(INGREDIENTS), ...Object.keys(projection.presence)]);
  for (const id of ids) {
    if (has(id)) continue;
    const info = INGREDIENTS[id];
    if (projection.presence[id]?.value === "missing") {
      const quantity = info ? buyOf(id) : fallback.get(id);
      if (quantity) add(quantity);
    } else if (info?.kind === "stock" && pantryStatus(ing(id, info.serving ?? 1), projection) === "missing") {
      add(buyOf(id));
    }
  }
  for (const quantity of templates) {
    const have = projection.inventory[quantityKey(quantity)]?.amount ?? 0;
    if (projection.presence[quantity.ingredientId]?.value !== "missing" && have >= quantity.amount / 2) continue;
    add(quantity);
  }
  return [...out.values()];
}

/** 家にある物の一覧に出す食材（いつもある物と、そのほか） */
export function pantryItems(projection: LifeProjection, recipes: Recipe[]): { staples: Quantity[]; others: Quantity[] } {
  const byId = new Map<string, Quantity>();
  for (const id of Object.keys(INGREDIENTS)) byId.set(id, ing(id, 1));
  for (const quantity of [...recipes.flatMap((r) => r.ingredients), ...Object.values(projection.inventory)]) {
    if (!byId.has(quantity.ingredientId)) byId.set(quantity.ingredientId, quantity);
  }
  const all = [...byId.values()];
  return { staples: all.filter((q) => isStaple(q.ingredientId)), others: all.filter((q) => !isStaple(q.ingredientId)) };
}

/** レシピの材料の名前の候補（名前から既存の食材 ID を引く） */
export function knownIngredients(): Quantity[] {
  return Object.keys(INGREDIENTS).map((id) => ing(id, 1));
}
