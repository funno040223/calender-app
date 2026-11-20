import { MEAL_SLOTS, quantityKey, type LifeProjection, type MealSlot, type Quantity, type Recipe } from "./model";

function item(ingredientId: string, name: string, amount: number, unit: string): Quantity {
  return { ingredientId, name, amount, unit };
}

const rice = (amount: number) => item("cooked-rice", "ご飯（炊飯済み）", amount, "g");
const egg = (amount: number) => item("egg", "卵", amount, "個");
const bread = (amount: number) => item("bread", "食パン", amount, "枚");
const tofu = (amount: number) => item("silken-tofu", "絹豆腐", amount, "g");
const onion = (amount: number) => item("onion", "玉ねぎ", amount, "個");
const cheese = (amount: number) => item("pizza-cheese", "ピザ用チーズ", amount, "g");
const soy = (amount: number) => item("soy-sauce", "しょうゆ", amount, "mL");
const oil = (amount: number) => item("oil", "油", amount, "mL");
const tomatoCan = (amount: number) => item("tomato-can", "カットトマト缶", amount, "g");
const thickTofu = (amount: number) => item("firm-tofu", "木綿豆腐", amount, "g");
const yogurt = (amount: number) => item("yogurt", "プレーンヨーグルト", amount, "g");
const banana = (amount: number) => item("banana", "バナナ", amount, "本");
const chicken = (amount: number) => item("chicken-thigh", "鶏もも肉", amount, "g");
const cabbage = (amount: number) => item("cabbage", "キャベツ", amount, "g");
const ginger = (amount: number) => item("ginger", "しょうが", amount, "片");
const misoMackerel = (amount: number) => item("miso-mackerel-can", "さばみそ煮缶", amount, "缶");
const scallion = (amount: number) => item("scallion", "細ねぎ", amount, "mL");
const soupBase = (amount: number) => item("noodle-base", "めんつゆ（3倍濃縮）", amount, "mL");
const mayo = (amount: number) => item("mayo", "マヨネーズ", amount, "mL");
const shimeji = (amount: number) => item("shimeji", "しめじ", amount, "g");
const flour = (amount: number) => item("flour", "薄力粉", amount, "mL");
const sake = (amount: number) => item("sake", "酒", amount, "mL");
const sugar = (amount: number) => item("sugar", "砂糖", amount, "mL");

function recipe(
  id: string, name: string, slots: MealSlot[], minutes: number, ingredients: Quantity[],
  tools: string[], steps: string[], source?: string,
): Recipe {
  return { id, name, slots, minutes, ingredients, servings: 1, tools, steps, source,
    tags: [...slots.map((slot) => ({ breakfast: "朝食", lunch: "昼食", dinner: "夕食" }[slot])), ...tools, minutes + "分"] };
}

const ajinomoto = (id: number) => "https://park.ajinomoto.co.jp/recipe/card/" + id + "/";
const delish = (id: string) => "https://delishkitchen.tv/recipes/" + id;

export const BREAKFAST_RECIPES = [
  recipe("toast", "トースト", ["breakfast"], 5,
    [bread(1), item("slice-cheese", "スライスチーズ", 1, "枚"), item("milk", "牛乳", 200, "mL")],
    ["トースター"], ["パンにチーズをのせて焼き、牛乳を添える。"]),
  recipe("banana-yogurt", "バナナ＋ヨーグルト", ["breakfast"], 2, [banana(1), yogurt(150)],
    ["火を使わない"], ["ヨーグルトにひと口大のバナナを合わせる。"]),
  recipe("onigiri-egg", "おにぎり＋卵", ["breakfast"], 5,
    [rice(100), item("boiled-egg", "ゆで卵", 1, "個")],
    ["火を使わない"], ["炊飯済みのご飯でおにぎりを作り、ゆで卵を添える。"]),
];

const steamedTofu = [egg(1), tofu(150), item("dashi", "和風顆粒だし", 5 / 3, "mL"), cheese(20)];

