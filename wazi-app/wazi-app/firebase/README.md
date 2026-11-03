# WAZI Firebase project

This folder holds the Firebase project configuration: Firestore security
rules, Storage security rules, and the one Cloud Function that fans out
vacancy notifications. It's shared by both the Angular web app and the
Flutter mobile app.

## 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Once created, click **Build → Authentication → Get started**, enable the
   **Email/Password** sign-in provider.
3. Click **Build → Firestore Database → Create database**. Start in
   production mode (the rules in this folder replace the defaults anyway).
   Pick a region close to your users (e.g. `europe-west1` or a nearby region — Firebase doesn't currently have an Africa region, so pick the closest available).
4. Click **Build → Storage → Get started**. Same region as Firestore.
5. Register a **Web app** (the `</>` icon on the project overview page) to
   get the `firebaseConfig` object for the Angular app, and register an
   **Android app** (package name `com.wazi.wazi`, or whatever you used with
   `flutter create --org`) to download `google-services.json` for Flutter.

## 2. Install the Firebase CLI and log in

```
npm install -g firebase-tools
firebase login
```

From this `firebase/` folder:

```
firebase use --add
```

and pick the project you just created.

## 3. Install the Cloud Function's dependencies

```
cd functions
npm install
cd ..
```

## 4. Deploy rules and the function

```
firebase deploy --only firestore:rules,storage:rules,functions
```

## 5. Deploy hosting (after building the Angular app — see `../frontend/README.md`)

```
firebase deploy --only hosting
```

Or deploy everything at once:

```
firebase deploy
```

## Monitoring

Once deployed, the Firebase Console gives you, out of the box:

- **Authentication → Users** — every sign-up, with last sign-in time
- **Firestore → Usage** and **Storage → Usage** — read/write/delete counts and storage size, with a free-tier quota dashboard
- **Functions → Logs** and **Functions → Dashboard** — every
  `notifyMatchingTenants` invocation, its duration, and any errors
- **Hosting → Usage** — bandwidth and request counts for the web app

No separate monitoring setup needed — this is what "deploy and monitor on
Firebase" gets you for free.

## Local testing with the emulator suite (optional but recommended)

Before deploying rule or function changes, you can test locally:

```
firebase init emulators   # first time only — pick Auth, Firestore, Storage, Functions
firebase emulators:start
```

Then point the Angular app's `environment.ts` at the emulator ports (the
Firebase JS SDK's `connectAuthEmulator` / `connectFirestoreEmulator` /
`connectStorageEmulator` functions) if you want to develop against local
emulated data instead of the real project — not required to get started,
just useful once you're iterating on rules or the Cloud Function.
