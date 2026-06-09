import {
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { app } from "./firebase";

export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
}
