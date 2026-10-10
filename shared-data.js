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
    ...options,
    headers: dataHeaders(options.headers)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function listDates() {
  return dataRequest("/rest/v1/dates?select=*&order=starts_at.asc");
}

async function findConflicts(startsAt, endsAt, excludeId = "") {
  const query = new URLSearchParams({
    select: "id,title,starts_at,ends_at,status",
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
  return rows[0];
}

async function updateDate(id, changes) {
  const rows = await dataRequest(`/rest/v1/dates?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(changes)
  });
  return rows[0];
}

async function uploadDatePhoto(dateId, file) {
  if (!dataEnabled) throw new Error("Shared dates are not connected yet.");
  const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const filename = `${crypto.randomUUID()}.${extension || "jpg"}`;
  const path = `${dateAppConfig.coupleKey}/${dateId}/${filename}`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${dateAppConfig.supabaseUrl}/storage/v1/object/date-photos/${encodedPath}`, {
    method: "POST",
    headers: dataHeaders({
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "false"
    }),
    body: file
  });

  if (!response.ok) throw new Error(await response.text());
  return `${dateAppConfig.supabaseUrl}/storage/v1/object/public/date-photos/${encodedPath}`;
}

window.DateAppData = {
  enabled: dataEnabled,
  listDates,
  findConflicts,
  createDate,
  updateDate,
  uploadDatePhoto
};
