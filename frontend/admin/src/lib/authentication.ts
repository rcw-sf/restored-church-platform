import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { app } from "./firebase";

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
