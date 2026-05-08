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
  "nav.receipts": { en: "Receipts", es: "Recibos" },
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

  // Dashboard
  "dashboard.title": { en: "Dashboard", es: "Inicio" },
  "dashboard.description": {
    en: "Overview of your gallery. Inventory, dossiers, contacts, invoices and the team board live in the sidebar.",
    es: "Visión general de la galería. Inventario, dossiers, contactos, facturas y el tablero del equipo viven en la barra lateral.",
  },
  "dashboard.cards.inventory": { en: "Inventory", es: "Inventario" },
  "dashboard.cards.inventory.description": { en: "Artworks in stock.", es: "Obras en stock." },
  "dashboard.cards.attention": { en: "Needs attention", es: "Requieren atención" },
  "dashboard.cards.attention.description": { en: "Flagged this week.", es: "Marcadas esta semana." },
  "dashboard.cards.invoices": { en: "Open invoices", es: "Facturas abiertas" },
  "dashboard.cards.invoices.description": { en: "Awaiting payment.", es: "Pendientes de cobro." },

  // Assigned-to-me dashboard widget
  "assignments.title": { en: "Assigned to you", es: "Asignadas a ti" },
  "assignments.description": {
    en: "Shirika cards where you're a member, overdue first.",
    es: "Tarjetas de Shirika donde eres miembro, vencidas primero.",
  },
  "assignments.empty": {
    en: "Nothing assigned to you. Cards where you're added as a member appear here.",
    es: "Nada asignado a ti. Las tarjetas donde te añadan como miembro aparecerán aquí.",
  },
  "assignments.loading": { en: "Loading…", es: "Cargando…" },
  "assignments.due.overdue": { en: "Overdue", es: "Vencida" },
  "assignments.due.today": { en: "Today", es: "Hoy" },
  "assignments.due.tomorrow": { en: "Tomorrow", es: "Mañana" },
  "assignments.due.daysFromNow": { en: "{n}d", es: "{n}d" },
  "assignments.due.daysAgo": { en: "{n}d ago", es: "hace {n}d" },
  "assignments.due.noDate": { en: "No date", es: "Sin fecha" },
  "assignments.viewAll": { en: "View all in Shirika", es: "Ver todas en Shirika" },

  // Activity stream
  "activity.title": { en: "Recent activity", es: "Actividad reciente" },
  "activity.description": {
    en: "Field changes and events across the gallery, newest first.",
    es: "Cambios de campo y eventos de la galería, los más recientes primero.",
  },
  "activity.empty": {
    en: "No activity yet. As soon as the team edits an artwork, contact, deal, invoice, or kanban card, it appears here.",
    es: "Aún no hay actividad. En cuanto el equipo edite una obra, un contacto, un trato, una factura o una tarjeta de kanban, aparecerá aquí.",
  },
  "activity.loading": { en: "Loading activity…", es: "Cargando actividad…" },
  "activity.error": { en: "Could not load activity.", es: "No se pudo cargar la actividad." },
  "activity.changed": { en: "changed", es: "cambió" },
  "activity.moved": { en: "moved", es: "movió" },

  // Plain-language field labels — map raw schema columns onto words a
  // gallery user reads (instead of "list_id", "sort_order", etc.).
  "activity.field.title": { en: "title", es: "título" },
  "activity.field.status": { en: "status", es: "estado" },
  "activity.field.price_eur": { en: "price", es: "precio" },
  "activity.field.year": { en: "year", es: "año" },
  "activity.field.medium": { en: "medium", es: "técnica" },
  "activity.field.width_cm": { en: "width", es: "ancho" },
  "activity.field.height_cm": { en: "height", es: "alto" },
  "activity.field.depth_cm": { en: "depth", es: "profundidad" },
  "activity.field.notes": { en: "notes", es: "notas" },
  "activity.field.is_nfs": { en: "NFS flag", es: "marca NFS" },
  "activity.field.location_id": { en: "location", es: "ubicación" },
  "activity.field.artist_id": { en: "artist", es: "artista" },
  "activity.field.internal_id": { en: "ID", es: "ID" },
  "activity.field.full_name": { en: "name", es: "nombre" },
  "activity.field.email": { en: "email", es: "email" },
  "activity.field.interest": { en: "interest", es: "interés" },
  "activity.field.newsletter_opt_in": { en: "newsletter opt-in", es: "boletín" },
  "activity.field.due_date": { en: "due date", es: "fecha límite" },
  "activity.field.description": { en: "description", es: "descripción" },
  "activity.field.labels": { en: "labels", es: "etiquetas" },
  "activity.field.list_id": { en: "list", es: "lista" },
  "activity.field.stage": { en: "stage", es: "etapa" },
  "activity.field.value_eur": { en: "value", es: "valor" },
  "activity.field.contact_id": { en: "contact", es: "contacto" },
  "activity.field.artwork_id": { en: "artwork", es: "obra" },

  // Plain-language enum values for status fields.
  "activity.value.available": { en: "Available", es: "Disponible" },
  "activity.value.on_hold": { en: "On hold", es: "En reserva" },
  "activity.value.sold": { en: "Sold", es: "Vendida" },
  "activity.value.archived": { en: "Archived", es: "Archivada" },
  "activity.value.draft": { en: "Draft", es: "Borrador" },
  "activity.value.sent": { en: "Sent", es: "Enviada" },
  "activity.value.paid": { en: "Paid", es: "Cobrada" },
  "activity.value.cancelled": { en: "Cancelled", es: "Cancelada" },
  "activity.value.lead": { en: "Lead", es: "Contacto inicial" },
  "activity.value.interested": { en: "Interested", es: "Interesado" },
  "activity.value.offer_sent": { en: "Offer sent", es: "Oferta enviada" },
  "activity.value.negotiating": { en: "Negotiating", es: "Negociando" },
  "activity.value.won": { en: "Won", es: "Ganado" },
  "activity.value.lost": { en: "Lost", es: "Perdido" },
  "activity.value.true": { en: "Yes", es: "Sí" },
  "activity.value.false": { en: "No", es: "No" },
  "activity.value.empty": { en: "—", es: "—" },
  "activity.value.another": { en: "another item", es: "otro elemento" },
  "activity.verb.created": { en: "created", es: "creó" },
  "activity.verb.updated": { en: "updated", es: "actualizó" },
  "activity.verb.deleted": { en: "deleted", es: "eliminó" },
  "activity.verb.archived": { en: "archived", es: "archivó" },
  "activity.entity.artwork": { en: "an artwork", es: "una obra" },
  "activity.entity.contact": { en: "a contact", es: "un contacto" },
  "activity.entity.invoice": { en: "an invoice", es: "una factura" },
  "activity.entity.deal": { en: "a deal", es: "un trato" },
  "activity.entity.card": { en: "a Shirika card", es: "una tarjeta de Shirika" },
  "activity.entity.loan": { en: "a loan", es: "un préstamo" },
  "activity.entity.consignment": { en: "a consignment", es: "una consignación" },
  "activity.entity.shipment": { en: "a shipment", es: "un envío" },
  "activity.entity.document": { en: "a document", es: "un documento" },

  // Named-entity templates — used when useActivityContext has resolved
  // a label for the row's entity. {name} is the artwork title / contact
  // full name / card title / etc.
  "activity.named.artwork": { en: 'artwork "{name}"', es: 'obra «{name}»' },
  "activity.named.contact": { en: 'contact "{name}"', es: 'contacto «{name}»' },
  "activity.named.invoice": { en: "invoice {name}", es: "factura {name}" },
  "activity.named.deal": { en: 'deal — {name}', es: 'trato — {name}' },
  "activity.named.card": { en: 'Shirika card "{name}"', es: 'tarjeta de Shirika «{name}»' },
  "activity.named.loan": { en: 'loan on "{name}"', es: 'préstamo de «{name}»' },
  "activity.named.consignment": { en: 'consignment on "{name}"', es: 'consignación de «{name}»' },
  "activity.named.shipment": { en: 'shipment of "{name}"', es: 'envío de «{name}»' },
  "activity.named.document": { en: 'document "{name}"', es: 'documento «{name}»' },
  "activity.relative.justNow": { en: "just now", es: "justo ahora" },
  "activity.relative.minute": { en: "min", es: "min" },
  "activity.relative.hour": { en: "h", es: "h" },
  "activity.relative.day": { en: "d", es: "d" },
  "activity.relative.week": { en: "w", es: "sem" },
  "activity.someone": { en: "Someone", es: "Alguien" },

  // Inventory chrome
  "inventory.summary": {
    en: "{filtered} of {total} artwork{plural}{filtersClause}.",
    es: "{filtered} de {total} obra{plural}{filtersClause}.",
  },
  "inventory.summary.filters": {
    en: " · {n} filter{plural} active",
    es: " · {n} filtro{plural} activo{plural}",
  },
  "inventory.empty.title": { en: "No artworks yet", es: "Aún no hay obras" },
  "inventory.empty.description": {
    en: "Use Bulk upload to add the first images. Filenames in Title_40x40cm_Artist or Artist_Title_40x40cm are parsed automatically.",
    es: "Usa Carga masiva para añadir las primeras imágenes. Nombres en formato Título_40x40cm_Artista o Artista_Título_40x40cm se analizan automáticamente.",
  },
  "inventory.noMatches.title": { en: "No matches", es: "Sin coincidencias" },
  "inventory.noMatches.description": {
    en: "{total} artwork{plural} in inventory, but none match the current filters. Adjust or clear above.",
    es: "{total} obra{plural} en inventario, pero ninguna coincide con los filtros actuales. Ajusta o quita arriba.",
  },
  "inventory.export.title": { en: "Export current filter as CSV", es: "Exportar filtro actual como CSV" },

  // Contacts chrome
  "contacts.summary": {
    en: "{filtered} of {total} contact{plural}.",
    es: "{filtered} de {total} contacto{plural}.",
  },
  "contacts.searchPlaceholder": { en: "Search name or email…", es: "Buscar nombre o email…" },
  "contacts.scanCard": { en: "Scan card", es: "Escanear tarjeta" },
  "contacts.addContact": { en: "Add contact", es: "Añadir contacto" },
  "contacts.empty.title": { en: "No contacts yet", es: "Aún no hay contactos" },
  "contacts.empty.description": {
    en: "Add one above, or share the public signup link with your guests.",
    es: "Añade uno arriba o comparte el enlace público de inscripción con tus invitados.",
  },

  // Invoices chrome
  "invoices.summary": {
    en: "{n} invoice{plural} · EUR.",
    es: "{n} factura{plural} · EUR.",
  },
  "invoices.newInvoice": { en: "New invoice", es: "Nueva factura" },
  "invoices.scan": { en: "Scan", es: "Escanear" },

  // Receipts (incoming bills / vendor invoices captured via the scanner)
  "receipts.title": { en: "Receipts", es: "Recibos" },
  "receipts.summary": {
    en: "{n} receipt{plural} · vendor bills and expenses.",
    es: "{n} recibo{plural} · facturas de proveedores y gastos.",
  },
  "receipts.scan": { en: "Scan receipt", es: "Escanear recibo" },
  "receipts.empty.title": { en: "No receipts yet", es: "Aún no hay recibos" },
  "receipts.empty.description": {
    en: "Tap 'Scan receipt' and snap a photo or upload a file. AI extracts the vendor, date, total, and lines for you to review before saving.",
    es: "Pulsa 'Escanear recibo' y haz una foto o sube un archivo. La IA extrae el proveedor, la fecha, el total y las líneas para que las revises antes de guardar.",
  },
  "receipts.selectHint": {
    en: "Select a receipt from the list to see its details.",
    es: "Selecciona un recibo de la lista para ver sus detalles.",
  },
  "invoices.empty.title": { en: "No invoices yet", es: "Aún no hay facturas" },
  "invoices.empty.description": {
    en: "Click 'New invoice' to start a draft. Add line items, then generate a Stripe payment link or download the PDF.",
    es: "Haz clic en 'Nueva factura' para empezar un borrador. Añade líneas, luego genera un enlace de pago Stripe o descarga el PDF.",
  },

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
