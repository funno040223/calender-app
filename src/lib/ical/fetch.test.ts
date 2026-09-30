import { afterEach, expect, it, vi } from "vitest";
import { fetchIcsText } from "./fetch";

const GOOGLE = "https://calendar.google.com/calendar/ical/x/private-y/basic.ics";
afterEach(() => vi.unstubAllGlobals());

it("許可していない場所への転送は、取りに行く前に止める", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }));
  vi.stubGlobal("fetch", fetch);
  await expect(fetchIcsText(GOOGLE)).rejects.toThrow("169.254.169.254");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
});

it("許可した配信元への転送はたどる", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/calendar/ical/x/private-y/basic2.ics" } }))
    .mockResolvedValueOnce(new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  expect(await fetchIcsText(GOOGLE)).toContain("VCALENDAR");
  expect(String(fetch.mock.calls[1][0])).toBe("https://calendar.google.com/calendar/ical/x/private-y/basic2.ics");
});
