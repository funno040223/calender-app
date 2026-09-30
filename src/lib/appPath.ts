/**
 * 同じアプリの中の場所（"/..."）だけを通す。ほかは "/"。
 * "//evil.example" や "/\evil.example"、タブ入りの "/<TAB>/evil.example" は、ブラウザが外のサイトとして読むので通さない
 */
export function appPath(p: unknown): string {
  return typeof p === "string" && /^\/(?![/\\])[^\s\\]*$/.test(p) ? p : "/";
}