export const RECIPES = [
  ...BREAKFAST_RECIPES,
  recipe("tofu-chili-bowl", "豆腐のねぎだれラー油丼", ["lunch"], 5,
    [rice(200), tofu(150), item("chili-oil", "食べるラー油", 15, "g"), item("nori", "刻みのり", 3, "g"), scallion(15), soupBase(7.5)],
    ["電子レンジ"], ["耐熱容器で豆腐を温める。ご飯に移し、たれと薬味を添える。辛味は好みで調整。"], delish("267626750568038806")),
  recipe("tofu-herb-bowl", "豆腐と薬味の混ぜ丼", ["lunch"], 5,
    [rice(200), tofu(150), item("myoga", "みょうが", 1, "本"), item("takuan", "たくあん", 3, "cm"), soy(15),
      item("sesame", "白ごま", 5, "mL"), item("sesame-oil", "ごま油", 5, "mL")],
    ["火を使わない"], ["薬味とたくあんを細かく切る。ご飯の上で豆腐と調味料を合わせる。"], delish("163395251153666540")),
  recipe("mackerel-egg-bowl", "さば缶の温玉丼", ["lunch"], 10,
    [rice(200), item("stirfry-vegetables", "五目カット野菜", 65, "g"), item("soy-mackerel", "さばしょうゆ煮", 75, "g"),
      item("onsen-egg", "温泉卵", 1, "個"), item("seasoning-paste", "香味ペースト", 4, "g")],
    ["電子レンジ"], ["耐熱容器で野菜とさばを加熱する。温かいご飯に移し、温泉卵をのせる。"], ajinomoto(708122)),
  recipe("tuna-mushroom-toast", "ツナしめじチーズトースト", ["lunch"], 12,
    [item("baguette", "フランスパン", 2, "枚"), item("water-tuna", "ツナ水煮", 40, "g"), shimeji(17), onion(0.25), soy(1.25), mayo(7.5), cheese(20)],
    ["トースター"], ["薄切りにした玉ねぎとしめじをツナと合わせ、パンに広げる。チーズをのせて焼く。"], ajinomoto(703571)),
  recipe("tofu-egg-cheese", "豆腐と卵のチーズ蒸し", ["lunch", "dinner"], 5, steamedTofu,
    ["電子レンジ"], ["深めの耐熱容器で卵、豆腐、だしを混ぜ、チーズを加えて中心まで火を通す。夕食はご飯を添えても。"], delish("635674931002081584")),
  recipe("tomato-cheese-toast", "焼きトマトのチーズトースト", ["lunch"], 12,
    [bread(1), mayo(5), item("bacon", "ベーコン", 1, "枚"), item("tomato", "トマト", 0.5, "個"), cheese(20)],
    ["トースター"], ["パンに具を広げ、トースター対応皿にのせて焼く。"], ajinomoto(700184)),
  recipe("ginger-pork", "基本の豚しょうが焼き", ["dinner"], 15,
    [item("pork-sliced", "豚しょうが焼き用肉", 100, "g"), flour(5), sake(11.25), soy(7.5), ginger(0.75), sugar(2.5), cabbage(50), oil(3.75)],
    ["フライパン"], ["キャベツを切る。薄力粉をまぶした豚肉を焼き、たれをからめて皿に盛る。"], ajinomoto(706344)),
  recipe("microwave-mackerel-tomato", "レンジさばトマト煮", ["dinner"], 7,
    [misoMackerel(0.5), tomatoCan(100), item("granulated-consomme", "顆粒コンソメ", 2.5, "mL")],
    ["電子レンジ"], ["耐熱容器に材料を合わせ、電子レンジで温める。お好みで炊飯済みのご飯を添える。"], ajinomoto(801579)),
  recipe("fresh-mackerel-tomato", "さばと野菜のトマト煮", ["dinner"], 25,
    [item("fresh-mackerel", "生さば", 1, "切れ"), flour(3.75), onion(0.25), shimeji(25), item("broccoli", "ブロッコリー", 3, "房"),
      item("garlic", "おろしにんにく", 2.5, "mL"), tomatoCan(100), item("consomme-cube", "固形コンソメ", 0.5, "個"), sugar(2.5), oil(7.5)],
    ["鍋"], ["さばの骨を確認し、水気を拭いて薄力粉をまぶす。さばと切った野菜を煮て、中心まで加熱する。"], ajinomoto(803054)),
  recipe("chicken-egg-bowl", "鶏玉ねぎ卵とじ丼", ["dinner"], 15,
    [chicken(100), onion(0.5), egg(1), rice(200), soupBase(15)],
    ["フライパン"], ["仮レシピ。鶏肉と玉ねぎを切り、めんつゆと水で煮る。火が通ったら溶き卵を加え、ご飯に盛る。"]),
  recipe("sweet-soy-tofu-bowl", "甘辛焼き豆腐丼", ["dinner"], 15,
    [rice(200), thickTofu(150), item("leek", "長ねぎ", 50, "g"), item("potato-starch", "片栗粉", 15, "mL"), oil(15),
      item("bonito-flakes", "かつお節", 4, "g"), sake(15), sugar(7.5), soy(15)],
    ["フライパン"], ["水気を取った豆腐に片栗粉をまぶして焼く。ねぎとたれを加え、ご飯にのせる。"], delish("261227894045409765")),
];

