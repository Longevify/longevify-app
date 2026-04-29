/**
 * Helpers pra exportar agendamentos pro calendário pessoal do paciente.
 *
 * Dois caminhos:
 *   - `googleCalendarUrl(event)` → URL "Add to Google Calendar" que abre
 *     o web app do Google com o evento pre-preenchido.
 *   - `icsDataUrl(event)` → data URL com formato iCalendar (.ics) que dá
 *     pra usar como `<a download>` — funciona em Apple Calendar, Outlook,
 *     Notion, qualquer cliente que entenda iCal.
 *
 * Mantemos puro (sem deps, sem React) pra reusar em onboarding +
 * coleta/agendar + cart confirmation no futuro.
 */

export interface CalendarEvent {
  /** Identificador único — usamos pra UID do .ics. */
  id: string;
  /** Título do evento. */
  title: string;
  /** Descrição (multi-linha OK). */
  description?: string;
  /** Local do evento (ex: "Rua Oscar Freire 123, Apto 502 — São Paulo, SP"). */
  location?: string;
  /** Início — Date ou ISO string. */
  start: Date | string;
  /** Duração em minutos (default 60). */
  durationMinutes?: number;
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Formato compacto UTC YYYYMMDDTHHMMSSZ pra iCal/Google */
function formatCalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Gera URL pro fluxo "Add to Google Calendar". Funciona web + mobile —
 * Google detecta dispositivo e abre app nativo se instalado.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = toDate(event.start);
  const end = new Date(
    start.getTime() + (event.durationMinutes ?? 60) * 60_000,
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatCalDate(start)}/${formatCalDate(end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escape valores de iCal (RFC 5545): \\ , ; \n */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Gera o conteúdo `.ics` (RFC 5545) como string. */
export function icsContent(event: CalendarEvent): string {
  const start = toDate(event.start);
  const end = new Date(
    start.getTime() + (event.durationMinutes ?? 60) * 60_000,
  );
  const now = formatCalDate(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Longevify//pt-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@longevify.com.br`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatCalDate(start)}`,
    `DTEND:${formatCalDate(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${icsEscape(event.location)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR", "");
  return lines.join("\r\n");
}

/** Data URL do .ics — pra usar em `<a href={...} download="...ics">` */
export function icsDataUrl(event: CalendarEvent): string {
  const content = icsContent(event);
  // RFC 5545 spec text type. base64 evita problemas com caracteres BR.
  const base64 =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(content)))
      : Buffer.from(content, "utf-8").toString("base64");
  return `data:text/calendar;charset=utf-8;base64,${base64}`;
}
