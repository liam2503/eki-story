import { useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export function useTrainModels() {
  const [loading, setLoading] = useState(false);

  async function fetchModel(modelName) {
    setLoading(true);
    const cacheRef = doc(db, "train_models", modelName);
    const cached = await getDoc(cacheRef);

    if (cached.exists()) {
      setLoading(false);
      return cached.data();
    }

    // Fetch from Wikipedia API
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(modelName)}`;
    const res = await fetch(url);
    const data = await res.json();

    const model = {
      name: data.title,
      description: data.extract || "",
      wikipedia_url: data.content_urls?.desktop?.page || "",
      cached_at: serverTimestamp(),
    };

    await setDoc(cacheRef, model);
    setLoading(false);
    return model;
  }

  return { fetchModel, loading };
}
