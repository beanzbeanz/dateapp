const params = new URLSearchParams(location.search);
const eventId = params.get('event') || '';
const isReplyView = params.get('view') === '1';
let answer = params.get('answer') === 'no' ? 'no' : 'yes';
const app = window.DateApp;
const api = window.DateAppData;
const form = document.querySelector('#response-form');
const status = document.querySelector('#reply-status');
const retry = document.querySelector('#retry-response');
const result = document.querySelector('#reply-result');
const replyLink = document.querySelector('#reply-link');
const submit = form.querySelector('[type=submit]');
let row = null;
let ready = !eventId;
let busy = false;
function lock(value) { for (const el of form.elements) el.disabled = value; }
function render(message = '', free = '') {
  const heading = isReplyView && row?.status === 'proposed' ? 'Awaiting a reply' : answer === 'yes' ? 'Yes!!!' : 'Maybe another time';
  document.title = heading;
  document.querySelector('[data-response-heading]').textContent = heading;
  document.querySelector('[data-response-from]').textContent = `${row?.recipient || params.get('from') || 'kalilu'}${isReplyView ? ' replied' : '’s reply'}`;
  document.querySelector('[data-original-title]').textContent = row ? `${row.title} · ${app.formatDate(row.starts_at)}` : params.get('title') || 'the date';
  document.querySelector('[data-reschedule-field]').hidden = answer !== 'no';
  form.elements.free.min = app.localDateTime().slice(0,10);
  form.hidden = isReplyView;
  const messageEl = document.querySelector('[data-response-message]');
  const freeEl = document.querySelector('[data-response-free]');
  messageEl.textContent = message;
  messageEl.hidden = !isReplyView || !message;
  freeEl.textContent = app.dateOnly(free) ? `I’m free ${new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date(`${free}T12:00:00`))}.` : '';
  freeEl.hidden = !isReplyView || !freeEl.textContent;
  document.querySelector('#back-plan').href = app.link('index.html', eventId ? {event:eventId} : {});
}
async function load() {
  ready = false; lock(true); retry.hidden = true; result.hidden = true;
  if (eventId) status.textContent = 'loading current plan…';
  try {
    if (eventId) {
      row = await api.getDate(eventId);
      if (isReplyView) answer = row.status === 'declined' ? 'no' : 'yes';
      render(isReplyView ? row.response_message : '', isReplyView ? row.alternative_date || '' : '');
      if (!isReplyView && new Date(row.starts_at).getTime() <= Date.now()) throw new Error('This date has already started. Open the plan to reschedule it.');
      if (!isReplyView && row.status !== 'proposed') throw new Error('This plan already has a reply. Open the plan to review or reschedule it.');
      form.elements.message.value = row.response_message || '';
      form.elements.free.value = row.alternative_date || '';
      status.textContent = isReplyView && row.status === 'proposed' ? 'The plan changed and needs a new reply.' : '';
    } else {
      render(isReplyView ? params.get('message') || '' : '', isReplyView ? params.get('free') || '' : '');
      status.textContent = 'This older link is not connected to a saved date. Replies can be shared by link only.';
    }
    ready = true; lock(false);
  } catch (error) { status.textContent = error.message; retry.hidden = false; }
}
retry.addEventListener('click', load);
form.addEventListener('input', () => { result.hidden = true; });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!ready || busy || isReplyView) return;
  const message = form.elements.message.value.trim();
  const free = answer === 'no' ? form.elements.free.value : '';
  if (free && (!app.dateOnly(free) || free < app.localDateTime().slice(0,10))) { status.textContent = 'Choose today or a future alternative date.'; return; }
  busy = true; lock(true); result.hidden = true; status.textContent = 'saving reply…';
  try {
    if (eventId) {
      if (new Date(row.starts_at).getTime() <= Date.now()) throw new Error('This date has already started. Open the plan to reschedule it.');
      if (answer === 'yes') {
        const conflicts = await api.findConflicts(row.starts_at, row.ends_at, eventId);
        if (conflicts.length) throw new Error(`This overlaps ${conflicts[0].title}. Open the plan to reschedule.`);
      }
      row = await api.updateDate(eventId, {status:answer === 'yes' ? 'accepted' : 'declined', response_message:message, alternative_date:free || null}, row.updated_at);
    }
    const url = app.link('response.html', eventId ? {event:eventId,view:1} : {view:1,answer,from:params.get('from') || 'kalilu',to:params.get('to') || 'nick',title:params.get('title') || 'the date',message,free});
    replyLink.value = url;
    document.querySelector('#preview-reply').href = url;
    document.querySelector('#send-reply').href = app.messagesLink(url);
    result.hidden = false;
    status.textContent = eventId ? 'Reply saved. You can share it below.' : 'Reply link ready. Share it below.';
    if (eventId) { ready = false; form.hidden = true; }
  } catch (error) {
    status.textContent = error.message || 'Couldn’t save your reply. Please retry.';
    retry.hidden = !eventId;
  } finally { busy = false; if (ready) lock(false); }
});
document.querySelector('#copy-reply').addEventListener('click', () => app.copy(replyLink, status));
app.shareButton(document.querySelector('#share-reply'), replyLink, status);
load();
