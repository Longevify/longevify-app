"use client";

import { CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  googleCalendarUrl,
  icsDataUrl,
  type CalendarEvent,
} from "@/lib/calendar/event";

interface CalendarButtonsProps {
  event: CalendarEvent;
  className?: string;
}

/**
 * Par de botões pra adicionar agendamento ao calendário pessoal.
 *  - "Google Calendar" abre numa nova aba o flow Add to Google Cal
 *  - "Baixar (.ics)" baixa um arquivo iCal compatível com Apple/Outlook
 */
export function CalendarButtons({ event, className }: CalendarButtonsProps) {
  const googleUrl = googleCalendarUrl(event);
  const ics = icsDataUrl(event);
  const filename = `longevify-${event.id}.ics`;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <a href={googleUrl} target="_blank" rel="noopener noreferrer">
        <Button type="button" variant="outline" size="sm">
          <CalendarPlus className="h-3.5 w-3.5" />
          Google Calendar
        </Button>
      </a>
      <a href={ics} download={filename}>
        <Button type="button" variant="outline" size="sm">
          <Download className="h-3.5 w-3.5" />
          Baixar (.ics)
        </Button>
      </a>
    </div>
  );
}
