// Smoke test: render the EditorialPDF to a buffer with a minimal dossier
// payload, confirming @react-pdf doesn't choke on the layout. tsx uses the
// classic JSX runtime by default, so we make React global before importing
// the template (mirrors what vite does in the browser via plugin-react).
import * as ReactNS from "react";
(globalThis as unknown as { React: typeof ReactNS }).React = ReactNS;

import { renderToBuffer } from "@react-pdf/renderer";
import { EditorialPDF } from "../src/lib/pdf/EditorialPDF";

const dossier: any = {
  id: "d1",
  title: "Test dossier",
  kind: "editorial",
  body_blocks: {
    show_title: "PARALLELS",
    artist_intros: {
      a1: {
        bio_en: "Test EN bio for artist one. ".repeat(8),
        bio_es: "Bio de prueba para el artista uno. ".repeat(8),
        instagram: "@artist_one",
        photo_path: null,
      },
      a2: {
        bio_en: "Test EN bio for artist two. ".repeat(6),
        bio_es: "Bio de prueba para el artista dos. ".repeat(6),
        instagram: "artist_two",
        photo_path: null,
      },
    },
  },
  image_layout: ["w1", "w2", "w3"],
};

const artworks: any[] = [
  {
    id: "w1",
    title: "Electric Melancholy 4",
    year: 2026,
    medium: "Oil on canvas / Óleo sobre lienzo",
    width_cm: 44.5,
    height_cm: 66,
    depth_cm: null,
    price_eur: 3100,
    artist: { id: "a1", name: "Krista Louise Smith" },
    primary_image: null,
  },
  {
    id: "w2",
    title: "Polar Sky",
    year: 2024,
    medium: "Oil on canvas / Óleo sobre lienzo",
    width_cm: 63.5,
    height_cm: 80.01,
    depth_cm: null,
    price_eur: 5500,
    artist: { id: "a1", name: "Krista Louise Smith" },
    primary_image: null,
  },
  {
    id: "w3",
    title: "Guardian",
    year: 2025,
    medium: "Oil and graphite on canvas over panel / Óleo y grafito sobre lienzo montado sobre tabla",
    width_cm: 28,
    height_cm: 35,
    depth_cm: null,
    price_eur: 1850,
    artist: { id: "a2", name: "Elliot Purse" },
    primary_image: null,
  },
];

(async () => {
  const buf = await renderToBuffer(
    ReactNS.createElement(EditorialPDF, {
      dossier,
      artworks,
      galleryName: "YUSTO / GINER",
      imageUrlFor: () => null,
    }) as any,
  );
  // Expect: cover + 2 intro pages + 3 artwork pages = 6 pages.
  // PDF page count is the number of "/Type /Page" entries.
  const pageCount = (buf.toString("binary").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`PDF rendered: ${buf.length} bytes, ${pageCount} pages`);
  const fs = await import("node:fs/promises");
  await fs.writeFile("/tmp/editorial-test.pdf", buf);
  console.log(`Wrote /tmp/editorial-test.pdf`);
  if (pageCount !== 6) {
    console.error(`Expected 6 pages, got ${pageCount}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error("Render failed:", e);
  process.exit(1);
});
