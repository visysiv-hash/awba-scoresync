// Exact-cover search: every active player has one slot per round. Constraints
// apply across the whole night, including partner-to-opponent encounters.
export function searchUniqueRounds(count, candidates, sizes, policy, budget = 12000) {
  const seen = { meetings: new Uint8Array(count * count), partners: new Uint8Array(count * count), opponents: new Uint8Array(count * count) };
  const byPlayer = Array.from({ length: count }, () => []);
  for (const match of candidates) {
    if (policy === "meetings" && !match.primary) continue;
    for (const id of match.ids) byPlayer[id].push(match);
  }
  const allowed = (match) => policy === "relaxed" || (policy === "meetings"
    ? match.meetings.every((key) => !seen.meetings[key])
    : match.partners.every((key) => !seen.partners[key]) && match.opponents.every((key) => !seen.opponents[key]));
  const mark = (matches, delta) => {
    for (const match of matches) for (const type of ["meetings", "partners", "opponents"]) {
      for (const key of match[type]) seen[type][key] += delta;
    }
  };
  const repeatCost = (match) => match.partners.reduce((sum, k) => sum + seen.partners[k] * 1e6, 0)
    + match.opponents.reduce((sum, k) => sum + seen.opponents[k] * 1e5, 0)
    + match.meetings.reduce((sum, k) => sum + seen.meetings[k] * 100, 0);
  let nodes = 0;
  const deadline = Date.now() + 900;
  const rounds = [];
  const round = (game) => {
    if (game === 3) return rounds.map((matches) => [...matches]);
    const used = new Uint8Array(count);
    if (count === 3) used[game] = 1; // Rotate the rest, as in the existing short-group format.
    const available = byPlayer.map((list) => {
      const valid = list.filter(allowed);
      return policy === "relaxed" ? valid.sort((a, b) => repeatCost(a) + a.cost - repeatCost(b) - b.cost) : valid;
    });
    const remaining = [0, 0, 0, 0, 0];
    sizes.forEach((size) => remaining[size]++);
    const selected = [];
    const walk = () => {
      if (++nodes > budget || Date.now() > deadline) return null;
      if (selected.length === sizes.length) {
        rounds.push([...selected]);
        mark(selected, 1);
        const result = round(game + 1);
        mark(selected, -1);
        rounds.pop();
        return result;
      }
      let options = null;
      for (let id = 0; id < count; id++) {
        if (used[id]) continue;
        const possible = available[id].filter((match) => remaining[match.ids.length] && match.ids.every((p) => !used[p]));
        if (!possible.length) return null;
        if (!options || possible.length < options.length) options = possible;
      }
      for (const match of options || []) {
        match.ids.forEach((id) => { used[id] = 1; });
        remaining[match.ids.length]--;
        selected.push(match);
        const result = walk();
        selected.pop();
        remaining[match.ids.length]++;
        match.ids.forEach((id) => { used[id] = 0; });
        if (result) return result;
        if (nodes > budget || Date.now() > deadline) break;
      }
      return null;
    };
    return walk();
  };
  return round(0);
}

// Improve rating balance only through legal moves. Never repair a unique draw
// with an unconstrained post-generation player swap.
export function balanceUniqueRounds(rounds, candidates, policy) {
  const lookup = new Map();
  for (const candidate of candidates) {
    const key = candidate.ids.join(",");
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(candidate);
  }
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let game = 0; game < rounds.length; game++) {
      const other = Object.fromEntries(["meetings", "partners", "opponents"].map((type) => [type,
        new Set(rounds.flatMap((matches, g) => g === game ? [] : matches.flatMap((m) => m[type]))) ]));
      const safe = (match) => policy === "relaxed" || (policy === "meetings"
        ? match.meetings.every((k) => !other.meetings.has(k))
        : match.partners.every((k) => !other.partners.has(k)) && match.opponents.every((k) => !other.opponents.has(k)));
      const score = (match) => match.cost + (policy !== "relaxed" ? 0
        : match.partners.filter((k) => other.partners.has(k)).length * 1e6
          + match.opponents.filter((k) => other.opponents.has(k)).length * 1e5
          + match.meetings.filter((k) => other.meetings.has(k)).length * 100);
      const bestFor = (ids) => (lookup.get([...ids].sort((a, b) => a - b).join(",")) || [])
        .filter(safe).sort((a, b) => score(a) - score(b))[0];
      const matches = rounds[game];
      for (let i = 0; i < matches.length; i++) {
        const best = bestFor(matches[i].ids);
        if (best && score(best) < score(matches[i]) - 1e-9) { matches[i] = best; changed = true; }
      }
      for (let i = 0; i < matches.length; i++) for (let j = i + 1; j < matches.length; j++) {
        for (let a = 0; a < matches[i].ids.length; a++) for (let b = 0; b < matches[j].ids.length; b++) {
          const first = [...matches[i].ids];
          const second = [...matches[j].ids];
          [first[a], second[b]] = [second[b], first[a]];
          const x = bestFor(first);
          const y = bestFor(second);
          if (!x || !y || score(x) + score(y) >= score(matches[i]) + score(matches[j]) - 1e-9) continue;
          matches[i] = x;
          matches[j] = y;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return rounds;
}