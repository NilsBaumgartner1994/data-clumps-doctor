// Utility to match file paths against patterns supporting '*' (single-segment wildcard)
// and '**' (multi-segment wildcard). Examples:
//  - file: a/b/c/d/e/f.ts
//    pattern: a/**/f.ts  --> matches
//    pattern: **/f.ts     --> matches

export function normalizePath(p: string): string {
  if (!p) return '';
  // Use posix-style separators
  let s = p.replace(/\\/g, '/');
  // remove leading ./
  s = s.replace(/^\.\//, '');
  // collapse multiple slashes
  s = s.replace(/\/+/g, '/');
  // remove trailing slash
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function segmentMatchesPattern(segment: string, patternSegment: string): boolean {
  // patternSegment may contain '*' which matches any characters within a single path segment
  // escape regex special chars except '*'
  let esc = patternSegment.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  esc = esc.replace(/\\\*/g, '.*'); // convert '*' to '.*'
  const re = new RegExp('^' + esc + '$');
  return re.test(segment);
}

export function pathMatchesPattern(filePath: string, pattern: string): boolean {
  if (!filePath || !pattern) return false;
  const f = normalizePath(filePath);
  const p = normalizePath(pattern);

  const fileSegments = f.split('/');
  const patternSegments = p.split('/');

  // recursive matcher
  function match(fi: number, pi: number): boolean {
    // If both consumed, match
    if (fi === fileSegments.length && pi === patternSegments.length) return true;
    // If pattern exhausted but file remains => no match
    if (pi === patternSegments.length) return false;
    const patSeg = patternSegments[pi];

    if (patSeg === '**') {
      // '**' matches zero or more segments
      // Try all possibilities: consume 0..remaining file segments
      // If '**' is the last pattern segment, it matches the rest
      if (pi === patternSegments.length - 1) return true;
      for (let k = fi; k <= fileSegments.length; k++) {
        if (match(k, pi + 1)) return true;
      }
      return false;
    } else {
      // need a file segment to match
      if (fi >= fileSegments.length) return false;
      if (segmentMatchesPattern(fileSegments[fi], patSeg)) {
        return match(fi + 1, pi + 1);
      } else {
        return false;
      }
    }
  }

  return match(0, 0);
}

export default {
  normalizePath,
  pathMatchesPattern,
};
