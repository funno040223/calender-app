"use client";

import { useApp } from "@/components/app/StoreProvider";
import { dateKeyOf, type ContactAnswer } from "@/lib/mock/model";
import { contactDaysFor } from "@/lib/mock/state";
import { Card, btnPrimary, btnSecondary } from "@/components/ui/controls";

/** 余裕のある週の最初の休日に「連絡してみる？」。答えたらその週はもう出さない */
export default function ContactCard({ today, now }: { today: number; now: number }) {
  const { state, update, notify } = useApp();
  const c = contactDaysFor(state, now).find((x) => x.dayStart === today);
  if (!c) return null;
  const answer = (a: ContactAnswer) => {
    update((d) => ({ ...d, contactLogs: { ...d.contactLogs, [dateKeyOf(c.weekStart)]: a } }));
    notify("記録しました");
  };
  return (
    <Card title="連絡してみる？">
      <div className="flex gap-2 px-4 pt-1 pb-3.5">
        <button type="button" onClick={() => answer("done")} className={btnPrimary}>
          連絡した
        </button>
        <button type="button" onClick={() => answer("skip")} className={btnSecondary}>
          今週はいい
        </button>
      </div>
    </Card>
  );
}
