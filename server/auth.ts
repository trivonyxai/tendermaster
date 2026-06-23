import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

passport.use(
  new LocalStrategy((username, password, done) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return done(null, { id: 1, username });
    }
    return done(null, false, { message: "Invalid credentials" });
  }),
);

passport.serializeUser((user, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser((id: number, done) => {
  done(null, { id, username: ADMIN_USERNAME });
});

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tendermaster-dev-secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({ checkPeriod: 86400000 }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ success: true, user: { username: ADMIN_USERNAME } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (process.env.DISABLE_AUTH === "true") {
      return res.json({ authenticated: true, user: { username: "dev" } });
    }
    if (req.isAuthenticated()) {
      return res.json({ authenticated: true, user: req.user });
    }
    return res.json({ authenticated: false });
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (process.env.DISABLE_AUTH === "true") {
    return next();
  }
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};
