const form = document.querySelector("#setup-form");
const result = document.querySelector("#link-result");
const shareLink = document.querySelector("#share-link");
const previewLink = document.querySelector("#preview-link");
const messagesLink = document.querySelector("#messages-link");
const copyButton = document.querySelector("#copy-link");
const copyStatus = document.querySelector("#copy-status");
const modeSelect = document.querySelector("#mode");
const locationInput = document.querySelector("#location");
const locationLabel = document.querySelector("#location-label");
const formStatus = document.querySelector("#form-status");
const submitButton = form.querySelector('button[type="submit"]');
const setupParams = new URLSearchParams(window.location.search);
let currentEventId = "";

const requestedSetter = (setupParams.get("by") || setupParams.get("from") || setupParams.get("with") || "nick").toLowerCase();
const selectedSetter = requestedSetter === "kalilu" ? "kalilu" : "nick";
document.querySelector(`#setter-${selectedSetter}`).checked = true;

const nextSaturday = new Date();
nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
const timezoneOffset = nextSaturday.getTimezoneOffset() * 60000;
document.querySelector("#date").value = new Date(nextSaturday.getTime() - timezoneOffset).toISOString().slice(0, 10);

function updateLocationField() {
  const isRemote = modeSelect.value === "remote";
  locationLabel.textContent = isRemote ? "Call / link (optional)" : "Location";
  locationInput.placeholder = "";
  locationInput.required = !isRemote;
}

modeSelect.addEventListener("change", updateLocationField);
updateLocationField();

function getPlanData() {
  const data = new FormData(form);
  const sender = data.get("setter");
  const recipient = sender === "kalilu" ? "nick" : "kalilu";
  const dateValue = String(data.get("date") || "");
  const timeValue = String(data.get("time") || "");
  const startsAt = new Date(`${dateValue}T${timeValue}`);
  const durationHours = Number(data.get("duration")) || 2;
  const endsAt = new Date(startsAt.getTime() + (durationHours * 60 * 60 * 1000));

  return {
    sender,
    recipient,
    startsAt,
    endsAt,
    dateValue,
    timeValue,
    durationHours,
    title: String(data.get("title") || "").trim(),
    mode: String(data.get("mode") || "in-person"),
    location: String(data.get("location") || "").trim(),
    note: String(data.get("note") || "").trim()
  };
}

function buildLink(plan, eventId = "") {
  const url = new URL("index.html", window.location.href);

  url.searchParams.set("her", plan.recipient);
  url.searchParams.set("from", plan.sender);
  url.searchParams.set("date", `${plan.dateValue}T${plan.timeValue}`);
  url.searchParams.set("duration", String(plan.durationHours));
  url.searchParams.set("title", plan.title);
  url.searchParams.set("mode", plan.mode);
  if (plan.location) url.searchParams.set("location", plan.location);
  if (plan.note) url.searchParams.set("note", plan.note);
  if (eventId) url.searchParams.set("event", eventId);

  return url.href;
}

function isPhoneLikeDevice() {
  return window.matchMedia("(max-width: 760px) and (pointer: coarse)").matches
    || navigator.standalone === true;
}

function buildMessagesLink(url) {
  return `sms:&body=${encodeURIComponent(url)}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const plan = getPlanData();
  formStatus.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "checking…";

  try {
    if (window.DateAppData?.enabled) {
      const conflicts = await window.DateAppData.findConflicts(
        plan.startsAt.toISOString(),
        plan.endsAt.toISOString(),
        currentEventId
      );

      if (conflicts.length) {
        const conflict = conflicts[0];
        const conflictTime = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date(conflict.starts_at));
        formStatus.textContent = `${conflict.title} is already planned for ${conflictTime}. Pick another time.`;
        return;
      }

      const record = {
        title: plan.title,
        starts_at: plan.startsAt.toISOString(),
        ends_at: plan.endsAt.toISOString(),
        mode: plan.mode,
        location: plan.location,
        note: plan.note,
        proposer: plan.sender,
        recipient: plan.recipient,
        status: "proposed"
      };

      if (currentEventId) {
        await window.DateAppData.updateDate(currentEventId, record);
      } else {
        const created = await window.DateAppData.createDate(record);
        currentEventId = created.id;
      }
    }

    const url = buildLink(plan, currentEventId);
    const messagesUrl = buildMessagesLink(url);
    shareLink.value = url;
    previewLink.href = url;
    messagesLink.href = messagesUrl;
    result.hidden = false;
    copyStatus.textContent = "";

    if (isPhoneLikeDevice()) {
      window.location.href = messagesUrl;
    } else {
      shareLink.focus();
      shareLink.select();
    }
  } catch (error) {
    formStatus.textContent = "Couldn’t check the schedule. Try again in a second.";
    console.error(error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "send invite";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    copyStatus.textContent = "copied";
  } catch {
    shareLink.focus();
    shareLink.select();
    copyStatus.textContent = "select the link and copy it";
  }
});
