// Builds a `mailto:` URL with prefilled subject and body. Per CLAUDE.md §2:
// outbound email in v1 uses mailto so the user's default client (Gmail or
// otherwise) opens with a draft, no OAuth, fully Lovable-portable.
//
// Practical mailto length cap is ~2KB across most clients. Long bodies may
// truncate; documented trade-off, not worth a fix until reported.
export function buildMailto(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}
