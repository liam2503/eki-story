import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lines from "./pages/Lines";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/lines" element={<PrivateRoute><Lines /></PrivateRoute>} />
      <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
