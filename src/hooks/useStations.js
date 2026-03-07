import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export function useStations(line_cd = null) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!line_cd) { setStations([]); setLoading(false); return; }
    async function fetch() {
      setLoading(true);
      const q = query(
        collection(db, "stations"),
        where("line_cd", "==", line_cd)
      );
      const snap = await getDocs(q);
      setStations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    fetch();
  }, [line_cd]);

  return { stations, loading };
}

export function useLines() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const snap = await getDocs(collection(db, "lines"));
      setLines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    fetch();
  }, []);

  return { lines, loading };
}
