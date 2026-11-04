// A crossover night for two full groups of eight, built so nobody meets the same
// person more than arithmetic forces. Two inside rounds in a group of eight must
// repeat four faces (24 pair slots, and the second round always has to mix the two
// first-round games), so four is the floor; the cross game is then drawn only from
// pairs nobody in the group has met yet.
import { teamAvg } from "./teamRating";
import { bannedTogether } from "./neverPair";
import { juniorPreferenceCost } from "@/lib/juniorPreference";

const keyOf = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

// The 35 ways to split eight players into two games of four (each set holds player 0).
const FOUR_SETS = [];
for (let a = 1; a < 5; a++) {
  for (let b = a + 1; b < 6; b++) {
    for (let c = b + 1; c < 8; c++) FOUR_SETS.push([0, a, b, c]);
  }
}

// A round of eight: two games of 2v2 covering everyone.
const SPLITS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];

const allRounds = (players) => {
  const out = [];
  for (const set of FOUR_SETS) {
    const rest = [0, 1, 2, 3, 4, 5, 6, 7].filter((x) => !set.includes(x));
    for (const s1 of SPLITS) {
      for (const s2 of SPLITS) {
        const round = [
          { A: [players[set[s1[0][0]]], players[set[s1[0][1]]]], B: [players[set[s1[1][0]]], players[set[s1[1][1]]]] },
          { A: [players[rest[s2[0][0]]], players[rest[s2[0][1]]]], B: [players[rest[s2[1][0]]], players[rest[s2[1][1]]]] },
        ];
        const all = [...round[0].A, ...round[0].B, ...round[1].A, ...round[1].B];
        let clash = false;
        for (let i = 0; i < all.length && !clash; i++) {
          for (let j = i + 1; j < all.length; j++) {
            if (bannedTogether(all[i].name, all[j].name)) { clash = true; break; }
          }
        }
        if (!clash) out.push(round);
      }
    }
  }
  return out;
};

const roundPairs = (round) => {
  const out = [];
  for (const m of round) {
    const all = [...m.A, ...m.B];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) out.push(keyOf(all[i].name, all[j].name));
    }
  }
  return out;
};

const roundPartners = (round) =>
  round.flatMap((m) => [keyOf(m.A[0].name, m.A[1].name), keyOf(m.B[0].name, m.B[1].name)]);

const roundGap = (round) =>
  round.reduce((sum, m) => {
    const a = teamAvg(m.A);
    const b = teamAvg(m.B);
    return sum + (a !== null && b !== null ? (a - b) * (a - b) : 0) + juniorPreferenceCost(m.A, m.B);
  }, 0);

// The two inside games: as few repeated faces as the group allows, then as few
// repeated partners as possible, then the closest games.
const insideOptions = (players, limit = 4) => {
  const rounds = allRounds(players);
  const pairs = rounds.map(roundPairs);
  const partners = rounds.map(roundPartners);
  const gaps = rounds.map(roundGap);
  const scored = [];
  let floor = Infinity;

  for (let i = 0; i < rounds.length; i++) {
    const seen = new Set(pairs[i]);
    for (let j = i + 1; j < rounds.length; j++) {
      let rep = 0;
      for (const p of pairs[j]) if (seen.has(p)) rep++;
      if (rep > floor) continue;
      if (rep < floor) { floor = rep; scored.length = 0; }
      const own = new Set(partners[i]);
      let prep = 0;
      for (const p of partners[j]) if (own.has(p)) prep++;
      scored.push({ i, j, prep, bal: gaps[i] + gaps[j] });
    }
  }

  scored.sort((x, y) => x.prep - y.prep || x.bal - y.bal);
  return scored.slice(0, limit).map((o) => ({
    rounds: [rounds[o.i], rounds[o.j]],
    used: new Set([...pairs[o.i], ...pairs[o.j]]),
    bal: o.bal,
  }));
};

const matchings = (players, used, blocked, limit = 60) => {
  const out = [];
  const allowed = (a, b) => {
    if (used.has(keyOf(a.name, b.name))) return false;
    if (bannedTogether(a.name, b.name)) return false;
    if (blocked.has(String(a.name).toLowerCase()) && blocked.has(String(b.name).toLowerCase())) return false;
    return true;
  };
  const walk = (left, cur) => {
    if (out.length >= limit) return;
    if (!left.length) { out.push(cur); return; }
    const [first, ...rest] = left;
    for (let i = 0; i < rest.length; i++) {
      if (!allowed(first, rest[i])) continue;
      walk(rest.filter((_, k) => k !== i), [...cur, [first, rest[i]]]);
    }
  };
  walk(players, []);
  return out;
};

// Four pairings on each side, matched up by average so the cross games stay even.
const bestCross = (aMatchings, bMatchings) => {
  let best = null;
  for (const ma of aMatchings) {
    const a = ma.map((p) => teamAvg(p)).sort((x, y) => x - y);
    if (a.some((v) => v === null)) continue;
    for (const mb of bMatchings) {
      const b = mb.map((p) => teamAvg(p)).sort((x, y) => x - y);
      if (b.some((v) => v === null)) continue;
      let gap = 0;
      for (let i = 0; i < 4; i++) gap += (a[i] - b[i]) * (a[i] - b[i]);
      gap += ma.reduce((sum, pair, i) => sum + juniorPreferenceCost(pair, mb[i]), 0);
      if (!best || gap < best.gap) best = { gap, ma, mb };
    }
  }
  if (!best) return null;
  return {
    gap: best.gap,
    matches: best.ma.map((pair, i) => ({ A: pair, B: best.mb[i] })),
  };
};

// Inside games for both groups plus the cross game between them, or null when the
// groups cannot be drawn this way and the caller should fall back.
export function buildCrossoverPair(aPlayers, bPlayers, blocked) {
  const optsA = insideOptions(aPlayers);
  const optsB = insideOptions(bPlayers);
  const safe = blocked || new Set();
  let best = null;

  for (const oa of optsA) {
    const aMatchings = matchings(aPlayers, oa.used, safe);
    if (!aMatchings.length) continue;
    for (const ob of optsB) {
      const bMatchings = matchings(bPlayers, ob.used, safe);
      if (!bMatchings.length) continue;
      const cross = bestCross(aMatchings, bMatchings);
      if (!cross) continue;
      const score = cross.gap + oa.bal + ob.bal;
      if (!best || score < best.score) {
        best = { score, aRounds: oa.rounds, bRounds: ob.rounds, cross: cross.matches };
      }
    }
  }

  return best;
}