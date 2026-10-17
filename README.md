# Date Invitation

A mobile-first date invite and shared date-history site for GitHub Pages.

Fill in the plan, date, time, length, and location. The app checks the shared
schedule before generating a recipient link.

## Supabase setup

The real `supabase-config.js` and the one-time `supabase-setup.sql` are ignored
because they contain local configuration and personal seed data. Commit
`supabase-config.example.js` and `supabase-schema.sql` instead.

For local development, copy `supabase-config.example.js` to
`supabase-config.js` and fill in the browser-safe values.

## Security note

This is a static GitHub Pages site. Anything sent to the browser can be viewed
by a visitor in page source or the network inspector, even when its source file
is ignored by Git. A Supabase **publishable** key is intended to be public and
must be protected by Row Level Security. Never use a Supabase `service_role`
key here.

The current shared-access value is only a convenience gate, not authentication.
Use Supabase Auth (or a server-side function) before treating date details and
photos as private data.

Before the first commit, run `git status --ignored` and confirm that
`supabase-config.js` and `supabase-setup.sql` appear under ignored files. If
either file was already committed, `.gitignore` will not remove its history;
remove it from tracking with `git rm --cached <filename>` and rotate any real
secret that was exposed.

## Planning update (deploy in this order)

1. Back up the database, then run `supabase-migration.sql` in Supabase SQL editor.
   It adds alternative dates, update timestamps, and a constraint preventing overlapping
   proposed/accepted plans. It preserves policies and photos. If existing plans overlap
   or have invalid end times, the transaction rolls back: correct those plans and rerun.
   The time constraint uses half-open intervals, so one plan may start when another ends.
2. Publish all HTML, CSS, and JS files together, including `common.js` and `photos.js`.
   New installs should run `supabase-schema.sql` followed by the migration.
3. Reload Safari and fully close/reopen the Home Screen app. Verify a photo selection,
   preview, save, and replacement on the actual iPhone; desktop checks cannot confirm
   the iOS native picker behavior.

Invites are now `index.html?event=<id>` and always load the latest saved plan. Old
parameter-only links remain viewable and can create shareable replies, but cannot
update a shared date. Shared dates require a working connection; failures never
silently create an unsaved invite. New invite IDs persist in drafts so an uncertain
save can be recovered without duplicate creation. Drafts are local to this browser
and device; Safari and the Home Screen app may have separate storage.

Editing a plan resets its reply and suggested day. A version check stops stale
edit/response pages from overwriting newer data. Photo changes also advance the
version, so a concurrent editor may need to reload. Calendar downloads use UTC,
stable event IDs and folded text; calendar apps decide how re-imports are handled.
History loads 12 entries at a time; upcoming plans load 20 at a time. Declined plans
have a separate paginated list. Dates and forms display the device's local timezone.

The existing shared-access gate and public photo bucket remain as described above.
This update does not introduce private authentication or delete old photo objects.

## Verification

With Playwright available in Node's module path and Google Chrome installed, run
`node tests/browser.cjs`. The suite serves local files through browser route mocks
and uses an in-memory API; it never contacts or modifies the real Supabase project.
It covers current invites/replies, pagination, draft restore, editing, acceptance,
declines, alternative dates, stale-write rejection, load recovery, conflict checking,
lost-response creation recovery, mobile/desktop overflow, and UTC calendar folding.
Set `SCREENSHOT_PATH` to save a full-page desktop preview. This does not test the SQL
against a live PostgreSQL instance or emulate iOS's native photo picker.
