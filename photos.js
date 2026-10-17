// Keep the actual file inputs mounted and directly tappable in iOS standalone mode.
window.DateAppPhotos = (() => {
  const MAX_SOURCE = 40 * 1024 * 1024;
  const MAX_UPLOAD = 8 * 1024 * 1024;

  async function prepare(file) {
    if (!file.size) throw new Error("That photo is empty. Download it to your phone and choose it again.");
    if (file.size > MAX_SOURCE) throw new Error("Choose a photo smaller than 40 MB.");
    const type = file.type || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" }[file.name.split(".").pop().toLowerCase()]);
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(type)) {
      throw new Error("Choose a JPEG, PNG, WebP, or HEIC photo.");
    }
    // A fresh memory-backed Blob avoids Safari uploading an unreadable temporary File.
    const source = new Blob([await file.arrayBuffer()], { type });
    const url = URL.createObjectURL(source);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!result || result.size > MAX_UPLOAD) throw new Error("conversion");
      return result;
    } catch {
      throw new Error("This photo couldn’t be prepared. Try a JPEG or a screenshot saved in Photos.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function createEditor(item, onSaved) {
    const panel = document.createElement("div");
    panel.className = "photo-editor";
    const status = document.createElement("p");
    status.className = "photo-status";
    status.setAttribute("role", "status");
    const preview = document.createElement("img");
    preview.className = "photo-preview";
    preview.alt = "Selected photo preview";
    preview.hidden = true;
    const actions = document.createElement("div");
    actions.className = "photo-actions";
    actions.hidden = true;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "button button-primary";
    save.textContent = "save photo";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "button button-secondary";
    cancel.textContent = "cancel";
    actions.append(save, cancel);
    let pending = null;
    let previewUrl = "";
    let uploadedUrl = "";
    let busy = false;
    const inputs = [];
    const setBusy = (value) => {
      busy = value;
      inputs.forEach((input) => { input.disabled = value; });
      save.disabled = cancel.disabled = value;
      panel.setAttribute("aria-busy", String(value));
    };
    const reset = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = "";
      pending = null;
      uploadedUrl = "";
      preview.removeAttribute("src");
      preview.hidden = actions.hidden = true;
      inputs.forEach((input) => { input.value = ""; });
    };
    const pick = async (event) => {
      if (busy) return;
      const file = event.target.files?.[0];
      if (!file) return;
      reset();
      setBusy(true);
      status.textContent = "preparing photo…";
      try {
        pending = await prepare(file);
        previewUrl = URL.createObjectURL(pending);
        preview.src = previewUrl;
        preview.hidden = actions.hidden = false;
        save.textContent = "save photo";
        status.textContent = "Ready to save. Your existing photo stays until this one is saved.";
      } catch (error) {
        status.textContent = error.message || "Couldn’t read that photo. Try choosing it from Files.";
      } finally {
        setBusy(false);
      }
    };
    const makeInput = (text, accept) => {
      const label = document.createElement("label");
      label.className = "photo-picker";
      const caption = document.createElement("span");
      caption.textContent = text;
      const input = document.createElement("input");
      input.type = "file";
      if (accept) input.accept = accept;
      input.setAttribute("aria-label", `${text} for ${item.title}`);
      input.addEventListener("change", pick);
      input.addEventListener("cancel", () => {
        status.textContent = pending ? "Your preview is still ready to save." : "No photo selected. If Photos returns nothing, try a picture saved in Files → On My iPhone.";
      });
      inputs.push(input);
      label.append(caption, input);
      return label;
    };
    panel.append(makeInput(item.photo_url ? "replace photo" : "add a photo", "image/*"));
    const fallback = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Photo picker not working?";
    const help = document.createElement("p");
    help.textContent = "In Photos, use Share → Save to Files → On My iPhone. Then choose that file below. You can also open this same date site in Safari to upload; saved photos appear here too.";
    fallback.append(summary, help, makeInput("choose a file", ""));
    panel.append(fallback, preview, actions, status);
    cancel.addEventListener("click", () => { reset(); status.textContent = "Photo selection cancelled."; });
    save.addEventListener("click", async () => {
      if (!pending || busy) return;
      setBusy(true);
      status.textContent = "uploading photo…";
      try {
        // If saving the date fails, retry that step without uploading another copy.
        if (!uploadedUrl) uploadedUrl = await window.DateAppData.uploadDatePhoto(item.id, pending);
        status.textContent = "saving photo to date…";
        const saved = await window.DateAppData.updateDate(item.id, { photo_url: uploadedUrl });
        if (!saved) throw new Error("Date was not updated");
        item.photo_url = uploadedUrl;
        reset();
        onSaved();
      } catch (error) {
        console.error(error);
        status.textContent = uploadedUrl ? "Photo uploaded, but couldn’t be saved to the date. Tap Retry save." : "Couldn’t upload the photo. Check your connection and tap Retry save.";
        save.textContent = "retry save";
      } finally {
        setBusy(false);
      }
    });
    return panel;
  }
  return { prepare, createEditor };
})();
