import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main>
          {session?.user && (
            <div>
              <p>{session.user.name}</p>
            </div>
          )}
      </main>
    </HydrateClient>
  );
}
