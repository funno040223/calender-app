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
  prop?: "wall" | "chair" | "bench" | "mat";
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

function Guide({ guide }: { guide: Movement }) {
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
    <div className="border-t border-line py-3">
      <h3 className="font-medium">{guide.name}</h3>
      <div
        className={`my-2 flex max-w-sm rounded-xl bg-surface2 p-2 ${guide === guides.calf && alternate ? "-scale-x-100" : ""}`}
        aria-hidden="true"
      >
        {(playing && !manual ? [0] : manual ? [frame] : [0, 1, 2]).map((i) => (
          <Figure key={i} index={i} guide={shown} moving={playing && !manual} />
        ))}
      </div>
      <p className="text-sm">{guide.steps}</p>
      <div className={choices}>
        {guide.prop === "bench" && (
          <button type="button" className={choice(false)} onClick={() => setAlternate(!alternate)}>
            {alternate ? "横から見る" : "斜め後ろから見る"}
          </button>
        )}
        {guide === guides.calf && (
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
export default function MovementGuide({
  activity,
  short,
}: {
  activity: "walking" | "strength" | "mobility";
  short: boolean;
}) {
  const ids =
    activity === "walking"
      ? ["march"]
      : activity === "mobility"
        ? ["calf"]
        : short
          ? ["march", "push", "chair", "calf"]
          : ["march", "push", "row", "chair", "bridge", "calf"];
  return (
    <div>
      <p className="py-2 text-sm text-muted">痛みや普段と異なる息苦しさがあれば中止してください。</p>
      {ids.map((id) => (
        <Guide key={id} guide={guides[id]} />
      ))}
    </div>
  );
}
