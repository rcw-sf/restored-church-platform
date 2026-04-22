import { FirebaseAdmin } from "../config/firebase";

export async function commitInChunks<T>(
  firebaseAdmin: FirebaseAdmin,
  items: T[],
  fn: (batch: FirebaseFirestore.WriteBatch, item: T) => void,
) {
  const CHUNK_SIZE = 500;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = firebaseAdmin.firestore().batch();
    const chunk = items.slice(i, i + CHUNK_SIZE);

    for (const item of chunk) {
      fn(batch, item);
    }

    await batch.commit();
  }
}
