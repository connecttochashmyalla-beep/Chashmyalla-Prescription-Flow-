import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const col = "kv"; // one Firestore collection holding all key/value docs

export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, col, key));
    if (!snap.exists()) return null;
    return { value: snap.data().value };
  },
  async set(key, value) {
    await setDoc(doc(db, col, key), { value, updatedAt: Date.now() });
    return { value };
  },
  subscribe(key, callback) {
    return onSnapshot(doc(db, col, key), (snap) => {
      callback(snap.exists() ? snap.data().value : null);
    });
  },
};
