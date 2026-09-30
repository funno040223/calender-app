export type SectionId = "calendars" | "timetable" | "places" | "habits" | "avoid" | "treats" | "routine" | "basic" | "notifications" | "feed" | "tags" | "colors" | "weather" | "notion" | "rewards" | "health";

export const SECTIONS: Record<SectionId, { title: string; summary: string }> = {
  calendars: { title: "Google カレンダー", summary: "iCal で予定を取り込む" },
  timetable: { title: "時間割", summary: "時限の時刻と授業・ゼミ" },
  places: { title: "場所", summary: "よく行く場所と移動時間" },
  habits: { title: "習慣", summary: "食事・入浴・散歩など" },
  avoid: { title: "避けたい時間帯", summary: "タスクを入れたくない時間" },
  basic: { title: "基本の設定", summary: "睡眠・朝の準備・1日の量" },
  routine: { title: "朝ルーティンの手順", summary: "「今日」のチェックリスト" },
  treats: { title: "楽しみのリスト", summary: "毎日1つ選ぶ「今日の楽しみ」" },
  feed: { title: "カレンダーに配信", summary: "組んだ枠を iPhone・Google のカレンダーで見る" },
  tags: { title: "作業の種類", summary: "集中・事務の1回の長さと休憩" },
  notion: { title: "Notion", summary: "選考の表の締切をタスクに" },
  weather: { title: "天気", summary: "雨の日の散歩と洗濯" },
  colors: { title: "カレンダーの色", summary: "予定・タスク・習慣などの色" },
  notifications: { title: "通知", summary: "予定の前・枠の始まり・毎朝のまとめ" },
  rewards: { title: "ご褒美の金額", summary: "できたこと1回あたりの円" },
  health: { title: "ヘルスケア", summary: "睡眠をショートカットで取り込む" },
};
