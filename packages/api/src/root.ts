import { router } from "./trpc";
import { customerRouter } from "./routers/customer";
import { customerContactRouter } from "./routers/customer-contact";
import { locationRouter } from "./routers/location";
import { materialRouter } from "./routers/material";
import { rateCardRouter } from "./routers/rate-card";
import { estimateRouter } from "./routers/estimate";
import { estimateAccessRouter } from "./routers/estimate-access";
import { dashboardRouter } from "./routers/dashboard";
import { loadRouter } from "./routers/load";
import { driverRouter } from "./routers/driver";
import { invoiceRouter } from "./routers/invoice";
import { billingProfileRouter } from "./routers/billing-profile";
import { orderRouter } from "./routers/order";
import { projectRouter } from "./routers/project";
import { dispatchRouter } from "./routers/dispatch";
import { mapsRouter } from "./routers/maps";
import { ticketRouter } from "./routers/ticket";
import { notificationRouter } from "./routers/notification";
import { companyRouter } from "./routers/company";
import { contactRouter } from "./routers/contact";

export const appRouter = router({
  customer: customerRouter,
  company: companyRouter,
  contact: contactRouter,
  customerContact: customerContactRouter,
  location: locationRouter,
  material: materialRouter,
  rateCard: rateCardRouter,
  estimate: estimateRouter,
  estimateAccess: estimateAccessRouter,
  dashboard: dashboardRouter,
  load: loadRouter,
  driver: driverRouter,
  invoice: invoiceRouter,
  billingProfile: billingProfileRouter,
  order: orderRouter,
  project: projectRouter,
  dispatch: dispatchRouter,
  maps: mapsRouter,
  ticket: ticketRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
