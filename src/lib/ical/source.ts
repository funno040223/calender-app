/** 取り込みに行ってよい iCal の配信元。非公開 URL を任意のサーバーへ送らないように限定する */
const ALLOWED_HOSTS = [/^calendar\.google\.com$/, /^([a-z0-9-]+\.)?icloud\.com$/];

/**
 * 入力された iCal の URL を確かめて、取りに行ける https の URL にする。
 * webcal:// は https:// に読み替える。許可していない配信元なら undefined。
 */
export function normalizeIcsUrl(input: string): URL | undefined {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
  if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname.toLowerCase()))) return undefined;
  return url;
}
