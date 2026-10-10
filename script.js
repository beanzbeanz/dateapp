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

// setup.html generates customized invite links. Without invite parameters, the
// home page becomes a shared view of the next real plan in Supabase.
const params = new URLSearchParams(window.location.search);
const hasInviteParams = ["event", "title", "date"].some((name) => params.has(name));
let config = {
  herName: params.get("her") || invite.herName,
  yourName: params.get("from") || invite.yourName,
  title: params.get("title") || invite.title,
  dateTime: params.get("date") || invite.dateTime,
  duration: Number(params.get("duration")) || invite.duration,
  mode: params.get("mode") || invite.mode,
  location: params.get("location") || invite.location,
  note: params.get("note") || invite.note
};
let eventId = params.get("event") || "";
let planDate = new Date(config.dateTime);
let validDate = false;
let countdownTimer;

const fill = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
const pad = (number) => String(number).padStart(2, "0");
const planCard = document.querySelector("[data-plan-card]");
const emptyPlan = document.querySelector("[data-empty-plan]");
const planLoading = document.querySelector("[data-plan-loading]");
const countdownSection = document.querySelector("[data-countdown-section]");
const countdown = document.querySelector(".countdown");
const countdownFallback = document.querySelector("#countdown-fallback");
const calendarLink = document.querySelector("[data-calendar]");
const responseBox = document.querySelector("[data-response-box]");
const planStatus = document.querySelector("[data-plan-status]");
const toolbar = document.querySelector(".site-toolbar");

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

function updateSetupLinks(person = config.herName) {
  const replyUrl = new URL("setup.html", window.location.href);
  replyUrl.search = "";
  const setter = person.trim().toLowerCase() === "nick" ? "nick" : "kalilu";
  replyUrl.searchParams.set("by", setter);
  document.querySelectorAll("[data-setup-link]").forEach((link) => { link.href = replyUrl.href; });
}

function updateCountdown() {
  if (!validDate) return;
  const difference = planDate.getTime() - Date.now();
  if (difference <= 0) {
    countdown.hidden = true;
    countdownFallback.hidden = false;
    return;
  }
  countdown.hidden = false;
  countdownFallback.hidden = true;
  document.querySelector("#days").textContent = pad(Math.floor(difference / 86400000));
  document.querySelector("#hours").textContent = pad(Math.floor((difference / 3600000) % 24));
  document.querySelector("#minutes").textContent = pad(Math.floor((difference / 60000) % 60));
  document.querySelector("#seconds").textContent = pad(Math.floor((difference / 1000) % 60));
}

function updateCalendar(locationText) {
  if (!validDate) {
    calendarLink.hidden = true;
    return;
  }

  const endDate = new Date(planDate.getTime() + (config.duration * 60 * 60 * 1000));
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Our Date//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${planDate.getTime()}@our-date`,
    `DTSTART:${formatCalendarDate(planDate)}`,
    `DTEND:${formatCalendarDate(endDate)}`,
    `SUMMARY:${escapeCalendarText(config.title)}`,
    `DESCRIPTION:${escapeCalendarText(config.note)}`,
    `LOCATION:${escapeCalendarText(locationText)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  calendarLink.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
  calendarLink.download = `${config.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "date"}.ics`;
  calendarLink.hidden = false;
}

function renderPlan(nextConfig, nextEventId = "", status = "proposed", isInvite = false) {
  config = nextConfig;
  eventId = nextEventId;
  planDate = new Date(config.dateTime);
  validDate = !Number.isNaN(planDate.getTime());

  const dayText = validDate ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(planDate) : "our special day";
  const dateText = validDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(planDate) : "very soon";
  const timeText = validDate ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(planDate) : "the perfect time";

  fill("[data-her-name]", config.herName);
  fill("[data-your-name]", config.yourName);
  fill("[data-plan-title]", config.title);
  fill("[data-day]", dayText);
  fill("[data-date]", dateText);
  fill("[data-time]", timeText);
  document.querySelector(".plan-label").textContent = isInvite ? "the plan" : "next up";

  const note = document.querySelector("[data-plan-note]");
  note.textContent = config.note || "";
  note.hidden = !config.note;

  const locationText = config.mode === "remote"
    ? (config.location ? `Remote — ${config.location}` : "Remote")
    : config.location;
  fill("[data-location]", locationText);
  document.querySelector("[data-location-wrap]").hidden = !locationText;

  responseBox.hidden = !isInvite && status !== "proposed";
  planStatus.textContent = status === "accepted" ? "accepted ♡" : "";
  planStatus.hidden = status !== "accepted";
  updateSetupLinks(config.herName);
  updateCalendar(locationText);

  planLoading.hidden = true;
  emptyPlan.hidden = true;
  planCard.hidden = false;
  countdownSection.hidden = !validDate;
  toolbar.hidden = false;
  toolbar.classList.toggle("is-secondary", !isInvite);

  clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function showEmptyPlan() {
  planLoading.hidden = true;
  planCard.hidden = true;
  emptyPlan.hidden = false;
  countdownSection.hidden = true;
  toolbar.hidden = true;
  updateSetupLinks("nick");
}

function createUpcomingItem(item) {
  const card = document.createElement("article");
  card.className = "upcoming-item";
  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = item.title;
  const details = document.createElement("p");
  const startsAt = new Date(item.starts_at);
  details.textContent = [
    new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(startsAt),
    item.mode === "remote" ? "remote" : item.location
  ].filter(Boolean).join(" · ");
  const status = document.createElement("span");
  status.textContent = item.status;
  copy.append(title, details);
  card.append(copy, status);
  return card;
}

function renderMoreUpcoming(items) {
  const section = document.querySelector("[data-more-upcoming]");
  if (!items.length) {
    section.hidden = true;
    return;
  }
  document.querySelector("[data-upcoming-list]").replaceChildren(...items.map(createUpcomingItem));
  section.hidden = false;
}

async function loadUpcomingPlans() {
  if (!window.DateAppData?.enabled) {
    showEmptyPlan();
    return;
  }

  try {
    const items = await window.DateAppData.listDates();
    const upcoming = items
      .filter((item) => ["proposed", "accepted"].includes(item.status) && new Date(item.ends_at).getTime() > Date.now())
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

    if (!upcoming.length) {
      showEmptyPlan();
      return;
    }

    const next = upcoming[0];
    renderPlan({
      herName: next.recipient,
      yourName: next.proposer,
      title: next.title,
      dateTime: next.starts_at,
      duration: Math.max(0.5, (new Date(next.ends_at) - new Date(next.starts_at)) / 3600000),
      mode: next.mode,
      location: next.location,
      note: next.note
    }, next.id, next.status, false);
    renderMoreUpcoming(upcoming.slice(1));
  } catch (error) {
    console.error(error);
    showEmptyPlan();
  }
}

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

if (hasInviteParams) {
  renderPlan(config, eventId, "proposed", true);
} else {
  loadUpcomingPlans();
}

const historyList = document.querySelector("#history-list");
const historyStatus = document.querySelector("#history-status");

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
      historyStatus.textContent = "";
      return;
    }

    historyList.replaceChildren(...previousDates.map(createHistoryCard));
    historyStatus.textContent = `${previousDates.length} previous ${previousDates.length === 1 ? "date" : "dates"}`;
  } catch (error) {
    console.error(error);
    historyStatus.textContent = "Couldn’t load previous dates right now.";
  }
}

loadDateHistory();