export const EXTRA_RECIPES = [
  recipe("egg-meat-udon", "卵入り肉うどん", ["lunch", "dinner"], 10,
    [item("udon", "うどん", 1, "玉"), item("sliced-meat", "薄切り肉", 80, "g"), egg(1), item("frozen-vegetables", "冷凍野菜", 100, "g")],
    ["鍋"], ["うどんと冷凍野菜は商品の表示に従う。肉と卵まで火を通す。"]),
  recipe("frozen-bento-rice", "冷凍弁当＋ご飯", ["lunch", "dinner"], 8,
    [item("frozen-bento", "冷凍弁当", 1, "個"), rice(180)], ["電子レンジ"], ["商品表示に従って温める。"]),
];

export const SHOPPING_TEMPLATES = [
  { id: "breakfast-3", name: "いつもの朝食・軽食（3日）", ingredients: [
    bread(3), banana(3), yogurt(450), egg(3), rice(400),
  ] },
  { id: "home-3", name: "丼と自炊おかず（3食）", ingredients: [
    rice(600), chicken(100), onion(1), egg(2), tofu(300), thickTofu(150),
    misoMackerel(1), tomatoCan(400), cabbage(300), ginger(1),
  ] },
];

export function allRecipes(projection: LifeProjection): Recipe[] {
  const recipes = new Map([...RECIPES, ...EXTRA_RECIPES].map((value) => [value.id, value]));
  for (const { value } of Object.values(projection.recipes)) recipes.set(value.id, value);
  return [...recipes.values()].filter((value) => !value.hidden);
}

export function ingredientsFor(recipe: Recipe, servings: number, slot?: MealSlot): Quantity[] {
  const ingredients = slot === "dinner" && recipe.id === "tofu-egg-cheese" ? [...recipe.ingredients, rice(200)] : recipe.ingredients;
  return ingredients.map((quantity) => ({ ...quantity, amount: quantity.amount * servings / recipe.servings }));
}

export function pantryStatus(quantity: Quantity, projection: LifeProjection) {
  const available = projection.inventory[quantityKey(quantity)];
  if (available && available.amount >= quantity.amount - 1e-8) return "available";
  const noted = projection.presence[quantity.ingredientId]?.value;
  if (noted === "available") return "available";
  if (available || noted === "missing") return "missing";
  return "unknown";
}

export function mealSuggestions(projection: LifeProjection, date: string, slot: MealSlot, minutes: number): Recipe[] {
  const order = (mealSlot: MealSlot) => MEAL_SLOTS.indexOf(mealSlot);
  const prior = Object.values(projection.meals)
    .filter(({ value }) => value.status === "eaten_home" && (value.date < date || value.date === date && order(value.slot) < order(slot)))
    .sort((a, b) => b.value.date.localeCompare(a.value.date) || order(b.value.slot) - order(a.value.slot)).slice(0, 3);
  const recent = new Set(prior.map(({ value }) => value.recipe?.id));
  return allRecipes(projection)
    .filter((recipe) => recipe.slots.includes(slot) && recipe.minutes !== undefined && recipe.minutes <= minutes)
    .map((recipe) => {
      const ingredients = ingredientsFor(recipe, recipe.servings, slot);
      return {
        recipe,
        canMake: ingredients.length > 0 && ingredients.every((quantity) => pantryStatus(quantity, projection) === "available"),
        expires: ingredients.some((quantity) => {
          const expiresOn = projection.inventory[quantityKey(quantity)]?.expiresOn;
          return expiresOn !== undefined && expiresOn >= date && (Date.parse(expiresOn) - Date.parse(date)) / 86_400_000 <= 2;
        }),
      };
    })
    .filter(({ canMake }) => canMake)
    .sort((a, b) => Number(b.expires) - Number(a.expires) || Number(recent.has(a.recipe.id)) - Number(recent.has(b.recipe.id))
      || a.recipe.minutes! - b.recipe.minutes!)
    .slice(0, 3).map(({ recipe }) => recipe);
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
