/** Notion の表を読む（サーバーだけで使う。合言葉は画面に出さない）。Notion → アプリの一方向 */

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";


async function call(token: string, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401) throw new Error("合言葉が違います");
  if (res.status === 404) throw new Error("表が見つかりません。表に連携を追加しているか確かめてください");
  if (!res.ok) throw new Error(`Notion から読めませんでした（${res.status}）`);
  return res.json();
}

export interface NotionSchema {
  title: string;
  dates: string[];
  stages: { name: string; options: string[] }[];
}

type Prop = { type: string; select?: { options?: { name: string }[] }; status?: { options?: { name: string }[] } };

/** 表の列：タイトルの列、日付の列、セレクト（段階）の列とその選択肢 */
export async function readSchema(token: string, databaseId: string): Promise<NotionSchema> {
  const json = (await call(token, `/databases/${databaseId}`)) as { properties?: Record<string, Prop> };
  const props = Object.entries(json.properties ?? {});
  return {
    title: props.find(([, p]) => p.type === "title")?.[0] ?? "",
    dates: props.filter(([, p]) => p.type === "date").map(([n]) => n),
    stages: props
      .filter(([, p]) => p.type === "select" || p.type === "status")
      .map(([n, p]) => ({ name: n, options: ((p.type === "select" ? p.select : p.status)?.options ?? []).map((o) => o.name) })),
  };
}

export interface NotionRow {
  id: string;
  title: string;
  /** 日付の列の値（"2026-10-05" か "2026-10-05T18:00:00.000+09:00"） */
  date?: string;
  stage?: string;
}

type Page = { id: string; archived?: boolean; in_trash?: boolean; properties: Record<string, { type: string; title?: { plain_text: string }[]; date?: { start?: string } | null; select?: { name?: string } | null; status?: { name?: string } | null }> };

/** 表の行（最大1000行）。締切と段階は、選んだ列から読む */
export async function readRows(token: string, databaseId: string, dateProp: string, stageProp?: string): Promise<NotionRow[]> {
  const rows: NotionRow[] = [];
  let cursor: string | undefined;
  // 選んだ列が表から消えた（名前を変えた）ときや読み切れないときは、エラーにして前のタスクを残す（全部消さない）
  let sawDate = false;
  let sawStage = false;
  let complete = false;
  for (let i = 0; i < 10; i++) {
    const json = (await call(token, `/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    })) as { results?: Page[]; has_more?: boolean; next_cursor?: string | null };
    for (const p of json.results ?? []) {
      if (p.archived || p.in_trash) continue;
      const props = Object.values(p.properties);
      const title = (props.find((x) => x.type === "title")?.title ?? []).map((t) => t.plain_text).join("").trim();
      const d = p.properties[dateProp];
      const st = stageProp ? p.properties[stageProp] : undefined;
      if (d?.type === "date") sawDate = true;
      if (st?.type === "select" || st?.type === "status") sawStage = true;
      rows.push({
        id: p.id.replace(/-/g, ""),
        title,
        date: d?.type === "date" ? d.date?.start ?? undefined : undefined,
        stage: st ? (st.type === "select" ? st.select?.name : st.type === "status" ? st.status?.name : undefined) ?? undefined : undefined,
      });
    }
    if (!json.has_more || !json.next_cursor) {
      complete = true;
      break;
    }
    cursor = json.next_cursor;
  }
  if (!complete) throw new Error("行が1000行を超えていて、読み切れません");
  if (rows.length && !sawDate) throw new Error(`締切の列「${dateProp}」が見つかりません`);
  if (rows.length && stageProp && !sawStage) throw new Error(`段階の列「${stageProp}」が見つかりません`);
  return rows;
}
