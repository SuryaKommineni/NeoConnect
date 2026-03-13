import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import next from "next";
import path from "path";
import { mkdirSync } from "fs";
import { z } from "zod";
import { AUTH_COOKIE, hasRole, signAuthToken, verifyAuthToken } from "@/lib/auth";
import { findAuthUserByEmail, findAuthUserById, listAssignableAuthUsers, registerAuthUser, verifyAuthCredentials } from "@/lib/auth-store";
import { connectToDatabase } from "@/lib/db";
import { repo } from "@/lib/server-store";
import type { AuthPayload, Role } from "@/lib/types";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const uploadDir = path.join(process.cwd(), "public", "uploads");
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

type RequestWithUser = Request & { user?: AuthPayload };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  department: z.string().trim().min(2),
});

const createCaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(["Safety", "Policy", "Facilities", "HR", "Other"]),
  department: z.string().min(2),
  location: z.string().min(2),
  severity: z.enum(["Low", "Medium", "High"]),
  isAnonymous: z.coerce.boolean(),
});

const updateCaseSchema = z.object({
  status: z.enum(["New", "Assigned", "In Progress", "Pending", "Resolved", "Escalated"]).optional(),
  resolutionSummary: z.string().optional(),
  actionTaken: z.string().optional(),
  impactChange: z.string().optional(),
});

const assignCaseSchema = z.object({
  assignedToId: z.string().min(1),
});

const noteSchema = z.object({
  body: z.string().min(2),
});

const createPollSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).min(2),
});

const voteSchema = z.object({
  optionId: z.string().min(1),
});

const minuteSchema = z.object({
  title: z.string().min(3),
  quarter: z.string().min(2),
});

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function authMiddleware(req: RequestWithUser, _res: Response, nextFn: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const user = verifyAuthToken(token);
  if (user) {
    req.user = user;
  }
  nextFn();
}

function requireAuth(req: RequestWithUser, res: Response, nextFn: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, "Authentication required");
  }
  nextFn();
}

function requireRole(allowedRoles: Role[]) {
  return (req: RequestWithUser, res: Response, nextFn: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "Authentication required");
    }
    if (!hasRole(req.user.role, allowedRoles)) {
      return sendError(res, 403, "You do not have access to this resource");
    }
    nextFn();
  };
}

async function startServer() {
  await connectToDatabase().catch(() => null);
  await app.prepare();

  const server = express();
  server.use(express.json({ limit: "10mb" }));
  server.use(express.urlencoded({ extended: true }));
  server.use(cookieParser());
  server.use(authMiddleware);

  server.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid login details");
    }

    const user = await verifyAuthCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      return sendError(res, 401, "Invalid email or password");
    }

    const token = signAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: !dev,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user,
    });
  });

  server.post("/api/auth/register", async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Please complete all required fields");
    }

    const existingUser = await findAuthUserByEmail(parsed.data.email);
    if (existingUser) {
      return sendError(res, 409, "An account with this email already exists");
    }

    const user = await registerAuthUser(parsed.data);
    const token = signAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: !dev,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ user });
  });

  server.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE);
    return res.json({ ok: true });
  });

  server.get("/api/auth/me", async (req: RequestWithUser, res: Response) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    const user = await findAuthUserById(req.user.id);
    return res.json({
      user: user || null,
    });
  });

  server.get("/api/users", requireRole(["secretariat", "admin"]), async (_req: Request, res: Response) => {
    return res.json({ users: await listAssignableAuthUsers() });
  });

  server.get("/api/cases", requireAuth, async (req: RequestWithUser, res: Response) => {
    return res.json({ cases: await repo.getCases(req.user!.role, req.user!.id) });
  });

  server.post("/api/cases", requireRole(["staff", "secretariat", "admin"]), upload.single("attachment"), async (req: RequestWithUser, res: Response) => {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Please complete all required fields");
    }

    const created = await repo.createCase({
      ...parsed.data,
      submitterId: req.user?.id,
      submitterName: req.user?.name || "Anonymous",
      attachmentName: req.file?.originalname,
      attachmentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    return res.status(201).json({ case: created });
  });

  server.patch("/api/cases/:id", requireRole(["caseManager", "secretariat", "admin"]), async (req: RequestWithUser, res: Response) => {
    const parsed = updateCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid case update payload");
    }

    const updated = await repo.updateCase(getRouteParam(req.params.id), parsed.data);
    if (!updated) {
      return sendError(res, 404, "Case not found");
    }
    return res.json({ case: updated });
  });

  server.post("/api/cases/:id/assign", requireRole(["secretariat", "admin"]), async (req: Request, res: Response) => {
    const parsed = assignCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Please choose a case manager");
    }
    const manager = (await listAssignableAuthUsers()).find((user) => user.id === parsed.data.assignedToId);
    if (!manager) {
      return sendError(res, 404, "Case manager not found");
    }
    const updated = await repo.assignCase(getRouteParam(req.params.id), manager.id, manager.name);
    if (!updated) {
      return sendError(res, 404, "Case not found");
    }
    return res.json({ case: updated });
  });

  server.post("/api/cases/:id/notes", requireRole(["caseManager", "secretariat", "admin"]), async (req: RequestWithUser, res: Response) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Note cannot be empty");
    }
    const updated = await repo.addNote(getRouteParam(req.params.id), req.user!.id, req.user!.name, parsed.data.body);
    if (!updated) {
      return sendError(res, 404, "Case not found");
    }
    return res.json({ case: updated });
  });

  server.get("/api/polls", requireAuth, async (_req: RequestWithUser, res: Response) => {
    return res.json({ polls: await repo.getPolls() });
  });

  server.post("/api/polls", requireRole(["secretariat", "admin"]), async (req: RequestWithUser, res: Response) => {
    const parsed = createPollSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Poll needs a question and at least two options");
    }

    const poll = await repo.createPoll({
      ...parsed.data,
      createdById: req.user!.id,
      createdByName: req.user!.name,
    });
    return res.status(201).json({ poll });
  });

  server.post("/api/polls/:id/vote", requireRole(["staff", "secretariat", "caseManager", "admin"]), async (req: RequestWithUser, res: Response) => {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Please choose an option");
    }

    const poll = await repo.voteOnPoll(getRouteParam(req.params.id), req.user!.id, parsed.data.optionId);
    if (!poll) {
      return sendError(res, 400, "Vote could not be recorded");
    }
    return res.json({ poll });
  });

  server.get("/api/hub", requireAuth, async (_req: Request, res: Response) => {
    return res.json(await repo.getPublicHubData());
  });

  server.get("/api/minutes", requireAuth, async (_req: Request, res: Response) => {
    return res.json({ minutes: await repo.getMinutes() });
  });

  server.post("/api/minutes", requireRole(["secretariat", "admin"]), upload.single("file"), async (req: RequestWithUser, res: Response) => {
    if (!req.file) {
      return sendError(res, 400, "Please upload a PDF file");
    }
    const parsed = minuteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Title and quarter are required");
    }
    const minute = await repo.addMinute({
      ...parsed.data,
      uploadedById: req.user!.id,
      uploadedByName: req.user!.name,
      fileName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
    });
    return res.status(201).json({ minute });
  });

  server.get("/api/analytics", requireRole(["secretariat", "admin"]), async (_req: Request, res: Response) => {
    return res.json(await repo.getAnalytics());
  });

  server.all("*splat", (req: Request, res: Response) => handle(req, res));

  server.listen(port, () => {
    console.log(`NeoConnect ready at http://${hostname}:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start NeoConnect", error);
  process.exit(1);
});
