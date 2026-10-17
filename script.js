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
    clearInterval(countdownTimer);
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

  const calendar = window.DateApp.calendar({ ...config, location: locationText }, eventId);

  calendarLink.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
  calendarLink.download = `${config.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "date"}.ics`;
  calendarLink.hidden = false;
}

function renderPlan(nextConfig, nextEventId = "", status = "proposed", isInvite = false) {
  config = nextConfig;
  eventId = nextEventId;
  planDate = new Date(config.dateTime);
  validDate = Number.isFinite(planDate.getTime()) && Number.isFinite(config.duration) && config.duration > 0 && config.duration <= 48;

  const dayText = validDate ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(planDate) : "our special day";
  const dateText = validDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(planDate) : "very soon";
  const timeText = validDate ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(planDate) : "the perfect time";

  fill("[data-her-name]", config.herName);
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

  responseBox.hidden = status !== "proposed" || !validDate || planDate.getTime() <= Date.now();
  planStatus.textContent = status === "accepted" ? "accepted ♡" : status === "declined" ? "another time?" : "awaiting a reply";
  planStatus.hidden = false;
  const editLink = document.querySelector("#edit-plan");
  editLink.hidden = !eventId;
  editLink.href = window.DateApp.link("setup.html", {event: eventId});
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
  if (validDate && planDate.getTime() > Date.now() && !document.hidden) countdownTimer = setInterval(updateCountdown, 1000);
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
  const link = document.createElement("a");
  link.href = window.DateApp.link("index.html", {event: item.id});
  link.textContent = item.title;
  title.appendChild(link);
  const details = document.createElement("p");
  const startsAt = new Date(item.starts_at);
  details.textContent = [
    new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(startsAt),
    item.mode === "remote" ? "remote" : item.location
  ].filter(Boolean).join(" · ");
  const status = document.createElement("span");
  status.textContent = item.status;
  copy.append(title, details);
  if (item.alternative_date) {
    const suggestion = document.createElement("p");
    suggestion.textContent = `Suggested day: ${item.alternative_date}`;
    copy.appendChild(suggestion);
  }
  if (item.response_message) {
    const message = document.createElement("p");
    message.textContent = item.response_message;
    copy.appendChild(message);
  }
  const edit = document.createElement("a");
  edit.href = window.DateApp.link("setup.html", {event: item.id});
  edit.textContent = "edit / reschedule";
  copy.appendChild(edit);
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

const retryPlan = document.querySelector("#retry-plan");
const moreUpcoming = document.querySelector("#more-upcoming");
let upcomingOffset = 0;
let planBusy = false;
function renderSavedPlan(row) {
  renderPlan(window.DateApp.toConfig(row), row.id, row.status, hasInviteParams);
  const reply = document.querySelector("[data-plan-reply]");
  reply.textContent = [row.response_message, row.alternative_date ? `Suggested day: ${row.alternative_date}` : ""].filter(Boolean).join(" · ");
  reply.hidden = !reply.textContent;
  if (row.status === "declined") calendarLink.hidden = countdownSection.hidden = true;
}
async function loadUpcomingPlans(append = false) {
  if (planBusy) return;
  planBusy = true;
  moreUpcoming.disabled = true;
  retryPlan.hidden = true;
  if (!append) {
    planLoading.hidden = false;
    planLoading.textContent = "checking upcoming plans…";
    planCard.hidden = emptyPlan.hidden = true;
    countdownSection.hidden = true;
    clearInterval(countdownTimer);
  }
  try {
    if (eventId && hasInviteParams) {
      renderSavedPlan(await window.DateAppData.getDate(eventId));
    } else if (hasInviteParams) {
      renderPlan(config, "", "proposed", true);
    } else {
      if (!window.DateAppData.enabled) throw new Error("Shared dates aren’t connected. Check the app’s connection settings.");
      const rows = await window.DateAppData.listUpcoming(append ? upcomingOffset : 0);
      const page = rows.slice(0, 20);
      if (!append) {
        upcomingOffset = 0;
        if (page.length) renderSavedPlan(page[0]); else showEmptyPlan();
        renderMoreUpcoming(page.slice(1));
      } else document.querySelector("[data-upcoming-list]").append(...page.map(createUpcomingItem));
      upcomingOffset += page.length;
      moreUpcoming.hidden = rows.length <= 20;
      if (!moreUpcoming.hidden) document.querySelector("[data-more-upcoming]").hidden = false;
    }
  } catch (error) {
    planLoading.textContent = error.message || "Couldn’t load plans. Please retry.";
    planLoading.hidden = false;
    retryPlan.hidden = false;
    retryPlan.onclick = () => loadUpcomingPlans(append);
  } finally {
    planBusy = false;
    moreUpcoming.disabled = false;
  }
}
moreUpcoming.addEventListener("click", () => loadUpcomingPlans(true));
document.addEventListener("visibilitychange", () => {
  clearInterval(countdownTimer);
  if (!document.hidden && validDate && !planCard.hidden) {
    updateCountdown();
    if (planDate.getTime() > Date.now()) countdownTimer = setInterval(updateCountdown, 1000);
  }
});

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

loadUpcomingPlans();

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
  media.className = "history-photo";
  if (item.photo_url) {
    const image = document.createElement("img");
    image.src = item.photo_url;
    image.alt = `Photo from ${item.title}`;
    image.loading = "lazy";
    image.decoding = "async";
    media.appendChild(image);
  } else {
    media.textContent = "a memory goes here ♡";
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

  copy.appendChild(window.DateAppPhotos.createEditor(item, () => {
    card.replaceWith(createHistoryCard(item));
    historyStatus.textContent = "photo saved";
  }));
  card.append(media, copy);
  return card;
}

const moreHistory = document.querySelector("#more-history");
let historyOffset = 0;
const historyBefore = new Date().toISOString();
let historyBusy = false;
async function loadDateHistory() {
  if (historyBusy) return;
  historyBusy = true;
  moreHistory.disabled = true;
  historyStatus.textContent = "loading dates…";
  try {
    const rows = await window.DateAppData.listHistory(historyOffset, historyBefore);
    const page = rows.slice(0, 12);
    if (!historyOffset) historyList.replaceChildren();
    historyList.append(...page.map(createHistoryCard));
    historyOffset += page.length;
    historyStatus.textContent = historyOffset ? `${historyOffset} previous dates` : "No previous dates yet.";
    moreHistory.hidden = rows.length <= 12;
    moreHistory.textContent = "load older dates";
  } catch (error) {
    historyStatus.textContent = error.message || "Couldn’t load previous dates.";
    moreHistory.textContent = "retry history";
    moreHistory.hidden = false;
  } finally { historyBusy = false; moreHistory.disabled = false; }
}
moreHistory.addEventListener("click", loadDateHistory);
let declinedOffset = 0;
let declinedBusy = false;
const moreDeclined = document.querySelector("#more-declined");
async function loadDeclined() {
  if (declinedBusy) return;
  declinedBusy = true;
  moreDeclined.disabled = true;
  const status = document.querySelector("#declined-status");
  status.textContent = "loading…";
  try {
    const rows = await window.DateAppData.listDeclined(declinedOffset);
    const page = rows.slice(0, 12);
    document.querySelector("#declined-list").append(...page.map(createUpcomingItem));
    declinedOffset += page.length;
    status.textContent = declinedOffset ? "Choose a plan to propose a new time." : "No plans waiting to be rescheduled.";
    moreDeclined.hidden = rows.length <= 12;
    moreDeclined.textContent = "more plans";
  } catch (error) {
    status.textContent = error.message;
    moreDeclined.hidden = false;
    moreDeclined.textContent = "retry";
  } finally { declinedBusy = false; moreDeclined.disabled = false; }
}
moreDeclined.addEventListener("click", loadDeclined);
loadDateHistory();
loadDeclined();
