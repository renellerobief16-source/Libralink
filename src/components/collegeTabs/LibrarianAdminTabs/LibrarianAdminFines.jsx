import { useState, useEffect } from "react";
import { FiAlertCircle, FiCheck, FiClock } from "react-icons/fi";
import Card from "../../ui/Card";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import api from "../../../utils/api";

function LibrarianAdminFines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalFines, setTotalFines] = useState(0);
  const [paidFines, setPaidFines] = useState(0);
  const [pendingFines, setPendingFines] = useState(0);

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      setFines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/fines/school/${schoolId}`);
      const finesData = response.data || [];
      setFines(finesData);
      setTotalFines(finesData.reduce((sum, f) => sum + (f.amount || 0), 0));
      setPaidFines(finesData.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0));
      setPendingFines(finesData.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0));
    } catch (error) {
      console.error('Error fetching fines:', error);
      setFines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (fineId) => {
    try {
      const response = await api.put(`/fines/${fineId}/status`, { status: 'paid' });
      if (response.success || response.data) {
        await fetchFines();
      }
    } catch (error) {
      console.error('Error marking fine as paid:', error);
      alert('Failed to mark fine as paid. Please try again.');
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Fines Management</h2>
        <p className="text-[#64748B] text-sm">Track and manage library fines and payments</p>
      </div>

      {/* Fines Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-[#2563EB]">₱</span>
            </div>
            <span className="text-xs font-medium text-[#64748B]">Total Fines</span>
          </div>
          <h3 className="text-2xl font-bold text-[#0F172A]">₱{totalFines.toFixed(2)}</h3>
        </div>
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FiCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Paid</span>
          </div>
          <h3 className="text-2xl font-bold text-[#0F172A]">₱{paidFines.toFixed(2)}</h3>
        </div>
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FiClock className="w-5 h-5 text-[#DC2626]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Pending</span>
          </div>
          <h3 className="text-2xl font-bold text-[#0F172A]">₱{pendingFines.toFixed(2)}</h3>
        </div>
      </div>

      {/* Fines List */}
      <Card>
        {loading ? (
          <p className="text-sm text-[#64748B]">Loading fines...</p>
        ) : fines.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl text-[#64748B]">₱</span>}
            title="No Fines"
            description="No fines have been issued yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[#64748B] text-left text-sm border-b border-[#E2E8F0]">
                  <th className="p-3">Student</th>
                  <th className="p-3">Book</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((fine) => (
                  <tr key={fine.id} className="border-t border-[#E2E8F0]">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-[#0F172A]">{fine.studentName}</p>
                        <p className="text-xs text-[#64748B]">{fine.studentNumber}</p>
                      </div>
                    </td>
                    <td className="p-3 text-[#64748B]">{fine.bookTitle}</td>
                    <td className="p-3 font-medium text-[#0F172A]">₱{fine.amount.toFixed(2)}</td>
                    <td className="p-3 text-[#64748B]">{fine.reason}</td>
                    <td className="p-3 text-[#64748B]">{fine.dueDate}</td>
                    <td className="p-3">
                      <StatusBadge status={fine.status} />
                    </td>
                    <td className="p-3">
                      {fine.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsPaid(fine.id)}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default LibrarianAdminFines;
