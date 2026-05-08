// Tiny, dependency-free translation table. Keys follow `area.field` shape so
// related strings stay grouped (e.g. "nav.dashboard", "common.save"). Adding a
// new translation is a one-line edit here; missing keys fall back to the
// English string, so partial coverage never breaks the UI.
//
// Sized intentionally narrow — chrome + most-used buttons / page headers in
// the first pass. Add to the map as deeper pages get translated; nothing
// outside this file needs to change.

export type Locale = "en" | "es";

export const LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "es", label: "Spanish", nativeLabel: "Español" },
];

type Entry = { en: string; es: string };

export const STRINGS: Record<string, Entry> = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", es: "Inicio" },
  "nav.inventory": { en: "Inventory", es: "Inventario" },
  "nav.collections": { en: "Collections", es: "Colecciones" },
  "nav.dossiers": { en: "Dossiers", es: "Dossiers" },
  "nav.contacts": { en: "Contacts", es: "Contactos" },
  "nav.invoices": { en: "Invoices", es: "Facturas" },
  "nav.pipeline": { en: "Pipeline", es: "Ventas" },
  "nav.shirika": { en: "Shirika", es: "Shirika" },
  "nav.team": { en: "Team", es: "Equipo" },
  "nav.feedback": { en: "Feedback", es: "Comentarios" },

  // Page Settings entry / sheet
  "settings.page": { en: "Page settings", es: "Ajustes de página" },
  "settings.title": { en: "Page settings", es: "Ajustes de página" },
  "settings.description": {
    en: "Language, layout, and visual style.",
    es: "Idioma, disposición y estilo visual.",
  },
  "settings.section.language": { en: "Language", es: "Idioma" },
  "settings.section.layout": { en: "Layout", es: "Disposición" },
  "settings.section.visualStyle": { en: "Visual style", es: "Estilo visual" },
  "settings.comingSoon": { en: "Coming soon", es: "Próximamente" },
  "settings.layout.mode": { en: "Layout mode", es: "Modo de disposición" },
  "settings.layout.mode.description": {
    en: "Affects Inventory, Contacts, Invoices, and the mobile navigation. The classic mode is the original full-page navigation.",
    es: "Afecta Inventario, Contactos, Facturas y la navegación en móvil. El modo clásico es la navegación de página completa original.",
  },
  "settings.layout.classic": { en: "Classic", es: "Clásico" },
  "settings.layout.classic.description": {
    en: "Sidebar + full-page navigation. List a section, click into a record, navigate back.",
    es: "Barra lateral + navegación a página completa. Lista una sección, abre un registro, vuelve.",
  },
  "settings.layout.split": { en: "Split view + drawers", es: "Vista dividida + paneles" },
  "settings.layout.split.description": {
    en: "List on the left, detail on the right — no back-and-forth. Slide-over panels for nested drilldowns. On mobile, the sidebar becomes a bottom tab bar.",
    es: "Lista a la izquierda, detalle a la derecha — sin idas y vueltas. Paneles deslizantes para desglosar. En móvil, la barra lateral se convierte en barra inferior.",
  },
  "settings.layout.placeholder": {
    en: "Density, sidebar position, font size, motion. Pending design review.",
    es: "Densidad, posición de la barra, tamaño de fuente, animación. Pendiente de revisión.",
  },
  "settings.visualStyle.placeholder": {
    en: "Reading aids, color-safe statuses, focus mode. Pending design review.",
    es: "Ayudas de lectura, estados accesibles, modo enfoque. Pendiente de revisión.",
  },

  // Common buttons
  "common.save": { en: "Save", es: "Guardar" },
  "common.saving": { en: "Saving…", es: "Guardando…" },
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.delete": { en: "Delete", es: "Eliminar" },
  "common.deleting": { en: "Deleting…", es: "Eliminando…" },
  "common.add": { en: "Add", es: "Añadir" },
  "common.edit": { en: "Edit", es: "Editar" },
  "common.close": { en: "Close", es: "Cerrar" },
  "common.back": { en: "Back", es: "Volver" },
  "common.search": { en: "Search", es: "Buscar" },
  "common.loading": { en: "Loading…", es: "Cargando…" },
  "common.empty": { en: "Nothing here yet.", es: "Aún no hay nada." },
  "common.confirm": { en: "Confirm", es: "Confirmar" },
  "common.yes": { en: "Yes", es: "Sí" },
  "common.no": { en: "No", es: "No" },

  // TopBar / shell
  "topbar.openNav": { en: "Open navigation", es: "Abrir navegación" },
  "topbar.signOut": { en: "Sign out", es: "Cerrar sesión" },

  // Inventory headings
  "inventory.title": { en: "Inventory", es: "Inventario" },
  "inventory.viewList": { en: "List", es: "Lista" },
  "inventory.viewGrid": { en: "Grid", es: "Cuadrícula" },
  "inventory.bulkUpload": { en: "Bulk upload", es: "Carga masiva" },
  "inventory.import": { en: "Import CSV", es: "Importar CSV" },
  "inventory.export": { en: "Export CSV", es: "Exportar CSV" },
  "inventory.newArtwork": { en: "New artwork", es: "Nueva obra" },

  // Collections / Dossiers / Contacts headings
  "collections.title": { en: "Collections", es: "Colecciones" },
  "dossiers.title": { en: "Dossiers", es: "Dossiers" },
  "contacts.title": { en: "Contacts", es: "Contactos" },
  "invoices.title": { en: "Invoices", es: "Facturas" },
  "pipeline.title": { en: "Pipeline", es: "Ventas" },
  "kanban.title": { en: "Shirika", es: "Shirika" },
};

export function resolve(key: string, locale: Locale): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[locale] || entry.en || key;
}
