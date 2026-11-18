/** Write chooser syntax only. Titles remain literal strings, never regex or code. */
type Operator = 'AND' | 'OR' | 'NOT';
type Token = { kind: 'term'; value: string; quoted?: boolean } | { kind: 'operator'; value: Operator } | { kind: '(' | ')' | 'missing' };
type Match = { matches: boolean; rank: number };
const precedence: Record<Operator, number> = { OR: 1, AND: 2, NOT: 3 };

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  let i = 0, depth = 0;
  while (i < query.length) {
    if (/\s/.test(query[i])) { i++; continue; }
    const char = query[i++];
    if (char === '(') { tokens.push({kind: '('}); depth++; continue; }
    if (char === ')') { if (depth) { tokens.push({kind: ')'}); depth--; } continue; }
    if (/["“”]/.test(char)) {
      const closing = char === '“' ? '”' : char;
      let value = '';
      while (i < query.length && query[i] !== closing) {
        if (query[i] === '\\' && (query[i + 1] === closing || query[i + 1] === '\\')) i++;
        value += query[i++];
      }
      if (query[i] === closing) i++;
      tokens.push(value ? {kind: 'term', value: value.toLocaleLowerCase(), quoted: true} : {kind: 'missing'});
      continue;
    }
    let value = char;
    while (i < query.length && !/[\s()"“”]/.test(query[i])) value += query[i++];
    // A name beginning OR/NOT/AND stays a name while it is being typed alone.
    // A whole trailing operator after an operand waits for its next operand.
    const operator = /^(AND|OR|NOT)$/.test(value) && (i < query.length || tokens.length > 0);
    tokens.push(operator ? {kind: 'operator', value: value as Operator} : {kind: 'term', value: value.toLocaleLowerCase()});
  }
  return tokens;
}

/** Prefer literal name matches; only fall back when an unfinished operator prefix has no hits. */
export function incompleteBibleOperatorQuery(query: string): string | undefined {
  const suffix = query.match(/^(.*\s)(A|AN|O|N|NO)$/s);
  if (!suffix || !suffix[1].trim()) return;
  const last = tokenize(query).at(-1);
  if (last?.kind === 'term' && !last.quoted) return suffix[1];
}

/** Iterative compilation/evaluation also tolerates deeply pasted groups without recursion. */
export function compileBibleQuery(query: string): (title: string) => Match {
  const tokens = tokenize(query.trimStart());
  const output: Token[] = [], operators: Token[] = [];
  let needsOperand = true;
  function binary(value: 'AND' | 'OR') {
    if (needsOperand) output.push({kind: 'missing'});
    while (operators.length) {
      const top = operators[operators.length - 1];
      if (top.kind !== 'operator' || precedence[top.value] < precedence[value]) break;
      output.push(operators.pop()!);
    }
    operators.push({kind: 'operator', value}); needsOperand = true;
  }
  for (const token of tokens) {
    if (token.kind === 'operator' && token.value !== 'NOT') { binary(token.value); continue; }
    if (token.kind === ')') {
      if (needsOperand) output.push({kind: 'missing'});
      while (operators.length && operators[operators.length - 1].kind !== '(') output.push(operators.pop()!);
      operators.pop(); needsOperand = false; continue;
    }
    if (!needsOperand) binary('AND');
    if (token.kind === '(' || token.kind === 'operator') { operators.push(token); needsOperand = true; }
    else { output.push(token); needsOperand = false; }
  }
  if (needsOperand) output.push({kind: 'missing'});
  while (operators.length) { const token = operators.pop()!; if (token.kind !== '(') output.push(token); }
  // Preserve whole-name exact/prefix relevance for ordinary multiword searches.
  const wholeName = tokens.length && tokens.every(token => token.kind === 'term')
    ? tokens.map(token => (token as {value: string}).value).join(' ') : '';
  return (rawTitle: string): Match => {
    const title = rawTitle.toLocaleLowerCase(), values: Array<Match | undefined> = [];
    for (const token of output) {
      if (token.kind === 'term') values.push({matches: title.includes(token.value), rank: title === token.value ? 0 : title.startsWith(token.value) ? 1 : 2});
      else if (token.kind === 'missing') values.push(undefined);
      else if (token.kind === 'operator') {
        const right = values.pop();
        if (token.value === 'NOT') { values.push(right ? {matches: !right.matches, rank: 3} : undefined); continue; }
        const left = values.pop();
        // Incomplete operands impose no constraint, even under NOT or OR.
        if (!left || !right) { values.push(left || right); continue; }
        const matches = token.value === 'AND' ? left.matches && right.matches : left.matches || right.matches;
        // Negated-only branches have no positive name relevance (rank 3).
        const rank = token.value === 'OR' ? Math.min(left.matches ? left.rank : 3, right.matches ? right.rank : 3)
          : left.rank === 3 ? right.rank : right.rank === 3 ? left.rank : Math.max(left.rank, right.rank);
        values.push({matches, rank});
      }
    }
    const result = values.pop() || {matches: true, rank: 3};
    return wholeName && result.matches ? {...result, rank: title === wholeName ? 0 : title.startsWith(wholeName) ? 1 : result.rank} : result;
  };
}
