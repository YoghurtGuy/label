import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/server/db";
// import logger from "@/utils/logger";
import { comparePassword } from "@/utils/password";
// const authLogger = (await logger()).child({ name: "AUTH" });

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      adminPermission?: boolean;
    }
  }
  interface User {
    adminPermission?: boolean;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    adminPermission?: boolean;
  }
}

export const authConfig = {
  session: {
    // Set to jwt in order to CredentialsProvider works properly
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [
    CredentialsProvider({
      id: "password",
      name: "密码",
      credentials: {
        username: { label: "用户名", type: "text", placeholder: "Email" },
        password: {
          label: "密码",
          type: "password",
          placeholder: "Password",
        },
      },
      async authorize(credentials) {
        try {
          const { username, password } = credentials ?? {};
          if (
            !username ||
            !password ||
            typeof username !== "string" ||
            typeof password !== "string"
          ) {
            // authLogger.error({
            //   msg: "Missing username or password",
            //   credentials,
            // });
            console.error("Missing username or password", credentials);
            throw new Error("username and password are required");
          }
          const user = await db.user.findUnique({
            where: { username },
          });
          // 用户不存在
          if (!user) {
            // authLogger.error({ msg: "User not found", username });
            console.error("User not found", username);
            throw new Error("Incorrect email or password");
          }
          // 密码不正确
          if (!comparePassword(password, user.password ?? "")) {
            // authLogger.error({
            //   msg: "Incorrect password",
            //   username,
            //   password,
            // });
            console.error("Incorrect password", username, password);
            throw new Error("Incorrect email or password");
          }
          const userInfo = {
            id: user.id,
            name: user.name,
            adminPermission: user.adminPermission,
          };
          // authLogger.info({
          //   msg: `${user.name} authenticated successfully`,
          // });
          console.info(`[AUTH] ${user.name} authenticated successfully`);
          return userInfo;
        } catch (err) {
          // authLogger.error({
          //   msg: "Error during authentication",
          //   error: err,
          // });
          console.error("Error during authentication", err);
          return null;
        }
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.name = token.name ?? "";
        session.user.adminPermission = token.adminPermission;
      }
      return session;
    },
    async redirect({ url }) {
      return url;
    },
    async jwt({ token, user }) {
      if (token && user) {
        token.adminPermission = user.adminPermission;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
