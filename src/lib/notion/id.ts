/** 表のアドレス（https://www.notion.so/…?v=…）か ID から、32桁の ID を取り出す */
export function parseDatabaseId(input: string): string | undefined {
  const s = input.trim().split("?")[0];
  const m = s.replace(/-/g, "").match(/([0-9a-f]{32})(?!.*[0-9a-f]{32})/i);
  return m ? m[1].toLowerCase() : undefined;
}
