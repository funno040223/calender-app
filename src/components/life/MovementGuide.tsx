"use client";

import { useEffect, useState } from "react";
import { choice, choices } from "./Controls";

type Point = [number, number];
// Head, shoulder, hip, near elbow/hand/knee/foot, then far elbow/hand/knee/foot.
type Pose = [Point, Point, Point, Point, Point, Point, Point, Point, Point, Point, Point];
interface Movement {
  name: string;
  steps: string;
  poses: [Pose, Pose, Pose];
  prop?: "wall" | "chair" | "bench" | "mat" | "desk";
  /** 左右の図を切り替えられる（ふくらはぎ伸ばし） */
  sides?: boolean;
}
const stand: Pose = [
  [48, 12],
  [48, 25],
  [48, 48],
  [52, 35],
  [52, 44],
  [48, 65],
  [50, 81],
  [44, 35],
  [44, 45],
  [44, 66],
  [43, 81],
];
const lean: Pose = [
  [65, 17],
  [59, 28],
  [47, 49],
  [70, 31],
  [81, 34],
  [35, 65],
  [26, 81],
  [68, 26],
  [81, 29],
  [38, 64],
  [30, 81],
];
const press: Pose = [
  [73, 20],
  [67, 32],
  [53, 51],
  [65, 42],
  [81, 34],
  [38, 66],
  [26, 81],
  [68, 36],
  [81, 29],
  [40, 65],
  [30, 81],
];
const bent: Pose = [
  [65, 34],
  [57, 39],
  [36, 47],
  [67, 45],
  [78, 52],
  [40, 63],
  [35, 81],
  [52, 54],
  [48, 66],
  [30, 63],
  [24, 81],
];
const pulled: Pose = [
  [65, 34],
  [57, 39],
  [36, 47],
  [67, 45],
  [78, 52],
  [40, 63],
  [35, 81],
  [42, 35],
  [43, 47],
  [30, 63],
  [24, 81],
];
const sit: Pose = [
  [42, 27],
  [42, 39],
  [37, 58],
  [53, 45],
  [61, 46],
  [58, 59],
  [60, 81],
  [51, 42],
  [58, 43],
  [53, 62],
  [55, 81],
];
const rising: Pose = [
  [55, 19],
  [51, 32],
  [39, 50],
  [58, 39],
  [68, 40],
  [57, 60],
  [60, 81],
  [55, 36],
  [63, 38],
  [51, 60],
  [55, 81],
];
const lie: Pose = [
  [19, 70],
  [30, 72],
  [51, 74],
  [38, 76],
  [47, 77],
  [67, 53],
  [79, 78],
  [39, 73],
  [47, 74],
  [64, 52],
  [75, 76],
];
const bridge: Pose = [
  [19, 70],
  [30, 72],
  [50, 58],
  [38, 76],
  [47, 77],
  [67, 49],
  [79, 78],
  [39, 73],
  [47, 74],
  [64, 48],
  [75, 76],
];
const stretch: Pose = [
  [62, 15],
  [59, 28],
  [51, 49],
  [70, 31],
  [81, 34],
  [64, 59],
  [63, 81],
  [70, 26],
  [81, 29],
  [38, 64],
  [28, 81],
];
// 2026-11-21 に足した姿勢（腕立ての段階・スクワット・体幹）。どれも右を向いた横から
const deskUp: Pose = [[67, 27], [62, 34], [46, 56], [67, 44], [72, 54], [37, 69], [28, 81], [65, 44], [70, 54], [36, 69], [26, 81]];
const deskDown: Pose = [[74, 36], [68, 43], [49, 61], [61, 47], [72, 54], [38, 71], [28, 81], [59, 47], [70, 54], [37, 71], [26, 81]];
const floorUp: Pose = [[78, 52], [70, 57], [44, 68], [70, 69], [70, 81], [30, 73], [16, 80], [67, 69], [67, 81], [30, 74], [17, 81]];
const floorDown: Pose = [[77, 68], [69, 71], [43, 75], [61, 66], [70, 81], [30, 77], [16, 80], [58, 66], [67, 81], [30, 78], [17, 81]];
const kneeUp: Pose = [[77, 53], [70, 58], [50, 71], [70, 70], [70, 81], [36, 80], [23, 72], [67, 70], [67, 81], [37, 81], [24, 73]];
const kneeDown: Pose = [[76, 69], [69, 72], [50, 77], [61, 67], [70, 81], [36, 80], [23, 72], [58, 67], [67, 81], [37, 81], [24, 73]];
const plank: Pose = [[76, 62], [68, 67], [42, 70], [68, 80], [80, 80], [29, 73], [16, 79], [66, 80], [78, 80], [29, 74], [17, 80]];
const plankHold: Pose = [[76, 63], [68, 67], [42, 69], [68, 80], [80, 80], [29, 73], [16, 79], [66, 80], [78, 80], [29, 74], [17, 80]];
const kneePlank: Pose = [[76, 62], [68, 67], [50, 72], [68, 80], [80, 80], [36, 80], [23, 72], [66, 80], [78, 80], [37, 81], [24, 73]];
const kneePlankHold: Pose = [[76, 63], [68, 67], [50, 71], [68, 80], [80, 80], [36, 80], [23, 72], [66, 80], [78, 80], [37, 81], [24, 73]];
const standArms: Pose = [[48, 12], [48, 25], [48, 48], [58, 26], [68, 26], [48, 65], [50, 81], [56, 27], [66, 27], [44, 66], [43, 81]];
const squatLow: Pose = [[56, 30], [50, 40], [35, 60], [60, 40], [70, 40], [55, 60], [50, 81], [58, 41], [68, 41], [52, 61], [45, 81]];
const splitUp: Pose = [[48, 10], [48, 23], [47, 46], [50, 34], [50, 44], [57, 63], [62, 81], [45, 34], [45, 44], [38, 63], [29, 80]];
const splitDown: Pose = [[47, 24], [47, 37], [46, 59], [49, 48], [49, 58], [62, 64], [62, 81], [44, 48], [44, 58], [40, 78], [28, 80]];
const bugTable: Pose = [[19, 70], [30, 72], [51, 74], [31, 62], [32, 52], [52, 58], [65, 58], [29, 62], [30, 52], [50, 59], [63, 59]];
const bugReach: Pose = [[19, 70], [30, 72], [51, 74], [22, 64], [11, 66], [52, 58], [65, 58], [29, 62], [30, 52], [64, 70], [78, 73]];
const lieLeg: Pose = [[19, 70], [30, 72], [51, 74], [38, 76], [47, 77], [67, 53], [79, 78], [39, 73], [47, 74], [66, 66], [81, 58]];
const bridgeLeg: Pose = [[19, 70], [30, 72], [50, 58], [38, 76], [47, 77], [67, 49], [79, 78], [39, 73], [47, 74], [66, 50], [82, 42]];
const guides: Record<string, Movement> = {
  march: {
    name: "軽い足踏み",
    steps: "足元を空けます。腕を自然に振り、左右の足を交互に低く上げます。",
    poses: [
      stand,
      [
        [48, 12],
        [48, 25],
        [48, 48],
        [57, 32],
        [63, 29],
        [60, 56],
        [57, 69],
        [39, 37],
        [38, 44],
        [44, 66],
        [43, 81],
      ],
      [
        [48, 12],
        [48, 25],
        [48, 48],
        [39, 37],
        [38, 44],
        [48, 65],
        [50, 81],
        [57, 32],
        [63, 29],
        [60, 56],
        [57, 69],
      ],
    ],
  },
  push: {
    name: "壁腕立て",
    prop: "wall",
    steps: "両手を壁につけます。頭から踵を一直線に保ち、肘を曲げて壁に近づき、ゆっくり戻ります。",
    poses: [lean, press, lean],
  },
  row: {
    name: "リュックを引く",
    prop: "bench",
    steps:
      "安定した台に片手をつき、反対の手で空のリュックを持ちます。腰を反らさず脇腹へ引き、下ろします。左右を交代します。",
    poses: [bent, pulled, bent],
  },
  chair: {
    name: "椅子から立つ",
    prop: "chair",
    steps: "キャスターのない椅子を壁際に置きます。足裏を床につけて立ち、ゆっくり座ります。",
    poses: [sit, rising, stand],
  },
  bridge: {
    name: "ヒップブリッジ",
    prop: "mat",
    steps: "仰向けで膝を曲げます。足裏を床につけ、腰を反らさずに上げて、ゆっくり下ろします。",
    poses: [lie, bridge, lie],
  },
  calf: {
    name: "ふくらはぎ伸ばし",
    prop: "wall",
    steps: "壁に手を添え、片脚を後ろへ引きます。後ろの踵を床につけ、反動をつけずに保ちます。左右を交代します。",
    poses: [lean, stretch, lean],
    sides: true,
  },
  "desk-push": {
    name: "机で腕立て",
    prop: "desk",
    steps: "動かない机の縁に手をつき、体を一直線にしたまま胸を近づけて、押して戻ります。",
    poses: [deskUp, deskDown, deskUp],
  },
  "knee-push": {
    name: "ひざつき腕立て",
    prop: "mat",
    steps: "ひざをつき、ひざから頭までを一直線にしたまま胸を床に近づけて、押して戻ります。",
    poses: [kneeUp, kneeDown, kneeUp],
  },
  "floor-push": {
    name: "腕立て伏せ",
    prop: "mat",
    steps: "つま先と手で支え、頭からかかとまで一直線のまま胸を床に近づけて、押して戻ります。",
    poses: [floorUp, floorDown, floorUp],
  },
  plank: {
    name: "プランク",
    prop: "mat",
    steps: "ひじを肩の真下につき、頭からかかとまで一直線のまま止めます。息は止めません。",
    poses: [plank, plankHold, plank],
  },
  "knee-plank": {
    name: "ひざつきプランク",
    prop: "mat",
    steps: "ひじを肩の真下につき、ひざをついたまま、ひざから頭までを一直線にして止めます。",
    poses: [kneePlank, kneePlankHold, kneePlank],
  },
  squat: {
    name: "スクワット",
    steps: "腕を前に伸ばし、お尻を後ろに引いてしゃがみ、かかとで床を押して立ちます。",
    poses: [standArms, squatLow, standArms],
  },
  split: {
    name: "スプリットスクワット",
    steps: "足を前後に開き、後ろのひざを床に近づけるようにまっすぐ下がって、戻ります。",
    poses: [splitUp, splitDown, splitUp],
  },
  deadbug: {
    name: "デッドバグ",
    prop: "mat",
    steps: "仰向けで腕を上げ、ひざを曲げて上げます。腰を床につけたまま、片腕と反対の脚を伸ばして戻ります。",
    poses: [bugTable, bugReach, bugTable],
  },
  "single-bridge": {
    name: "片脚ブリッジ",
    prop: "mat",
    steps: "片脚を伸ばして浮かせ、もう片方の足で床を押してお尻を上げ、ゆっくり下ろします。",
    poses: [lieLeg, bridgeLeg, lieLeg],
  },
};
const limbs = [
  [1, 2],
  [1, 3, 4],
  [2, 5, 6],
  [1, 7, 8],
  [2, 9, 10],
];

