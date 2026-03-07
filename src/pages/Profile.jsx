import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useVisits } from "../hooks/useVisits";
import { useStamps } from "../hooks/useStamps";
import TopBar from "../components/layout/TopBar";
import BottomNav from "../components/layout/BottomNav";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visits } = useVisits();
  const { stamps } = useStamps();

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      <TopBar streak={0} alerts={0} />

      <div className="absolute inset-0 overflow-y-auto pt-20 pb-28 px-4">
        <div className="max-w-sm mx-auto pt-4 space-y-3">

          {/* Avatar */}
          <div className="eki-card text-center">
            <div className="w-16 h-16 rounded-full bg-[#ed2079] flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-black">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <p className="font-black text-lg">{user?.displayName ?? user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Joined {user?.metadata?.creationTime?.slice(0, 10) ?? "—"}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="eki-card text-center">
              <p className="text-2xl font-black text-[#009B73]">{visits.length}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Visits</p>
            </div>
            <div className="eki-card text-center">
              <p className="text-2xl font-black text-[#fbb03c]">{stamps.length}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Stamps</p>
            </div>
            <div className="eki-card text-center">
              <p className="text-2xl font-black text-[#ff6f00]">0</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Streak</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut(auth)}
            className="w-full bg-white border-2 border-black text-gray-600 font-bold py-3 rounded-2xl shadow hover:bg-gray-50 transition"
          >
            Sign Out
          </button>

        </div>
      </div>

      <BottomNav activeTab="profile" onTabChange={(tab) => navigate(tab === "map" ? "/" : `/${tab}`)} />
    </div>
  );
}
