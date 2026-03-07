import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useStamps() {
  const { user } = useAuth();
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "stamps"), where("user_id", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setStamps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  async function collectStamp(station_cd) {
    if (!user) return;
    const already = stamps.some((s) => s.station_cd === station_cd);
    if (already) return;
    await addDoc(collection(db, "stamps"), {
      user_id: user.uid,
      station_cd,
      collected_at: serverTimestamp(),
    });
  }

  const collectedCodes = new Set(stamps.map((s) => s.station_cd));

  return { stamps, loading, collectStamp, collectedCodes };
}
