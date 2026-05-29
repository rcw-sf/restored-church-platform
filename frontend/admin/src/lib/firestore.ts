import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { app } from "./firebase";

export const db = getFirestore(app);

if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
}
