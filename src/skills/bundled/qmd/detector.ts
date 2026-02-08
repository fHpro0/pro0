const QMD_TRIGGER_PATTERNS: RegExp[] = [
  /\bsearch\s+(my|our|the)?\s*(notes|docs|documentation|knowledge\s*base|kb)\b/i,
  /\bfind\s+(in|within)\s+(notes|docs|documentation|knowledge\s*base|kb)\b/i,
  /\bcheck\s+(the\s+)?(notes|docs|documentation|knowledge\s*base|kb)\b/i,
  /\blook\s+up\s+(in\s+)?(notes|docs|documentation|knowledge\s*base|kb)\b/i,
  /\bsearch\s+local\s+(markdown|notes|docs)\b/i,
  /\bsearch\s+my\s+markdown\s+(notes|docs|files)?\b/i,
  /\bsearch\s+markdown\b/i,
  /\bqmd\b.*\b(search|find|lookup|look\s*up)\b/i,
  /\b(search|find|lookup|look\s*up)\b.*\bqmd\b/i,
  /\bknowledge\s*base\s+search\b/i,
];

export function shouldTriggerQmd(userQuery: string): boolean {
  if (!userQuery) {
    return false;
  }

  return QMD_TRIGGER_PATTERNS.some((pattern) => pattern.test(userQuery));
}
