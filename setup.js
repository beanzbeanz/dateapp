const form = document.querySelector('#setup-form');
const status = document.querySelector('#form-status');
const draftStatus = document.querySelector('#draft-status');
const discard = document.querySelector('#discard-draft');
const retry = document.querySelector('#retry-setup');
const submit = form.querySelector('[type=submit]');
const result = document.querySelector('#link-result');
const shareLink = document.querySelector('#share-link');
const copyStatus = document.querySelector('#copy-status');
const params = new URLSearchParams(location.search);
let eventId = params.get('event') || '';
let version = '';
let ready = false;
let busy = false;
let original = null;
let pendingCreate = null;
let draftKey = `date-plan-draft:${eventId || 'new'}`;
const app = window.DateApp;
const api = window.DateAppData;
const fields = ['setter', 'title', 'date', 'time', 'duration', 'mode', 'location', 'note'];
function values() { return Object.fromEntries(new FormData(form)); }
function fill(data) {
  for (const key of fields) if (data[key] != null) form.elements.namedItem(key).value = data[key];
  updateLocation();
}
function updateLocation() {
  const remote = form.elements.mode.value === 'remote';
  document.querySelector('#location-label').textContent = remote ? 'Call / link (optional)' : 'Location';
  form.elements.location.required = !remote;
}
function persist() {
  if (!ready || busy) return;
  const saved = app.writeDraft(draftKey, {fields: values(), version, pendingCreate});
  draftStatus.textContent = saved ? 'Draft saved on this device.' : 'Draft could not be saved on this device. Keep this page open.';
  discard.hidden = false;
}
function lock(value) { for (const el of form.elements) el.disabled = value; }
async function initialize(restore = true) {
  ready = false;
  lock(true);
  retry.hidden = true;
  status.textContent = eventId ? 'loading saved plan…' : '';
  try {
    if (eventId) {
      original = await api.getDate(eventId);
      version = original.updated_at;
      const local = app.localDateTime(original.starts_at);
      fill({setter: original.proposer, title: original.title, date: local.slice(0,10), time: local.slice(11), duration: (new Date(original.ends_at)-new Date(original.starts_at))/3600000, mode: original.mode, location: original.location, note: original.note});
      document.querySelector('#setup-heading').textContent = 'edit / reschedule';
      status.textContent = original.alternative_date ? `Suggested day: ${original.alternative_date}. Set the new date and time below.` : 'Saving changes asks for a new reply.';
    } else {
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
      fill({setter: params.get('by') === 'kalilu' ? 'kalilu' : 'nick', date: app.localDateTime(saturday).slice(0,10)});
    }
    const draft = restore && app.readDraft(draftKey);
    if (draft?.fields && (!eventId || draft.version === version)) {
      fill(draft.fields);
      pendingCreate = draft.pendingCreate || null;
      draftStatus.textContent = 'Your unsent draft was restored.';
      discard.hidden = false;
    } else if (draft?.fields) {
      draftStatus.textContent = 'This plan changed since your draft. The latest saved version is shown.';
      app.clearDraft(draftKey);
    }
    form.elements.date.min = app.localDateTime().slice(0,10);
    ready = true;
    lock(false);
  } catch (error) { status.textContent = error.message; retry.hidden = false; }
}
form.addEventListener('input', () => { result.hidden = true; updateLocation(); persist(); });
form.addEventListener('change', persist);
discard.addEventListener('click', () => {
  app.clearDraft(draftKey); pendingCreate = null; form.reset();
  draftStatus.textContent = ''; discard.hidden = true; result.hidden = true;
  initialize(false);
});
retry.addEventListener('click', () => initialize());
function validate(data) {
  const start = new Date(`${data.date}T${data.time}`);
  const duration = Number(data.duration);
  if (!app.dateOnly(data.date) || !Number.isFinite(start.getTime()) || app.localDateTime(start) !== `${data.date}T${data.time}`) throw new Error('Choose a valid date and time. That time may not exist because of daylight saving.');
  if (start.getTime() <= Date.now()) throw new Error('Choose a time in the future.');
  if (!Number.isFinite(duration) || duration < 0.25 || duration > 48) throw new Error('Choose a length between ¼ and 48 hours.');
  if (!data.title.trim()) throw new Error('Give your plan a title.');
  if (data.mode === 'in-person' && !data.location.trim()) throw new Error('Add a location.');
  return { title: data.title.trim(), starts_at: start.toISOString(), ends_at: new Date(start.getTime()+duration*3600000).toISOString(), mode: data.mode, location: data.location.trim(), note: data.note.trim(), proposer: data.setter, recipient: data.setter === 'nick' ? 'kalilu' : 'nick', status: 'proposed', response_message: '', alternative_date: null };
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!ready || busy) return;
  const data = values();
  let record;
  try { record = validate(data); } catch (error) { status.textContent = error.message; return; }
  persist(); busy = true; lock(true); discard.disabled = true; retry.hidden = true; result.hidden = true;
  status.textContent = 'checking the schedule…';
  try {
    if (!api.enabled) throw new Error('Shared dates aren’t connected. Your draft is kept; connect the app before saving.');
    // Keep the same insertion ID across network failures and reloads.
    let recovered = null;
    if (!eventId && pendingCreate) {
      try { recovered = await api.getDate(pendingCreate.id); }
      catch (error) { if (!error.message.startsWith('This date could not be found')) throw error; }
    }
    let saved;
    if (recovered) {
      saved = recovered;
      status.textContent = 'Recovered your previously saved invite. Review it before making further edits.';
    } else {
      const conflicts = await api.findConflicts(record.starts_at, record.ends_at, eventId);
      if (conflicts.length) throw new Error(`${conflicts[0].title} is planned for ${app.formatDate(conflicts[0].starts_at)}. Choose another time.`);
      if (eventId) {
        // Preserve an existing answer if there were no plan changes.
        const same = ['title','starts_at','ends_at','mode','location','note','proposer','recipient'].every(key => key.endsWith('_at') ? new Date(record[key]).getTime() === new Date(original[key]).getTime() : record[key] === original[key]);
        saved = same ? await api.getDate(eventId) : await api.updateDate(eventId, record, version);
      } else {
        if (!pendingCreate) pendingCreate = {id: crypto.randomUUID()};
        app.writeDraft(draftKey, {fields: data, version, pendingCreate});
        saved = await api.createDate({...record, id: pendingCreate.id});
      }
      status.textContent = 'Invite saved. Choose how to share it below.';
    }
    app.clearDraft(draftKey);
    eventId = saved.id; version = saved.updated_at; original = saved; pendingCreate = null;
    draftKey = `date-plan-draft:${eventId}`;
    history.replaceState(null, '', app.link('setup.html', {event: eventId}));
    const local = app.localDateTime(saved.starts_at);
    fill({setter:saved.proposer,title:saved.title,date:local.slice(0,10),time:local.slice(11),duration:(new Date(saved.ends_at)-new Date(saved.starts_at))/3600000,mode:saved.mode,location:saved.location,note:saved.note});
    draftStatus.textContent = ''; discard.hidden = true;
    const url = app.link('index.html', {event: eventId});
    shareLink.value = url;
    document.querySelector('#preview-link').href = url;
    document.querySelector('#messages-link').href = app.messagesLink(url);
    result.hidden = false; copyStatus.textContent = '';
  } catch (error) {
    status.textContent = error.message || 'Couldn’t save. Your draft is kept; please retry.';
    if (eventId) retry.hidden = false;
  } finally { busy = false; lock(false); discard.disabled = false; }
});
document.querySelector('#copy-link').addEventListener('click', () => app.copy(shareLink, copyStatus));
app.shareButton(document.querySelector('#share-invite'), shareLink, copyStatus);
initialize();
