/**
 * Parser for ICS (iCalendar) files
 * Supports parsing events from Google Calendar exports
 */
import { generateId } from "./utils/id";

export interface ICSEvent {
  uid: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:mm format
  endDate?: string;
  endTime?: string;
  location?: string;
}

export function parseICSFile(icsContent: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: Partial<ICSEvent> | null = null;
  let currentKey = "";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle line folding (lines that start with space/tab are continuations)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
      i++;
      line += lines[i].substring(1);
    }

    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
      continue;
    }

    if (line.startsWith("END:VEVENT") && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        events.push({
          uid: currentEvent.uid || generateId(),
          title: currentEvent.title,
          description: currentEvent.description,
          date: currentEvent.date,
          time: currentEvent.time,
          endDate: currentEvent.endDate,
          endTime: currentEvent.endTime,
          location: currentEvent.location,
        });
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    // Parse different fields
    if (line.startsWith("UID:")) {
      currentEvent.uid = line.substring(4);
    } else if (line.startsWith("SUMMARY:") || line.startsWith("SUMMARY;")) {
      currentEvent.title = unescapeICS(extractValue(line, "SUMMARY"));
    } else if (line.startsWith("DESCRIPTION:") || line.startsWith("DESCRIPTION;")) {
      currentEvent.description = unescapeICS(extractValue(line, "DESCRIPTION"));
    } else if (line.startsWith("LOCATION:") || line.startsWith("LOCATION;")) {
      currentEvent.location = unescapeICS(extractValue(line, "LOCATION"));
    } else if (line.startsWith("DTSTART")) {
      const { date, time } = parseDateTimeField(line);
      currentEvent.date = date;
      currentEvent.time = time;
    } else if (line.startsWith("DTEND")) {
      const { date, time } = parseDateTimeField(line);
      currentEvent.endDate = date;
      currentEvent.endTime = time;
    }
  }

  return events;
}

function extractValue(line: string, key: string): string {
  // Handle both KEY:value and KEY;params:value formats
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return "";
  return line.substring(colonIndex + 1);
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseDateTimeField(line: string): { date: string; time?: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return { date: "" };

  const value = line.substring(colonIndex + 1).trim();

  // Check if it's a date-only value (VALUE=DATE)
  const isDateOnly = line.includes("VALUE=DATE") && !line.includes("VALUE=DATE-TIME");

  if (isDateOnly || value.length === 8) {
    // Format: YYYYMMDD
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return { date: `${year}-${month}-${day}` };
  }

  // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  if (value.includes("T")) {
    const [datePart, timePart] = value.split("T");
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);

    const hours = timePart.substring(0, 2);
    const minutes = timePart.substring(2, 4);

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }

  return { date: "" };
}

export function validateICSFile(content: string): boolean {
  return content.includes("BEGIN:VCALENDAR") && content.includes("BEGIN:VEVENT");
}
