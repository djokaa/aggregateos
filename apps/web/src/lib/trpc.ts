import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@aggregateos/api";

export const trpc = createTRPCReact<AppRouter>();
