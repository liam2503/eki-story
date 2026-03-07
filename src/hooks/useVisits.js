import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useVisits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "visits"), where("user_id", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // Returns the visit object if already visited, otherwise null
  function getVisit(station_cd) {
    return visits.find((v) => v.station_cd === station_cd) ?? null;
  }

  async function logVisit(station_cd, note = "", stationName = "", line_cd = "", is_public = true) {
    if (!user || getVisit(station_cd)) return;
    const visitRef = await addDoc(collection(db, "visits"), {
      user_id: user.uid,
      station_cd,
      station_name: stationName,
      line_cd,
      note,
      is_public,
      visited_at: serverTimestamp(),
    });
    // Create social post
    if (is_public) {
      await addDoc(collection(db, "social_posts"), {
        user_id: user.uid,
        display_name: user.displayName || user.email,
        ref_type: "visit",
        ref_id: visitRef.id,
        station_name: stationName,
        note,
        like_count: 0,
        posted_at: serverTimestamp(),
      });
    }
  }

  async function removeVisit(station_cd) {
    const visit = getVisit(station_cd);
    if (!visit) return;
    await deleteDoc(doc(db, "visits", visit.id));
  }

  const visitedStationCodes = new Set(visits.map((v) => v.station_cd));

  return { visits, loading, logVisit, removeVisit, getVisit, visitedStationCodes };
}
