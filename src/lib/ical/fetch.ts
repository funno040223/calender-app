import { normalizeIcsUrl } from "./source";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** サーバーで iCal を取りに行く。失敗したら、画面に出せる日本語の理由を投げる（URL は含めない） */
export async function fetchIcsText(input: string): Promise<string> {
  const url = normalizeIcsUrl(input);
  if (!url) throw new Error("Google カレンダーか iCloud の、https で始まる iCal の URL ではありません。");
  // 転送は自分でたどり、行く前に許可した配信元（Google・iCloud の https）か確かめる
  let res: Response | undefined;
  let at: URL = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      res = await fetch(at, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store", redirect: "manual" });
    } catch {
      throw new Error("カレンダーに接続できませんでした。時間をおいて試してください。");
    }
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) break;
    const next = (() => {
      try {
        return new URL(location, at);
      } catch {
        return undefined;
      }
    })();
    const allowed = next && normalizeIcsUrl(next.href);
    if (!allowed) {
      // ドメインは秘密ではないので、理由として出す
      const host = next?.hostname ?? "不明";
      if (host === "accounts.google.com") {
        throw new Error(
          "Google のログイン画面に転送されました（accounts.google.com）。「iCal 形式の非公開アドレス」を使っているか確かめてください。会社や学校の Google アカウントでは、管理者が外部からの取得を止めていることがあります。",
        );
      }
      throw new Error(`許可していない場所（${host}）に転送されたため、取り込みを止めました。`);
    }
    at = allowed;
    res = undefined;
  }
  if (!res) throw new Error("転送が多すぎるため、取り込みを止めました。");
  if (!res.ok) {
    throw new Error(`取り込みに失敗しました（${res.status}）。URL が正しいか、公開をやめていないか確かめてください。`);
  }
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("カレンダーが大きすぎて取り込めません。");
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("カレンダーが大きすぎて取り込めません。");
  return text;
}
