import type { LoadStatus } from "../types/loads";

export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  ordered: "Ordered",
  assigned: "Assigned",
  dispatched: "Dispatched",
  en_route_pickup: "En Route to Pickup",
  at_pickup: "At Pickup",
  loaded: "Loaded",
  en_route_delivery: "En Route to Delivery",
  at_delivery: "At Delivery",
  delivered: "Delivered",
  ticket_uploaded: "Ticket Uploaded",
  ticket_verified: "Ticket Verified",
  billable: "Billable",
  invoiced: "Invoiced",
  paid: "Paid",
};

/**
 * Maps each load status to a Badge `variant` prop value.
 * Grouped semantically:
 *   - secondary  → not yet started
 *   - info       → assigned / dispatched
 *   - purple     → in-transit pickup
 *   - warning    → loading / in-transit delivery
 *   - orange     → at delivery site
 *   - success    → delivered / verified / financial
 */
export const LOAD_STATUS_VARIANT: Record<
  LoadStatus,
  "secondary" | "info" | "purple" | "warning" | "orange" | "success"
> = {
  ordered: "secondary",
  assigned: "info",
  dispatched: "info",
  en_route_pickup: "purple",
  at_pickup: "purple",
  loaded: "warning",
  en_route_delivery: "orange",
  at_delivery: "orange",
  delivered: "success",
  ticket_uploaded: "info",
  ticket_verified: "success",
  billable: "success",
  invoiced: "success",
  paid: "success",
};

/**
 * @deprecated Use LOAD_STATUS_VARIANT with the Badge `variant` prop instead.
 */
export const LOAD_STATUS_COLORS: Record<LoadStatus, string> = {
  ordered: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  en_route_pickup: "bg-purple-100 text-purple-800",
  at_pickup: "bg-violet-100 text-violet-800",
  loaded: "bg-amber-100 text-amber-800",
  en_route_delivery: "bg-orange-100 text-orange-800",
  at_delivery: "bg-yellow-100 text-yellow-800",
  delivered: "bg-lime-100 text-lime-800",
  ticket_uploaded: "bg-cyan-100 text-cyan-800",
  ticket_verified: "bg-teal-100 text-teal-800",
  billable: "bg-emerald-100 text-emerald-800",
  invoiced: "bg-green-100 text-green-800",
  paid: "bg-green-200 text-green-900",
};
