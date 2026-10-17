window.DateApp = (() => {
  const localDateTime = (value = new Date()) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const formatDate = (value) => new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short"
  }).format(new Date(value));
  const dateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))
    && localDateTime(`${value}T12:00:00`).slice(0, 10) === value;
  const link = (page, values = {}) => {
    const url = new URL(page, location.href);
    url.search = "";
    url.hash = "";
    for (const [key, value] of Object.entries(values)) if (value !== "" && value != null) url.searchParams.set(key, value);
    return url.href;
  };
  const messagesLink = (url) => `sms:${/iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(url)}`;
  const copy = async (input, status) => {
    try { await navigator.clipboard.writeText(input.value); status.textContent = "Link copied."; }
    catch { input.focus(); input.select(); status.textContent = "Select the link and copy it."; }
  };
  function shareButton(button, input, status) {
    button.hidden = !navigator.share;
    button.addEventListener("click", async () => {
      try { await navigator.share({ url: input.value }); }
      catch (error) { if (error.name !== "AbortError") status.textContent = "Sharing didn’t open. Use Copy or Messages."; }
    });
  }
  const readDraft = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const writeDraft = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const clearDraft = (key) => { try { localStorage.removeItem(key); } catch {} };
  const toConfig = (row) => ({ herName: row.recipient, yourName: row.proposer, title: row.title,
    dateTime: row.starts_at, duration: (new Date(row.ends_at) - new Date(row.starts_at)) / 3600000,
    mode: row.mode, location: row.location, note: row.note });
  const calendarDate = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const calendarText = (text) => String(text || "").replaceAll("\\", "\\\\").replace(/\r\n|\r|\n/g, "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  function calendar(config, id = "") {
    const start = new Date(config.dateTime);
    const end = new Date(start.getTime() + config.duration * 3600000);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Our Date//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${id || start.getTime()}@our-date`, `DTSTAMP:${calendarDate(new Date())}`, `DTSTART:${calendarDate(start)}`, `DTEND:${calendarDate(end)}`,
      `SUMMARY:${calendarText(config.title)}`, `DESCRIPTION:${calendarText(config.note)}`, `LOCATION:${calendarText(config.location)}`, "END:VEVENT", "END:VCALENDAR"];
    // RFC 5545 folds content lines at 75 UTF-8 octets, without splitting characters.
    const encoder = new TextEncoder();
    return lines.map((line) => {
      let output = "", count = 0;
      for (const char of line) {
        const length = encoder.encode(char).length;
        if (count + length > 75) { output += "\r\n "; count = 1; }
        output += char; count += length;
      }
      return output;
    }).join("\r\n") + "\r\n";
  }
  return { localDateTime, formatDate, dateOnly, link, messagesLink, copy, shareButton, readDraft, writeDraft, clearDraft, toConfig, calendar };
})();
