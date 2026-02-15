"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const LINE_TYPE_LABELS: Record<string, string> = {
  material: "Material",
  hauling: "Hauling",
  hourly: "Hourly",
  fee: "Fee",
  discount: "Discount",
};

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function CustomerEstimateViewPage() {
  const { token } = useParams<{ token: string }>();
  const [commentText, setCommentText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionTaken, setActionTaken] = useState<
    "approved" | "rejected" | null
  >(null);
  const [viewedMarked, setViewedMarked] = useState(false);

  // Fetch estimate data via the public token route
  const {
    data,
    isLoading,
    error,
    refetch,
  } = trpc.estimateAccess.validateToken.useQuery(
    { token },
    { retry: false },
  );

  // Mark as viewed once on load
  const markViewed = trpc.estimateAccess.markViewed.useMutation();

  useEffect(() => {
    if (data && !viewedMarked) {
      markViewed.mutate({ token });
      setViewedMarked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, viewedMarked]);

  // Mutations
  const approveMutation = trpc.estimateAccess.approve.useMutation({
    onSuccess: () => {
      toast.success("Estimate approved! Thank you.");
      setActionTaken("approved");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.estimateAccess.reject.useMutation({
    onSuccess: () => {
      toast.success("Estimate rejected.");
      setActionTaken("rejected");
      setShowRejectForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const commentMutation = trpc.estimateAccess.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setCommentText("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading estimate...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {error?.message || "This estimate link is invalid or has expired."}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Please contact the sender for a new link if you believe this is an
            error.
          </p>
        </div>
      </div>
    );
  }

  const { estimate, lineItems, comments, permissions } = data;
  const est = estimate as any;
  const status = est.status;
  const canApproveReject =
    permissions === "approve_reject" &&
    (status === "sent" || status === "viewed") &&
    !actionTaken;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ Header ═══ */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-medium uppercase tracking-wider text-gray-500">
                Ryland Logistics
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Aggregate Logistics Operating System
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Estimate</p>
              <p className="text-lg font-bold font-mono text-gray-900">
                {est.estimateNumber}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* ═══ Status Banner ═══ */}
        {(status === "approved" || actionTaken === "approved") && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-4 text-center">
            <p className="text-lg font-semibold text-green-800">
              This estimate has been approved
            </p>
            {est.approvedAt && (
              <p className="text-sm text-green-600 mt-1">
                Approved on {formatDate(est.approvedAt)}
              </p>
            )}
          </div>
        )}

        {(status === "rejected" || actionTaken === "rejected") && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center">
            <p className="text-lg font-semibold text-red-800">
              This estimate has been rejected
            </p>
            {est.rejectedAt && (
              <p className="text-sm text-red-600 mt-1">
                Rejected on {formatDate(est.rejectedAt)}
              </p>
            )}
          </div>
        )}

        {status === "expired" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-center">
            <p className="text-lg font-semibold text-amber-800">
              This estimate has expired
            </p>
          </div>
        )}

        {/* ═══ Summary ═══ */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-6 py-5 border-b">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Customer
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {data.customerName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Job Site
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {data.jobSiteName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Valid Until
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDate(est.validUntil)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Total
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatCurrency(est.total ?? "0")}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Line Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">
                      Material Rate
                    </th>
                    <th className="pb-2 font-medium text-right">Haul Rate</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li: any, idx: number) => (
                    <tr key={li.id ?? idx} className="border-b last:border-0">
                      <td className="py-3 text-gray-600">
                        {LINE_TYPE_LABELS[li.lineType] ?? li.lineType ?? "Material"}
                      </td>
                      <td className="py-3 text-gray-900">
                        {li.materialName || li.description || "—"}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {li.quantity}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatCurrency(li.materialRate ?? "0")}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatCurrency(li.haulRate ?? "0")}
                      </td>
                      <td className="py-3 text-right font-medium tabular-nums">
                        {formatCurrency(li.lineTotal ?? "0")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatCurrency(est.subtotal ?? "0")}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Fuel Surcharge</span>
                  <span className="tabular-nums">
                    {formatCurrency(est.fuelSurchargeTotal ?? "0")}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(est.total ?? "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          {est.notesCustomer && (
            <div className="px-6 py-5 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {est.notesCustomer}
              </p>
            </div>
          )}
        </div>

        {/* ═══ Action Buttons ═══ */}
        {canApproveReject && (
          <div className="rounded-lg border bg-white shadow-sm px-6 py-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Your Response
            </h3>

            {showRejectForm ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Reason for rejection *
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  rows={3}
                  placeholder="Please provide a reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowRejectForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={
                      !rejectReason.trim() || rejectMutation.isPending
                    }
                    onClick={() =>
                      rejectMutation.mutate({
                        token,
                        reason: rejectReason,
                      })
                    }
                  >
                    {rejectMutation.isPending
                      ? "Submitting..."
                      : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ token })}
                >
                  {approveMutation.isPending
                    ? "Approving..."
                    : "Approve Estimate"}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md border border-red-300 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => setShowRejectForm(true)}
                >
                  Reject Estimate
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ Comments ═══ */}
        <div className="rounded-lg border bg-white shadow-sm px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Comments
          </h3>

          {comments && comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`rounded-md border px-4 py-3 ${
                    comment.authorType === "customer"
                      ? "border-blue-200 bg-blue-50/50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {comment.authorLabel}{" "}
                      <span className="text-gray-400">
                        ({comment.authorType})
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
          )}

          {/* Add comment */}
          {(permissions === "approve_reject" || permissions === "comment") && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                rows={2}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={
                    !commentText.trim() || commentMutation.isPending
                  }
                  onClick={() =>
                    commentMutation.mutate({
                      token,
                      body: commentText,
                    })
                  }
                >
                  {commentMutation.isPending ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pb-8">
          <p>
            Powered by AggregateOS · Ryland Logistics
          </p>
        </footer>
      </main>
    </div>
  );
}
