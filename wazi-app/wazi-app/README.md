# WAZI — vacant houses across Kenya

A small rental marketplace: tenants browse vacant houses with real
distances to schools, hospitals, police posts, roads and industry; owners
post listings with a required whole-premise photo plus optional interior
photos. Owners and tenants get notifications when a house matching their
saved preferences goes vacant.

```
wazi-app/
├── frontend/    Angular web app — talks directly to Firebase
├── mobile/      Flutter Android app — talks directly to the same Firebase project
├── firebase/    Firestore/Storage security rules, the notification Cloud Function,
│                and firebase.json (hosting + deploy config)
├── data/        kenya_towns.json — every urban centre in Kenya, by county (source of truth)
├── tools/       gen_towns.py — regenerates the town lists for the web + mobile apps
├── branding/    WAZI logo (SVG) and make_icons.py, which renders the app icons
├── legacy-backend/   The original Node.js REST API — kept for reference, no longer used
└── legacy-web/       The original plain HTML/JS web app — superseded by frontend/
```

Both apps talk **directly to Firebase** (Authentication, Firestore,
Storage) — there's no custom server to run or deploy for day-to-day use.
The one bit of server-side logic (matching a newly-vacant listing against
every tenant's saved alert and writing their notifications) runs as a
single Cloud Function, since that needs elevated read access clients
shouldn't have.

## Android APK from GitHub

Pushing to `main` builds an installable APK (Android 6.0+) and attaches it to the
workflow run — setup is in `mobile/README.md` ("Automatic APK builds").

## Order of setup

1. **`firebase/README.md`** — create the Firebase project, enable
   Authentication/Firestore/Storage, deploy the security rules and the
   Cloud Function. Do this first; both apps need it.
2. **`frontend/README.md`** — scaffold the Angular app, copy this repo's
   source in, add your Firebase web config, run it.
3. **`mobile/README.md`** — scaffold the Flutter app, connect it to the
   same Firebase project (via `flutterfire configure` or manually), run it.

## Why no backend server anymore

Earlier versions of this project (see `legacy-backend/`) shipped a small
Node.js REST API with a JSON file as its database. Now that both clients
talk to Firebase directly:

- **Auth** — Firebase Authentication (email/password) replaces the custom
  token system.
- **Data** — Cloud Firestore replaces `db.json`. `firestore.rules` in the
  `firebase/` folder enforces who can read/write what (e.g. only a
  listing's owner can edit or delete it) — the same job the old server's
  route handlers were doing, just declaratively.
- **Photos** — Firebase Storage replaces the local `uploads/` folder.
- **Notifications** — the `notifyMatchingTenants` Cloud Function replaces
  the old server's in-process matching logic, triggered automatically by
  Firestore writes instead of being called from route handlers.
- **Monitoring** — the Firebase Console gives you user counts, Firestore/
  Storage usage, and Cloud Function logs out of the box (see "Monitoring"
  in `firebase/README.md`) — no separate ops setup needed.

The `legacy-backend/` folder is left in place only as a reference for the
data model and matching logic it used to run; you don't need to run it for
anything in the current setup. `legacy-web/` is the plain HTML/JS app that
predated the Angular rewrite — same reasoning, kept only for reference.

## Security rules, briefly

- Anyone (even signed out) can browse listings; only the owner who created
  a listing can edit or delete it.
- A tenant's saved preferences and notifications are private to that tenant.
- Notifications can only be created by the Cloud Function (Admin SDK
  bypasses rules) — clients can read their own and mark them read, nothing
  more.

See the comments in `firebase/firestore.rules` and `firebase/storage.rules`
for the full picture, including the one known gap (Storage uploads aren't
strictly tied to listing ownership yet) and how to close it.
