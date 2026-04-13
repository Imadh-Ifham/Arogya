import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchSlotsThunk } from "../store/appointment/appointment.thunk";
import { getDoctorLabel } from "../data/mockDoctors";
import Layout from "../components/Layout";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SlotsPage() {
  const dispatch = useAppDispatch();
  const { slots, loading, error } = useAppSelector((s) => s.appointment);
  const { accessToken } = useAppSelector((s) => s.auth);

  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    dispatch(fetchSlotsThunk(dateFilter ? { date: dateFilter } : undefined));
  }, [dispatch, dateFilter]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Slots</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter by date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading === "pending" && (
        <div className="text-center py-16 text-gray-400">Loading slots…</div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading === "succeeded" && slots.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No available slots found.</p>
          <p className="text-sm mt-1">
            Run the seed script to populate test data — see{" "}
            <code className="bg-gray-100 px-1 rounded">
              apps/appointment-service/seed-test-slots.sql
            </code>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots
          .filter((s) => s.status === "AVAILABLE")
          .map((slot) => (
            <div
              key={slot.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {getDoctorLabel(slot.doctorId)}
                </p>
              </div>

              <div className="text-xs text-gray-500 space-y-0.5">
                <p>
                  <span className="font-medium text-gray-700">From</span>{" "}
                  {formatDateTime(slot.startTime)}
                </p>
                <p>
                  <span className="font-medium text-gray-700">To</span>{" "}
                  {formatDateTime(slot.endTime)}
                </p>
              </div>

              <p className="text-blue-600 font-bold text-lg">
                LKR{Number(slot.fee).toLocaleString("en-IN")}
              </p>

              {accessToken ? (
                <Link
                  to={`/book/${slot.id}`}
                  className="mt-auto text-center bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book Slot
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="mt-auto text-center border border-blue-600 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Login to book
                </Link>
              )}
            </div>
          ))}
      </div>
    </Layout>
  );
}
