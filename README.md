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
