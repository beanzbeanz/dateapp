const dateAppConfig = window.DateAppConfig || {};
const dataEnabled = Boolean(
  dateAppConfig.supabaseUrl
  && dateAppConfig.supabaseAnonKey
  && !dateAppConfig.supabaseAnonKey.startsWith("PASTE_")
);

const dataHeaders = (extra = {}) => ({
  apikey: dateAppConfig.supabaseAnonKey,
  Authorization: `Bearer ${dateAppConfig.supabaseAnonKey}`,
  "x-couple-key": dateAppConfig.coupleKey,
  ...extra
});

async function dataRequest(path, options = {}) {
  if (!dataEnabled) throw new Error("Shared dates are not connected yet.");
  const response = await fetch(`${dateAppConfig.supabaseUrl}${path}`, {
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
    ...options,
    headers: dataHeaders(options.headers)
  });

  if (!response.ok) {
    const detail = await response.text();
    let code;
    try { code = JSON.parse(detail).code; } catch {}
    if (code === "23P01") throw new Error("That time overlaps another plan. Choose another time.");
    if (code === "PGRST204" || code === "42703") throw new Error("The database needs the planning update. Run supabase-migration.sql before saving.");
    throw new Error(`Couldn’t reach shared dates (${response.status}). Please retry.`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const dateFields = "id,title,starts_at,ends_at,mode,location,note,proposer,recipient,status,response_message,alternative_date,photo_url,updated_at";
async function getDate(id) {
  const query = new URLSearchParams({select: dateFields, id: `eq.${id}`, limit: "1"});
  const rows = await dataRequest(`/rest/v1/dates?${query}`);
  if (!rows[0]) throw new Error("This date could not be found. Return to your plans or check the link.");
  return rows[0];
}
async function listUpcoming(offset = 0) {
  const query = new URLSearchParams({select: dateFields, ends_at: `gt.${new Date().toISOString()}`, status: "in.(proposed,accepted)", order: "starts_at.asc,id.asc", limit: "21", offset: String(offset)});
  return dataRequest(`/rest/v1/dates?${query}`);
}
async function listHistory(offset = 0, before = new Date().toISOString()) {
  const query = new URLSearchParams({select: dateFields, ends_at: `lte.${before}`, status: "eq.accepted", order: "starts_at.desc,id.desc", limit: "13", offset: String(offset)});
  return dataRequest(`/rest/v1/dates?${query}`);
}
async function listDeclined(offset = 0) {
  const query = new URLSearchParams({select: dateFields, status: "eq.declined", order: "updated_at.desc,id.asc", limit: "13", offset: String(offset)});
  return dataRequest(`/rest/v1/dates?${query}`);
}

async function findConflicts(startsAt, endsAt, excludeId = "") {
  const query = new URLSearchParams({
    select: "id,title,starts_at,ends_at,status",
    limit: "1",
    starts_at: `lt.${endsAt}`,
    ends_at: `gt.${startsAt}`,
    status: "in.(proposed,accepted)"
  });
  if (excludeId) query.set("id", `neq.${excludeId}`);
  return dataRequest(`/rest/v1/dates?${query}`);
}

async function createDate(record) {
  const rows = await dataRequest("/rest/v1/dates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(record)
  });
  if (!rows[0]) throw new Error("Nothing was saved. The date may have changed; reload it before trying again.");
  return rows[0];
}

async function updateDate(id, changes, version = "") {
  const query = new URLSearchParams({id: `eq.${id}`});
  if (version) query.set("updated_at", `eq.${version}`);
  const rows = await dataRequest(`/rest/v1/dates?${query}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(changes)
  });
  if (!rows[0]) throw new Error("Nothing was saved. The date may have changed; reload it before trying again.");
  return rows[0];
}

async function uploadDatePhoto(dateId, file) {
  if (!dataEnabled) throw new Error("Shared dates are not connected yet.");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" })[file.type];
  if (!extension || !file.size || file.size > 8 * 1024 * 1024) {
    throw new Error("Choose a supported photo under 8 MB.");
  }
  const uploadBody = new Blob([await file.arrayBuffer()], { type: file.type });
  const filename = `${crypto.randomUUID()}.${extension || "jpg"}`;
  const path = `${dateAppConfig.coupleKey}/${dateId}/${filename}`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${dateAppConfig.supabaseUrl}/storage/v1/object/date-photos/${encodedPath}`, {
    method: "POST",
    headers: dataHeaders({
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "false"
    }),
    body: uploadBody,
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) throw new Error(await response.text());
  return `${dateAppConfig.supabaseUrl}/storage/v1/object/public/date-photos/${encodedPath}`;
}

window.DateAppData = {
  enabled: dataEnabled,
  getDate,
  listUpcoming,
  listHistory,
  listDeclined,
  findConflicts,
  createDate,
  updateDate,
  uploadDatePhoto
};
