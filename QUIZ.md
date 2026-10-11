# Code Comprehension Quiz

**Target Files:**
- `auth.ts`

---

### Question 1: TypeScript Module Augmentation
In lines 7–14, `auth.ts` uses module augmentation:
```ts
declare module "next-auth" {
  interface Session {
    user: { id: string; belt?: string | null } & DefaultSession["user"];
  }
  interface User {
    belt?: string | null;
  }
}
```
Explain why this module augmentation is required in NextAuth v5, what specific properties are added or overridden on `Session["user"]` and `User`, and what compile-time issues would occur in downstream components or API routes without this declaration.

**Your Answer:**
> <!-- Write your answer here -->

---

### Question 2: Timing Attack Mitigation via `DUMMY_HASH`
Examine lines 41–45 and line 75:
```ts
// Compare against a dummy hash when the user is missing so that the
// response time does not reveal whether an account exists.
const hash = user?.passwordHash ?? DUMMY_HASH;
const ok = await bcrypt.compare(parsed.data.password, hash);
if (!user || !ok) return null;
```
Explain the exact security vulnerability (side-channel / timing attack) being mitigated here. What would happen if the code instead checked `if (!user) return null;` immediately after querying the database? Why is it important that `DUMMY_HASH` uses the same bcrypt cost factor as normal user passwords?

**Your Answer:**
> <!-- So that the network response latency doesn't reveal if an account exists within the userbase or not-->

---

### Question 3: Control Flow & Input Validation in `authorize`
Trace the execution flow of `authorize(raw)` from lines 31 to 53:
1. What guard conditions cause `authorize` to abort early and return `null` before any database queries are performed?
2. What schema is used to validate the credentials payload, and what guarantees does this provide?
3. What is the role of `await ensureIndexes()` right before calling `users()`, and what user fields are mapped and returned upon successful authentication?

**Your Answer:**
> <!-- Write your answer here -->

---

### Question 4: JWT & Session Callbacks Data Pipeline
Lines 56–71 define the `jwt` and `session` callbacks:
```ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.sub = user.id;
      token.belt = user.belt ?? null;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.sub!;
      session.user.belt = (token.belt as string | null) ?? null;
    }
    return session;
  },
}
```
Trace how custom user data (specifically `id` and `belt`) flows from the initial `authorize` return object to the final `session` object returned by `auth()`. Why does the `jwt` callback check `if (user)`? When does `jwt` run with `user` defined versus without `user` defined?

**Your Answer:**
> <!-- Write your answer here -->

---

### Question 5: Session Strategy and Routing Configuration
Review the top-level NextAuth options configured in lines 17–23:
```ts
session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
trustHost: true,
pages: {
  signIn: "/signin",
  error: "/signin",
},
```
1. Why is `strategy: "jwt"` required when using the `Credentials` provider in NextAuth?
2. How long does a user session remain valid based on the `maxAge` setting?
3. What custom page routes are configured for signing in and displaying authentication errors, and why are both pointing to `/signin`?

**Your Answer:**
> <!-- Write your answer here -->
