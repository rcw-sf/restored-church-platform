import admin from "firebase-admin";
import { getEnvironment } from "../env.js";

export class FirebaseAdmin {
  private adminApp: admin.app.App;

  constructor() {
    const { firebaseProjectId } = getEnvironment();
    this.adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseProjectId,
    });
    this.adminApp.firestore().settings({ ignoreUndefinedProperties: true });
  }

  firestore() {
    return this.adminApp.firestore();
  }
}
