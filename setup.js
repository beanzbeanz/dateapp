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
const setupParams = new URLSearchParams(window.location.search);

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

function buildLink() {
  const data = new FormData(form);
  const url = new URL("index.html", window.location.href);
  const sender = data.get("setter");
  const recipient = sender === "kalilu" ? "nick" : "kalilu";

  url.searchParams.set("her", recipient);
  url.searchParams.set("from", sender);
  data.delete("setter");

  const dateValue = data.get("date");
  const timeValue = data.get("time");
  url.searchParams.set("date", `${dateValue}T${timeValue}`);
  data.delete("date");
  data.delete("time");

  for (const [key, value] of data.entries()) {
    const cleanValue = String(value).trim();
    if (cleanValue) url.searchParams.set(key, cleanValue);
  }

  return url.href;
}

function isPhoneLikeDevice() {
  return window.matchMedia("(max-width: 760px) and (pointer: coarse)").matches
    || navigator.standalone === true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = buildLink();
  shareLink.value = url;
  previewLink.href = url;
  result.hidden = false;
  copyStatus.textContent = "";

  if (isPhoneLikeDevice() && navigator.share) {
    navigator.share({ title: "date invite", url }).catch((error) => {
      if (error.name !== "AbortError") {
        copyStatus.textContent = "couldn’t open sharing — copy the link instead";
      }
    });
  } else {
    shareLink.focus();
    shareLink.select();
  }
});

messagesLink.addEventListener("click", async () => {
  const url = shareLink.value.trim();

  if (!url) {
    copyStatus.textContent = "make the invite first";
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: "date invite", url });
      copyStatus.textContent = "shared";
    } catch (error) {
      if (error.name !== "AbortError") {
        copyStatus.textContent = "couldn’t open sharing — copy the link instead";
      }
    }
    return;
  }

  shareLink.focus();
  shareLink.select();
  copyStatus.textContent = "copy the link above to share it";
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
