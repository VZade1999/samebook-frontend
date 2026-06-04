export function generateCompanyPrefixSuggestion(companyName: string): string {
  const normalized = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return '';
  }

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 10);
  }

  const first = parts[0];
  const second = parts[1];

  if (first.length === 4) {
    return first;
  }

  if (first.length > 4) {
    return first.slice(0, 3);
  }

  if (first.length <= 2) {
    return (first + second.slice(0, 2)).slice(0, 10);
  }

  return first.slice(0, 3);
}
