const params = new URLSearchParams(window.location.search);
const answer = params.get("answer") === "no" ? "no" : "yes";
const from = params.get("from") || "kalilu";
const to = params.get("to") || "nick";
const planTitle = params.get("title") || "the date";
const originalDate = params.get("date") || "";
const isReplyView = params.get("view") === "1";

const heading = answer === "yes" ? "Yes!!!" : "Maybe another time";
document.title = heading;
document.querySelector("[data-response-heading]").textContent = heading;
document.querySelector("[data-response-from]").textContent = `${from} replied`;
document.querySelector("[data-original-title]").textContent = planTitle;

const form = document.querySelector("#response-form");
const rescheduleField = document.querySelector("[data-reschedule-field]");
const freeDateInput = document.querySelector("#free-date");
const replyResult = document.querySelector("#reply-result");
const replyLink = document.querySelector("#reply-link");
const previewReply = document.querySelector("#preview-reply");
const replyStatus = document.querySelector("#reply-status");

if (answer === "no") {
  rescheduleField.hidden = false;
  freeDateInput.required = true;
}

const formatFreeDate = (value) => {
  const freeDate = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(freeDate);
};

const buildMessagesLink = (url) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const separator = isIOS ? "&" : "?";
  return `sms:${separator}body=${encodeURIComponent(url)}`;
};

if (isReplyView) {
  form.hidden = true;
  const message = params.get("message") || "";
  const freeDate = params.get("free") || "";

  if (answer === "no" && freeDate) {
    const freeText = document.querySelector("[data-response-free]");
    freeText.textContent = `I’m free ${formatFreeDate(freeDate)}.`;
    freeText.hidden = false;
  }

  if (message) {
    const messageText = document.querySelector("[data-response-message]");
    messageText.textContent = message;
    messageText.hidden = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const url = new URL("response.html", window.location.href);
  url.search = "";
  url.searchParams.set("view", "1");
  url.searchParams.set("answer", answer);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("title", planTitle);
  if (originalDate) url.searchParams.set("date", originalDate);

  for (const [key, value] of data.entries()) {
    const cleanValue = String(value).trim();
    if (cleanValue) url.searchParams.set(key, cleanValue);
  }

  replyLink.value = url.href;
  previewReply.href = url.href;
  replyResult.hidden = false;
  replyLink.focus();
  replyLink.select();
});

document.querySelector("#send-reply").addEventListener("click", () => {
  const url = replyLink.value.trim();

  if (!url) {
    replyStatus.textContent = "make the reply first";
    return;
  }

  replyStatus.textContent = `opening Messages for ${to}…`;
  window.location.href = buildMessagesLink(url);
});
