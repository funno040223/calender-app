/**
 * 消した・終えたタスクの、もう届いている通知（始まり・どのくらい進んだ？）を閉じて、通知センターに残さない。
 * 通知の tag は一覧の key（"check:<タスクID>:<開始>"・"block:task:<タスクID>:<開始>"）
 */
export async function closeGoneTaskNotices(taskIds: Set<string>): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    for (const n of (await reg?.getNotifications()) ?? []) {
      const m = /^(?:check|block:task):(.+):\d+$/.exec(n.tag);
      if (m && !taskIds.has(m[1])) n.close();
    }
  } catch {
    // 閉じられない環境では何もしない
  }
}
