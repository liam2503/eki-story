import { useNavigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar";
import BottomNav from "../components/layout/BottomNav";
import PostCard from "../components/feed/PostCard";
import { useFeed } from "../hooks/useFeed";

export default function Feed() {
  const navigate = useNavigate();
  const { posts, loading, likePost } = useFeed();

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      <TopBar streak={0} alerts={0} />
      <div className="absolute inset-0 overflow-y-auto pt-20 pb-24 px-4">
        <div className="max-w-sm mx-auto space-y-4 pt-4">
          {loading && <p className="text-center text-gray-400 text-sm pt-10">Loading feed...</p>}
          {!loading && posts.length === 0 && (
            <p className="text-center text-gray-400 text-sm pt-10">No posts yet. Start logging visits!</p>
          )}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={() => likePost(post.id)} />
          ))}
        </div>
      </div>
      <BottomNav activeTab="feed" onTabChange={(tab) => navigate(tab === "map" ? "/" : `/${tab}`)} />
    </div>
  );
}
