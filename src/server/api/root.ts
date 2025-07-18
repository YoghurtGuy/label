import { authRouter } from "@/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import datasetRouter from "./routers/dataset";
import { exportRouter } from "./routers/export";
import { imageRouter } from "./routers/image";
import { taskRouter } from "./routers/task";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  dataset: datasetRouter,
  task: taskRouter,
  image: imageRouter,
  export: exportRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