function Figure({ guide, index, moving }: { guide: Movement; index: number; moving: boolean }) {
  const pose = guide.poses[index];
  const points = (p: Pose, path: number[]) => path.map((i) => p[i].join(",")).join(" ");
  const sequence = [...guide.poses, guide.poses[0]];
  return (
    <svg viewBox="0 0 100 89" className="min-w-0 flex-1 text-tint" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".36">
        <path d="M8 83h84" />
        {guide.prop === "wall" && <path d="M83 8v75" />}
        {guide.prop === "chair" && <path d="M25 37v23h26m-24 0v21m21-21v21" />}
        {guide.prop === "bench" && <path d="M69 54h21m-18 0v28m15-28v28" />}
        {guide.prop === "desk" && <path d="M62 55h28m-25 0v28m22-28v28" />}
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <circle cx={pose[0][0]} cy={pose[0][1]} r="5">
          {moving &&
            ["cx", "cy"].map((attr, i) => (
              <animate
                key={attr}
                attributeName={attr}
                values={sequence.map((p) => p[0][i]).join(";")}
                dur="6s"
                repeatCount="indefinite"
              />
            ))}
        </circle>
        {limbs.map((path, i) => (
          <polyline key={i} opacity={i > 2 ? 0.55 : 1} points={points(pose, path)}>
            {moving && (
              <animate
                attributeName="points"
                values={sequence.map((p) => points(p, path)).join(";")}
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </polyline>
        ))}
        {guide.prop === "bench" && (
          <circle cx={pose[8][0]} cy={pose[8][1] + 5} r="4">
            {moving &&
              ["cx", "cy"].map((attr, i) => (
                <animate
                  key={attr}
                  attributeName={attr}
                  values={sequence.map((p) => p[8][i] + (i ? 5 : 0)).join(";")}
                  dur="6s"
                  repeatCount="indefinite"
                />
              ))}
          </circle>
        )}
      </g>
    </svg>
  );
}

function Guide({ guide, bare = false }: { guide: Movement; bare?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [frame, setFrame] = useState(0);
  const [alternate, setAlternate] = useState(false);
  const [animationSupported] = useState(() => typeof SVGAnimateElement !== "undefined");
  const manual = reduced || !animationSupported;
  // For the rear view project near and far limbs to opposite sides of the torso.
  const shown =
    guide.prop === "bench" && alternate
      ? {
          ...guide,
          poses: guide.poses.map(
            (pose) =>
              pose.map(
                ([x, y], index) => [46 + (x - 46) * 0.7 + (index >= 7 ? -8 : index >= 3 ? 5 : 0), y] as Point,
              ) as Pose,
          ) as Movement["poses"],
        }
      : guide;
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return (
    <div className={bare ? "" : "border-t border-line py-3"}>
      {!bare && <h3 className="font-medium">{guide.name}</h3>}
      <div
        className={`my-2 flex max-w-sm rounded-xl bg-surface2 p-2 ${guide.sides && alternate ? "-scale-x-100" : ""}`}
        aria-hidden="true"
      >
        {(playing && !manual ? [0] : manual ? [frame] : [0, 1, 2]).map((i) => (
          <Figure key={i} index={i} guide={shown} moving={playing && !manual} />
        ))}
      </div>
      {!bare && <p className="text-sm">{guide.steps}</p>}
      <div className={choices}>
        {guide.prop === "bench" && (
          <button type="button" className={choice(false)} onClick={() => setAlternate(!alternate)}>
            {alternate ? "横から見る" : "斜め後ろから見る"}
          </button>
        )}
        {guide.sides && (
          <button type="button" className={choice(false)} onClick={() => setAlternate(!alternate)}>
            {alternate ? "左脚の図を見る" : "右脚の図を見る"}
          </button>
        )}
        {manual ? (
          <button type="button" className={choice(false)} onClick={() => setFrame((frame + 1) % 3)}>
            次の姿勢（{frame + 1}/3）
          </button>
        ) : (
          <button
            type="button"
            className={choice(false)}
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? "停止" : "動きを見る"}
          </button>
        )}
      </div>
    </div>
  );
}
/** 図があるか */
export const hasFigure = (id: string | undefined) => !!id && id in guides;

/** 1つの動きの図だけ（名前と説明は呼ぶ側で出す） */
export function MoveDemo({ id }: { id: string }) {
  const guide = guides[id];
  return guide ? <Guide guide={guide} bare /> : null;
}

export default function MovementGuide({
  activity,
  short,
  ids,
}: {
  activity: "walking" | "strength" | "mobility";
  short: boolean;
  /** 見せる動き（なければ種類から決める） */
  ids?: string[];
}) {
  const shown =
    ids ??
    (activity === "walking"
      ? ["march"]
      : activity === "mobility"
        ? ["calf"]
        : short
          ? ["march", "push", "chair", "calf"]
          : ["march", "push", "row", "chair", "bridge", "calf"]);
  return (
    <div>
      <p className="py-2 text-sm text-muted">痛みや普段と異なる息苦しさがあれば中止してください。</p>
      {shown
        .filter((id) => id in guides)
        .map((id) => (
          <Guide key={id} guide={guides[id]} />
        ))}
    </div>
  );
}
