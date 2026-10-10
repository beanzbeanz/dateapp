const params = new URLSearchParams(window.location.search);
const answer = params.get("answer") === "no" ? "no" : "yes";
const from = params.get("from") || "kalilu";
const to = params.get("to") || "nick";
const planTitle = params.get("title") || "the date";
const originalDate = params.get("date") || "";
const eventId = params.get("event") || "";
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
const sendReply = document.querySelector("#send-reply");

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

const buildMessagesLink = (url) => `sms:&body=${encodeURIComponent(url)}`;

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

form.addEventListener("submit", async (event) => {
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
  if (eventId) url.searchParams.set("event", eventId);

  for (const [key, value] of data.entries()) {
    const cleanValue = String(value).trim();
    if (cleanValue) url.searchParams.set(key, cleanValue);
  }

  const message = String(data.get("message") || "").trim();
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "saving…";

  try {
    if (eventId && window.DateAppData?.enabled) {
      await window.DateAppData.updateDate(eventId, {
        status: answer === "yes" ? "accepted" : "declined",
        response_message: message
      });
    }

    replyLink.value = url.href;
    previewReply.href = url.href;
    sendReply.href = buildMessagesLink(url.href);
    replyResult.hidden = false;
    replyLink.focus();
    replyLink.select();
  } catch (error) {
    console.error(error);
    document.querySelector("#reply-status").textContent = "Couldn’t save the response. Try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "make reply";
  }
});
