import { z } from "zod";
import { router, entityProcedure } from "../trpc";
import { geocodeAddress, calculateDistance } from "../services/google-maps";

export const mapsRouter = router({
  geocode: entityProcedure
    .input(z.object({ address: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await geocodeAddress(input.address);
      return result;
    }),

  distance: entityProcedure
    .input(z.object({
      origin: z.union([
        z.object({ lat: z.number(), lng: z.number() }),
        z.string().min(1),
      ]),
      destination: z.union([
        z.object({ lat: z.number(), lng: z.number() }),
        z.string().min(1),
      ]),
    }))
    .mutation(async ({ input }) => {
      const result = await calculateDistance(input.origin, input.destination);
      return result;
    }),
});
