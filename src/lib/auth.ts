import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// 세션 기간 상수 (초 단위)
const SESSION_MAX_AGE = {
  SUPER_ADMIN: 7 * 24 * 60 * 60, // 7일 (보안)
  ADMIN_DEFAULT: 30 * 24 * 60 * 60, // 30일
  CLIENT_DEFAULT: 60 * 24 * 60 * 60, // 60일
};

// 역할에 따른 세션 기간 계산
function getSessionMaxAge(role: UserRole, orgSessionMaxDays: number | null): number {
  if (role === UserRole.SUPER_ADMIN) {
    return SESSION_MAX_AGE.SUPER_ADMIN;
  }

  if (orgSessionMaxDays) {
    return orgSessionMaxDays * 24 * 60 * 60;
  }

  if (role === UserRole.ADMIN) {
    return SESSION_MAX_AGE.ADMIN_DEFAULT;
  }

  return SESSION_MAX_AGE.CLIENT_DEFAULT;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 60 * 60, // 최대 60일 (실제 만료는 jwt callback에서 처리)
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                sessionMaxDays: true,
              },
            },
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email || user.username,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId ?? null;
        token.organizationName = user.organizationName ?? null;

        // 조직의 sessionMaxDays 조회
        let orgSessionMaxDays: number | null = null;
        if (user.organizationId) {
          const org = await prisma.organization.findUnique({
            where: { id: user.organizationId },
            select: { sessionMaxDays: true },
          });
          orgSessionMaxDays = org?.sessionMaxDays ?? null;
        }

        // 역할에 따른 세션 기간 설정
        const sessionMaxAge = getSessionMaxAge(user.role, orgSessionMaxDays);
        token.sessionMaxAge = sessionMaxAge;

        // 토큰 만료 시간 설정
        token.exp = Math.floor(Date.now() / 1000) + sessionMaxAge;
      }

      // 토큰 만료 체크
      if (token.exp && Date.now() / 1000 > token.exp) {
        throw new Error("Token expired");
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string | null;
        session.user.organizationName = token.organizationName as string | null;
      }
      return session;
    },
  },
});
