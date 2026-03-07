import { useState } from "react";

export default function VisitModal({ station, existingVisit, onClose, onConfirm, onRemove }) {
  const [note, setNote] = useState(existingVisit?.note || "");
  const [loading, setLoading] = useState(false);

  const stationName = station.station_name_en || station.station_name;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await onConfirm(note, stationName);
    setLoading(false);
  }

  async function handleRemove() {
    setLoading(true);
    await onRemove();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-6 pb-10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold">{stationName}</h2>
          {existingVisit && (
            <span className="text-[10px] bg-[#FFD700] text-black font-bold px-2 py-1 rounded-full">VISITED</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">{station.address || ""}</p>

        {existingVisit ? (
          // Already visited — show note + unvisit option
          <div className="space-y-3">
            {existingVisit.note && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">{existingVisit.note}</p>
            )}
            <button
              onClick={handleRemove}
              disabled={loading}
              className="w-full bg-white border-2 border-red-400 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
            >
              {loading ? "Removing..." : "Remove Visit"}
            </button>
          </div>
        ) : (
          // Not visited — log visit form
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#ed2079]"
              rows={3}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ed2079] text-white font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? "Logging..." : "Log Visit ✓"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
