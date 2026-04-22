import admin from "firebase-admin";

export class FirebaseAdmin {
  private adminApp: admin.app.App;

  constructor() {
    this.adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  firestore() {
    return this.adminApp.firestore();
  }
}
