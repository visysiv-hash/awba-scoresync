import { describe, it, beforeAll } from "vitest";
let buildGroups, uniqueCandidates, americanSet;
beforeAll(async () => {
  globalThis.window = { location: { href: "http://localhost/", search: "", origin: "http://localhost", pathname: "/", hash: "" }, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, addEventListener: () => {}, removeEventListener: () => {}, history: { replaceState: () => {} } };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.document = { title: "" };
  ({ buildGroups } = await import("/app/src/lib/drawGenerator.js"));
  ({ uniqueCandidates } = await import("/app/src/lib/uniqueCandidates.js"));
  ({ americanSet } = await import("/app/src/lib/americanDoubles.js"));
});
describe("probe", () => {
  it("lists size-3 candidates", () => {
    const list = Array.from({ length: 43 }, (_, i) => ({ name: `P${i + 1}`, rating: 6 - (i / 43) * 3, baseGroup: 1 + Math.floor(i / 8), junior: false }));
    const groups = buildGroups(list);
    const full = groups.filter((g) => g.players.length >= 4);
    const players = full.flatMap((g, home) => g.players.map((p, i) => ({ ...p, home, bottom: i >= 4, short: g.players.length % 4 !== 0 })));
    const sizes = [4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4];
    const cands = uniqueCandidates(players, sizes, 2, americanSet(["P35", "P37", "P39"])).filter((c) => c.ids.length === 3);
    console.log("size3 count", cands.length);
    console.log(cands.slice(0, 8).map((c) => `${c.ids.map((id) => players[id].name + "/h" + players[id].home + (players[id].short ? "s" : "")).join(",")} lone=${players[c.lone].name} cost=${c.cost}`).join("\n"));
  });
});