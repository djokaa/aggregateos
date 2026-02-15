export const LOAD_STATUSES = [
  "ordered",
  "assigned",
  "dispatched",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
  "ticket_uploaded",
  "ticket_verified",
  "billable",
  "invoiced",
  "paid",
] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

/**
 * Valid state transitions for the load lifecycle.
 * Each key maps to the set of statuses it can transition to.
 */
export const LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  ordered: ["assigned"],
  assigned: ["dispatched", "ordered"], // can be unassigned back to ordered
  dispatched: ["en_route_pickup", "assigned"], // can be reassigned
  en_route_pickup: ["at_pickup"],
  at_pickup: ["loaded"],
  loaded: ["en_route_delivery"],
  en_route_delivery: ["at_delivery"],
  at_delivery: ["delivered"],
  delivered: ["ticket_uploaded"],
  ticket_uploaded: ["ticket_verified"],
  ticket_verified: ["billable"],
  billable: ["invoiced"],
  invoiced: ["paid"],
  paid: [],
};

/** Check if a load status transition is valid */
export function isValidTransition(
  from: LoadStatus,
  to: LoadStatus
): boolean {
  return LOAD_TRANSITIONS[from].includes(to);
}

/** Load statuses that indicate the load is actively in progress */
export const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  "assigned",
  "dispatched",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
];

/** Load statuses that are in the financial pipeline */
export const FINANCIAL_LOAD_STATUSES: LoadStatus[] = [
  "billable",
  "invoiced",
  "paid",
];
