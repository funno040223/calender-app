import { normalizeIcsUrl } from "./source";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

/** サーバーで iCal を取りに行く。失敗したら、画面に出せる日本語の理由を投げる（URL は含めない） */
export async function fetchIcsText(input: string): Promise<string> {
  const url = normalizeIcsUrl(input);
  if (!url) throw new Error("Google カレンダーか iCloud の、https で始まる iCal の URL ではありません。");
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new Error("カレンダーに接続できませんでした。時間をおいて試してください。");
  }
  if (!res.ok) {
    throw new Error(`取り込みに失敗しました（${res.status}）。URL が正しいか、公開をやめていないか確かめてください。`);
  }
  // 転送された先も、許可した配信元であること。ドメインは秘密ではないので、理由として出す
  if (!normalizeIcsUrl(res.url || url.href)) {
    const host = (() => {
      try {
        return new URL(res.url).hostname;
      } catch {
        return "不明";
      }
    })();
    if (host === "accounts.google.com") {
      throw new Error(
        "Google のログイン画面に転送されました（accounts.google.com）。「iCal 形式の非公開アドレス」を使っているか確かめてください。会社や学校の Google アカウントでは、管理者が外部からの取得を止めていることがあります。",
      );
    }
    throw new Error(`許可していない場所（${host}）に転送されたため、取り込みを止めました。`);
  }
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("カレンダーが大きすぎて取り込めません。");
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("カレンダーが大きすぎて取り込めません。");
  return text;
}
