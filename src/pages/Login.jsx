import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="cherry-bomb text-3xl text-center text-[#ed2079] mb-2">Eki Story</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Your Japanese train travel log</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ed2079]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ed2079]"
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#ed2079] text-white font-bold py-3 rounded-xl hover:brightness-110 transition"
          >
            {isRegister ? "Create Account" : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-[#ed2079] font-bold"
          >
            {isRegister ? "Log In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
