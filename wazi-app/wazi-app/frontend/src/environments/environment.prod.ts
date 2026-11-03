// Same Firebase web config as environment.ts — these values aren't secret
// (Firebase access control happens in firestore.rules / storage.rules, not
// by hiding this config). Keeping both files lets you point prod at a
// different Firebase project later if you ever want separate dev/prod projects.
export const environment = {
  production: true,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
