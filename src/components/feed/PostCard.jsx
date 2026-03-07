import { useAuth } from "../../context/AuthContext";

export default function PostCard({ post, onLike }) {
  const { user } = useAuth();
  const liked = post.liked_by?.includes(user?.uid);
  const timeAgo = post.posted_at?.toDate ? formatTimeAgo(post.posted_at.toDate()) : "just now";

  const typeBadgeColor = {
    visit: "bg-[#009B73]",
    stamp: "bg-[#fbb03c]",
    sighting: "bg-[#2BAAE2]",
  }[post.ref_type] ?? "bg-gray-400";

  const typeLabel = {
    visit: "Station Visit",
    stamp: "Stamp Collected",
    sighting: "Train Spotted",
  }[post.ref_type] ?? "Post";

  return (
    <div className="eki-card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-black text-sm">{post.display_name ?? post.user_id?.slice(0, 8)}</span>
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <span className={`text-[10px] text-white font-bold px-2 py-0.5 rounded-full ${typeBadgeColor}`}>
          {typeLabel}
        </span>
        {post.station_name && (
          <span className="text-xs font-bold text-gray-700">{post.station_name}</span>
        )}
      </div>

      {post.note && <p className="text-sm text-gray-600 mb-2">{post.note}</p>}

      <button
        onClick={() => !liked && onLike()}
        className={`flex items-center space-x-1 text-xs transition ${liked ? "text-[#ed2079] cursor-default" : "text-gray-400 hover:text-[#ed2079]"}`}
      >
        <span>{liked ? "♥" : "♡"}</span>
        <span>{post.like_count ?? 0}</span>
      </button>
    </div>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
