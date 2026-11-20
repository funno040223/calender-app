// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { projectLife } from "@/lib/life/projection";
import { BREAKFAST_RECIPES } from "@/lib/life/catalog";
import type { Exercise, Quantity } from "@/lib/life/model";
import { validateLifeEvent } from "@/lib/life/validation";
import Breakfast from "./Breakfast";
import MealActual from "./MealActual";
import Shopping from "./Shopping";
import { applyMealChoice, mealDayOf, slotAtMinutes } from "./mealSlot";
import MovementGuide from "./MovementGuide";
import { ExercisePanel } from "./Exercise";

const actions = vi.hoisted(() => ({
  recordMeal: vi.fn(() => true),
  undoMeal: vi.fn(),
  buy: vi.fn<(lines: Quantity[], id: string) => boolean>(() => true),
  undoPurchase: vi.fn(() => true),
  completeExercise: vi.fn<(input: Exercise) => boolean>(() => true),
}));
vi.mock("@/lib/life/store", () => ({ useLife: () => ({ projection: projectLife([]), ready: true, ...actions }) }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("朝食のワンタップで選んだ料理・材料を一度だけ記録する", () => {
  render(<Breakfast date="2026-11-24" />);
  fireEvent.click(screen.getByRole("button", { name: "トースト" }));
  expect(actions.recordMeal).toHaveBeenCalledTimes(1);
  expect(actions.recordMeal).toHaveBeenCalledWith(
    expect.objectContaining({
      date: "2026-11-24",
      slot: "breakfast",
      status: "eaten_home",
      consumptions: BREAKFAST_RECIPES[0].ingredients,
    }),
  );
});
it("人分を直すと実際に保存していた材料量を基準に換算する", () => {
  const recipe = BREAKFAST_RECIPES[0];
  const quantity = { ...recipe.ingredients[0], amount: 3 };
  render(
    <MealActual
      date="2026-11-24"
      slot="breakfast"
      recipes={[recipe]}
      existing={{
        date: "2026-11-24",
        slot: "breakfast",
        status: "eaten_home",
        recipe: { id: recipe.id, name: recipe.name, servings: 2 },
        consumptions: [quantity],
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("食べた量（人分）"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "記録を直す" }));
  expect(actions.recordMeal).toHaveBeenCalledWith(
    expect.objectContaining({ consumptions: [{ ...quantity, amount: 1.5 }] }),
  );
});
it("一括購入は連続して押しても再送せず、取り消すともう一度買える", () => {
  render(<Shopping date="2026-11-24" />);
  fireEvent.click(screen.getByRole("button", { name: "週の買い足し" }));
  const buy = screen.getByRole("button", { name: /買った/ });
  expect(screen.getByLabelText("卵の買う量")).toHaveProperty("value", "10");
  fireEvent.click(buy);
  fireEvent.click(buy);
  expect(actions.buy).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "取り消す" }));
  expect(actions.undoPurchase).toHaveBeenCalledWith(actions.buy.mock.calls[0]?.[1]);
  fireEvent.click(buy);
  expect(actions.buy).toHaveBeenCalledTimes(2);
});
it("種目別の回数・負荷を保存可能なIDで実績に渡す", () => {
  render(<ExercisePanel date="2026-11-24" activity="strength" roundId="manual:2026-11-24:strength" />);
  fireEvent.click(screen.getByRole("button", { name: "くわしく記録" }));
  const row = within(screen.getByRole("group", { name: "リュックを引く" }));
  fireEvent.change(row.getByLabelText("回数"), { target: { value: "8" } });
  fireEvent.change(row.getByLabelText("負荷（kg）"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(actions.completeExercise).toHaveBeenCalledTimes(1);
  const payload = actions.completeExercise.mock.calls[0]?.[0];
  expect(payload).toMatchObject({ details: [{ id: "row", reps: 8, loadKg: 2 }] });
  expect(
    validateLifeEvent({
      kind: "exercise",
      id: crypto.randomUUID(),
      schemaVersion: 1,
      deviceId: crypto.randomUUID(),
      occurredAt: "2026-11-24T02:00:00.000Z",
      recordedAt: "2026-11-24T02:00:00.000Z",
      payload,
    }),
  ).toBe(true);
});
it("動きを減らす設定では静止姿勢を手で送れる", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { container } = render(<MovementGuide activity="walking" short={false} />);
  fireEvent.click(screen.getByRole("button", { name: "次の姿勢（1/3）" }));
  expect(screen.getByRole("button", { name: "次の姿勢（2/3）" })).toBeTruthy();
  expect(container.querySelector("animate")).toBeNull();
});

it("食事の選択を組み直しの項目（家で・外で）に伝える", () => {
  const base: { mealsAtHome: Record<string, string[]>; habitSkips: Record<string, string[]> } = { mealsAtHome: {}, habitSkips: { d: ["lunch"] } };
  const home = applyMealChoice(base, "d", "lunch", "home");
  expect(home.mealsAtHome.d).toEqual(["lunch"]);
  expect(home.habitSkips.d).toEqual([]);
  const out = applyMealChoice(home, "d", "lunch", "delivery");
  expect(out.mealsAtHome.d).toEqual([]);
  expect(out.habitSkips.d).toEqual(["lunch"]);
});
it("0時を過ぎても夕食までは前の日の食事の日", () => {
  const day = 1_700_000_000_000;
  const days = [{ dayStart: day, wake: day + 7 * 3600_000, bed: day + 25 * 3600_000 }];
  const late = mealDayOf(day + 24.5 * 3600_000, days, 540);
  expect(late.dayStart).toBe(day);
  expect(slotAtMinutes(late.minutes)).toBe("dinner");
});
it("料理を選ぶまで食べたものを記録できない", () => {
  render(<MealActual date="2026-11-24" slot="lunch" recipes={[BREAKFAST_RECIPES[0]]} />);
  expect((screen.getByRole("button", { name: "記録する" }) as HTMLButtonElement).disabled).toBe(true);
});
