import { createClient } from "@/lib/supabase/server";
import { sendPush, type PushTarget } from "@/lib/push/send";

/** 設定画面の「テスト通知を送る」。ログインしている本人の端末にだけ送る */
export async function POST() {
  const supabase = await createClient();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (error) return Response.json({ error: "通知を受け取る端末を読めませんでした。" }, { status: 500 });
  if (!subs?.length) return Response.json({ error: "通知を受け取る端末がありません。" }, { status: 400 });

  let sent = 0;
  for (const sub of subs as PushTarget[]) {
    const r = await sendPush(sub, { title: "テスト通知", body: "通知はこのように届きます。", url: "/settings/notifications" });
    if (r === "ok") sent++;
    if (r === "gone") await supabase.from("push_subscriptions").delete().eq("id", sub.id);
  }
  return Response.json({ sent, total: subs.length });
}
