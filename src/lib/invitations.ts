// Auto-generated invitations for WhatsApp / email (5.5). Builds share URLs
// from an event's details — no backend, just prefilled drafts the user sends
// from their own WhatsApp / mail client (consistent with the mailto-only
// approach in §2 / feature 10).

export type InvitationInput = {
  title: string;
  date: string; // human-readable
  location?: string | null;
  galleryName: string;
};

export function invitationText({ title, date, location, galleryName }: InvitationInput) {
  const lines = [
    `${galleryName} invites you to ${title}.`,
    `When: ${date}`,
    location ? `Where: ${location}` : null,
    "",
    "We'd love to see you there.",
  ].filter(Boolean);
  return lines.join("\n");
}

export function whatsappUrl(input: InvitationInput) {
  return `https://wa.me/?text=${encodeURIComponent(invitationText(input))}`;
}

export function invitationMailto(input: InvitationInput) {
  const subject = `Invitation — ${input.title}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    invitationText(input),
  )}`;
}
