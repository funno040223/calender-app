import { Suspense } from "react";
import TodayScreen from "@/components/today/TodayScreen";

export default function Page() {
  return <Suspense><TodayScreen /></Suspense>;
}
