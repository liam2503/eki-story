import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, increment, arrayUnion } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "social_posts"),
      orderBy("posted_at", "desc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        const fallback = query(collection(db, "social_posts"), limit(50));
        onSnapshot(fallback, (snap) => {
          const sorted = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.posted_at?.seconds ?? 0) - (a.posted_at?.seconds ?? 0));
          setPosts(sorted);
          setLoading(false);
        });
      }
    );
    return unsubscribe;
  }, [user]);

  async function likePost(post_id) {
    if (!user) return;
    const post = posts.find((p) => p.id === post_id);
    if (post?.liked_by?.includes(user.uid)) return; // already liked
    await updateDoc(doc(db, "social_posts", post_id), {
      like_count: increment(1),
      liked_by: arrayUnion(user.uid),
    });
  }

  return { posts, loading, likePost };
}
