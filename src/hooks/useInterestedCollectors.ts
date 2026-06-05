import { useMemo } from "react";
import { useContacts } from "./useContacts";
import { useTags } from "./useTags";

// 4.4: collectors who might be interested in an artist — i.e. contacts who
// carry a tag named after that artist (e.g. a "Daniel Núñez" tag). Used to
// nudge the team when adding/viewing a work by that artist. Pure client-side
// over the tag system already in place; no schema change.
export function useInterestedCollectors(artistName: string | null | undefined) {
  const contacts = useContacts().data ?? [];
  const tags = useTags().data ?? [];

  return useMemo(() => {
    const name = artistName?.trim().toLowerCase();
    if (!name) return [];
    const tagIds = new Set(
      tags.filter((t) => t.name.toLowerCase() === name).map((t) => t.id),
    );
    if (tagIds.size === 0) return [];
    return contacts.filter((c) => c.tag_ids.some((id) => tagIds.has(id)));
  }, [artistName, contacts, tags]);
}
