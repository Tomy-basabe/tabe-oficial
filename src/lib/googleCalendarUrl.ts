/**
 * Generates a Google Calendar URL to add an event
 * Opens in a new tab where the user can save it to their calendar
 */
export function generateGoogleCalendarUrl(event: {
  title: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:mm format
  description?: string;
}): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  
  // Parse date
  const [year, month, day] = event.date.split("-").map(Number);
  
  let dates: string;
  
  if (event.time) {
    // If time is provided, create a 2-hour event
    const [hours, minutes] = event.time.split(":").map(Number);
    
    // Create start and end dates
    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(year, month - 1, day, hours + 2, minutes); // 2 hours duration
    
    // Format for Google Calendar with timezone
    const startStr = formatDateTimeForGoogle(start);
    const endStr = formatDateTimeForGoogle(end);
    dates = `${startStr}/${endStr}`;
  } else {
    // All-day event - format: YYYYMMDD/YYYYMMDD
    const startStr = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
    // For all-day events, end date is next day
    const nextDay = new Date(year, month - 1, day + 1);
    const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, "0")}${String(nextDay.getDate()).padStart(2, "0")}`;
    dates = `${startStr}/${endStr}`;
  }
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: dates,
  });
  
  if (event.description) {
    params.append("details", event.description);
  }
  
  const url = `${baseUrl}?${params.toString()}`;
  console.log("Google Calendar URL generated:", url);
  return url;
}

function formatDateTimeForGoogle(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = "00";
  
  // Format: YYYYMMDDTHHMMSS (local time)
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}
