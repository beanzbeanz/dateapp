/*
  QUICK CUSTOMIZATION
  Edit the values below, then commit and push to GitHub.
  dateTime must use: YYYY-MM-DDTHH:MM:SS
*/
const invite = {
  herName: "kalilu",
  yourName: "nick",
  title: "dinner and a movie",
  dateTime: "2026-10-24T19:00:00",
  mode: "in-person",
  location: "",
  note: ""
};

// setup.html generates this customized link for you.
const params = new URLSearchParams(window.location.search);
const config = {
  herName: params.get("her") || invite.herName,
  yourName: params.get("from") || invite.yourName,
  title: params.get("title") || invite.title,
  dateTime: params.get("date") || invite.dateTime,
  mode: params.get("mode") || invite.mode,
  location: params.get("location") || invite.location,
  note: params.get("note") || invite.note
};

const replyUrl = new URL("setup.html", window.location.href);
replyUrl.search = "";
const replySetter = config.herName.trim().toLowerCase() === "nick" ? "nick" : "kalilu";
replyUrl.searchParams.set("by", replySetter);
document.querySelector("[data-reply-link]").href = replyUrl.href;

const date = new Date(config.dateTime);
const validDate = !Number.isNaN(date.getTime());
const dayText = validDate ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date) : "our special day";
const dateText = validDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date) : "very soon";
const timeText = validDate ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date) : "the perfect time";

const fill = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
fill("[data-her-name]", config.herName);
fill("[data-your-name]", config.yourName);
fill("[data-plan-title]", config.title);
fill("[data-day]", dayText);
fill("[data-date]", dateText);
fill("[data-time]", timeText);

if (config.note) {
  fill("[data-plan-note]", config.note);
  document.querySelector("[data-plan-note]").hidden = false;
}

const locationText = config.mode === "remote"
  ? (config.location ? `Remote — ${config.location}` : "Remote")
  : config.location;

if (locationText) {
  fill("[data-location]", locationText);
  document.querySelector("[data-location-wrap]").hidden = false;
}

const pad = (number) => String(number).padStart(2, "0");
const countdown = document.querySelector(".countdown");
const countdownFallback = document.querySelector("#countdown-fallback");

function updateCountdown() {
  if (!validDate) return;
  const difference = date.getTime() - Date.now();
  if (difference <= 0) {
    countdown.hidden = true;
    countdownFallback.hidden = false;
    return;
  }
  document.querySelector("#days").textContent = pad(Math.floor(difference / 86400000));
  document.querySelector("#hours").textContent = pad(Math.floor((difference / 3600000) % 24));
  document.querySelector("#minutes").textContent = pad(Math.floor((difference / 60000) % 60));
  document.querySelector("#seconds").textContent = pad(Math.floor((difference / 1000) % 60));
}

updateCountdown();
setInterval(updateCountdown, 1000);

function openResponsePage(answer) {
  const responseUrl = new URL("response.html", window.location.href);
  responseUrl.searchParams.set("answer", answer);
  responseUrl.searchParams.set("from", config.herName);
  responseUrl.searchParams.set("to", config.yourName);
  responseUrl.searchParams.set("title", config.title);
  responseUrl.searchParams.set("date", config.dateTime);
  window.location.href = responseUrl.href;
}

document.querySelectorAll("[data-response]").forEach((button) => {
  button.addEventListener("click", () => openResponsePage(button.dataset.response));
});

const formatCalendarDate = (value) => {
  const parts = [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
    "T",
    pad(value.getHours()),
    pad(value.getMinutes()),
    "00"
  ];
  return parts.join("");
};

const escapeCalendarText = (value) => String(value || "")
  .replaceAll("\\", "\\\\")
  .replaceAll("\n", "\\n")
  .replaceAll(",", "\\,")
  .replaceAll(";", "\\;");

const calendarLink = document.querySelector("[data-calendar]");

if (validDate) {
  const endDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Our Date//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${date.getTime()}@our-date`,
    `DTSTART:${formatCalendarDate(date)}`,
    `DTEND:${formatCalendarDate(endDate)}`,
    `SUMMARY:${escapeCalendarText(config.title)}`,
    `DESCRIPTION:${escapeCalendarText(config.note)}`,
    `LOCATION:${escapeCalendarText(locationText)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  calendarLink.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
  calendarLink.download = `${config.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "date"}.ics`;
} else {
  calendarLink.hidden = true;
}
