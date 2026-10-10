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
  duration: 2,
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
  duration: Number(params.get("duration")) || invite.duration,
  mode: params.get("mode") || invite.mode,
  location: params.get("location") || invite.location,
  note: params.get("note") || invite.note
};
const eventId = params.get("event") || "";

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
  if (eventId) responseUrl.searchParams.set("event", eventId);
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
  const endDate = new Date(date.getTime() + (config.duration * 60 * 60 * 1000));
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

const historyList = document.querySelector("#history-list");
const historyStatus = document.querySelector("#history-status");
const historyExample = document.querySelector("[data-history-example]");

const formatHistoryDate = (value) => new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric"
}).format(new Date(value));

function createHistoryCard(item) {
  const card = document.createElement("article");
  card.className = "history-card";

  const media = document.createElement("div");
  media.className = "history-photo history-photo-upload";

  if (item.photo_url) {
    const image = document.createElement("img");
    image.src = item.photo_url;
    image.alt = `Photo from ${item.title}`;
    media.appendChild(image);
  } else {
    const prompt = document.createElement("span");
    prompt.textContent = "add a photo";
    media.appendChild(prompt);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.setAttribute("aria-label", `Add a photo from ${item.title}`);
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        historyStatus.textContent = "That photo is over 8 MB. Choose a smaller one.";
        input.value = "";
        return;
      }

      historyStatus.textContent = "uploading photo…";
      input.disabled = true;
      try {
        const photoUrl = await window.DateAppData.uploadDatePhoto(item.id, file);
        await window.DateAppData.updateDate(item.id, { photo_url: photoUrl });
        item.photo_url = photoUrl;
        historyStatus.textContent = "photo added";
        card.replaceWith(createHistoryCard(item));
      } catch (error) {
        console.error(error);
        historyStatus.textContent = "Couldn’t upload that photo. Try again.";
        input.disabled = false;
      }
    });
    media.appendChild(input);
  }

  const copy = document.createElement("div");
  copy.className = "history-card-copy";
  const title = document.createElement("h3");
  title.textContent = item.title;
  const details = document.createElement("p");
  details.textContent = [formatHistoryDate(item.starts_at), item.location].filter(Boolean).join(" · ");
  copy.append(title, details);

  if (item.response_message) {
    const message = document.createElement("small");
    message.textContent = item.response_message;
    copy.appendChild(message);
  }

  card.append(media, copy);
  return card;
}

async function loadDateHistory() {
  if (!window.DateAppData?.enabled) return;

  historyStatus.textContent = "loading dates…";
  try {
    const items = await window.DateAppData.listDates();
    const previousDates = items
      .filter((item) => item.status === "accepted" && new Date(item.ends_at).getTime() <= Date.now())
      .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

    if (!previousDates.length) {
      historyStatus.textContent = "none yet — the card above is an example";
      return;
    }

    historyExample.remove();
    historyList.replaceChildren(...previousDates.map(createHistoryCard));
    historyStatus.textContent = `${previousDates.length} previous ${previousDates.length === 1 ? "date" : "dates"}`;
  } catch (error) {
    console.error(error);
    historyStatus.textContent = "Couldn’t load previous dates right now.";
  }
}

loadDateHistory();
