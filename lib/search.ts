export type WGraph<V extends Node = Node> = V[];

export type Node = {
  text: string;
  to: number[];
};

export type Match = {
  nodeIds: number[];
  start: number;
  end: number;
};

const tsort = (wg: WGraph): number[] => {
  const result: number[] = [];
  const visited: Set<number> = new Set();
  const stack: any[] = [];

  for (let id = 0; id < wg.length; id++) {
    stack.push({ action: 'call', id });
  }

  while (stack.length > 0) {
    const { action, id } = stack.pop();
    if (action === 'call') {
      if (!visited.has(id)) {
        visited.add(id);
        stack.push({ action: 'push', id });
        for (const nextId of wg[id].to) {
          stack.push({ action: 'call', id: nextId });
        }
      }
    } else {
      result.push(id);
    }
  }

  /*
  const dfs = (id: number) => {
    if (!visited.has(id)) {
      visited.add(id);
      for (const nextId of wg[id].to) {
        dfs(nextId);
      }
      result.push(id);
    }
  }
  */

  return result.reverse();
};

type Table = Record<string, number[]>;

const createTable = (pattern: string): Table => {
  const result: Table = {};
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    result[c] ??= [];
    result[c].push(i);
  }
  return result;
};

type MatchState = {
  nodeIds: number[];
  start: number;
};

const updateMatchState = (s: MatchState, id: number): MatchState => ({
  nodeIds: [...s.nodeIds, id],
  start: s.start,
});

const finishMatchState = (s: MatchState, id: number, end: number): Match => ({
  nodeIds: [...s.nodeIds, id],
  start: s.start,
  end,
});

type MatchStateTable = Record<number, MatchState[]>;

export const search = (wg: WGraph, pattern: string): Match[] => {
  if (pattern.length === 0) {
    return [];
  }

  const result: Match[] = [];

  const table = createTable(pattern);
  const predecessorStateTables: MatchStateTable[] = [];

  for (const id of tsort(wg)) {
    const node = wg[id];
    const text = node.text;

    let stateTable = predecessorStateTables[id] ?? {};
    let i = 0;
    while (i < text.length) {
      if (Object.keys(stateTable).length === 0) {
        i = text.indexOf(pattern[0], i);
        if (i === -1) {
          break;
        }
      }

      const c = text[i];
      const nextStateTable: MatchStateTable = {};
      for (const j of table[c] ?? []) {
        if (j === 0) {
          if (pattern.length === 1) {
            result.push({
              nodeIds: [id],
              start: i,
              end: i + 1,
            });
          } else {
            nextStateTable[j + 1] = [{
              nodeIds: [],
              start: i,
            }];
          }
          continue;
        }

        if (!stateTable[j]) {
          continue;
        }

        if (j === pattern.length - 1) {
          result.push(...stateTable[j].map(s => finishMatchState(s, id, i + 1)));
        } else {
          nextStateTable[j + 1] = stateTable[j];
        }
      }

      stateTable = nextStateTable;
      i += 1;
    }

    for (const nextId of node.to) {
      predecessorStateTables[nextId] ??= {};
      const nextStateTable = predecessorStateTables[nextId];
      for (const j of Object.keys(stateTable).map(k => Number.parseInt(k))) {
        nextStateTable[j] ??= [];
        nextStateTable[j].push(...stateTable[j].map(s => updateMatchState(s, id)));
      }
    }
  }

  return result;
};
