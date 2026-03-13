import { Schema, model, models } from "mongoose";
import { seedCases, seedMinutes, seedPolls, seedUsers } from "@/lib/demo-data";
import { connectToDatabase, hasDatabaseConfig, isDatabaseReady } from "@/lib/db";
import { applyEscalationRules } from "@/lib/escalation";
import type {
  CaseCategory,
  CaseNote,
  CaseStatus,
  ComplaintCase,
  DashboardSummary,
  MinuteDocument,
  Poll,
  Role,
  Severity,
  User,
} from "@/lib/types";

type CreateCaseInput = {
  title: string;
  description: string;
  category: CaseCategory;
  department: string;
  location: string;
  severity: Severity;
  isAnonymous: boolean;
  submitterName: string;
  submitterId?: string;
  attachmentName?: string;
  attachmentUrl?: string;
};

type UpdateCaseInput = Partial<{
  status: CaseStatus;
  resolutionSummary: string;
  actionTaken: string;
  impactChange: string;
  assignedToId: string;
  assignedToName: string;
}>;

type CreatePollInput = {
  question: string;
  options: string[];
  createdById: string;
  createdByName: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  department: string;
  role?: Role;
};

type CreateMinuteInput = {
  title: string;
  quarter: string;
  uploadedById: string;
  uploadedByName: string;
  fileName: string;
  url: string;
};

type GlobalStore = {
  users: User[];
  cases: ComplaintCase[];
  polls: Poll[];
  minutes: MinuteDocument[];
};

type CaseDocument = ComplaintCase;
type PollDocument = Poll;
type MinuteDocumentModel = MinuteDocument;

declare global {
  var __neoStore: GlobalStore | undefined;
}

const store =
  global.__neoStore ??
  (global.__neoStore = {
    users: structuredClone(seedUsers),
    cases: structuredClone(seedCases),
    polls: structuredClone(seedPolls),
    minutes: structuredClone(seedMinutes),
  });

const caseNoteSchema = new Schema<CaseNote>(
  {
    id: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
);

const caseSchema = new Schema<CaseDocument>(
  {
    id: { type: String, required: true, unique: true },
    trackingId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["Safety", "Policy", "Facilities", "HR", "Other"], required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    severity: { type: String, enum: ["Low", "Medium", "High"], required: true },
    isAnonymous: { type: Boolean, required: true },
    submitterName: { type: String, required: true },
    submitterId: { type: String },
    status: { type: String, enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Escalated"], required: true },
    assignedToId: { type: String },
    assignedToName: { type: String },
    attachmentName: { type: String },
    attachmentUrl: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    assignedAt: { type: String },
    firstResponseAt: { type: String },
    reminderSentAt: { type: String },
    escalatedAt: { type: String },
    resolutionSummary: { type: String },
    actionTaken: { type: String },
    impactChange: { type: String },
    notes: { type: [caseNoteSchema], default: [] },
  },
  { versionKey: false },
);

const pollOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    votes: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const pollSchema = new Schema<PollDocument>(
  {
    id: { type: String, required: true, unique: true },
    question: { type: String, required: true },
    options: { type: [pollOptionSchema], default: [] },
    createdAt: { type: String, required: true },
    createdById: { type: String, required: true },
    createdByName: { type: String, required: true },
    voters: { type: [String], default: [] },
  },
  { versionKey: false },
);

const minuteSchema = new Schema<MinuteDocumentModel>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    quarter: { type: String, required: true },
    uploadedAt: { type: String, required: true },
    uploadedById: { type: String, required: true },
    uploadedByName: { type: String, required: true },
    fileName: { type: String, required: true },
    url: { type: String, required: true },
  },
  { versionKey: false },
);

const CaseModel = models.ComplaintCase || model<CaseDocument>("ComplaintCase", caseSchema);
const PollModel = models.StaffPoll || model<PollDocument>("StaffPoll", pollSchema);
const MinuteModel = models.MeetingMinute || model<MinuteDocumentModel>("MeetingMinute", minuteSchema);

let seedPromise: Promise<void> | null = null;

function cloneCase(caseItem: ComplaintCase) {
  return structuredClone(caseItem);
}

function clonePoll(poll: Poll) {
  return structuredClone(poll);
}

function cloneMinute(minute: MinuteDocument) {
  return structuredClone(minute);
}

function nextLocalTrackingId() {
  const year = new Date().getFullYear();
  const count = store.cases.filter((caseItem) => caseItem.trackingId.startsWith(`NEO-${year}`)).length + 1;
  return `NEO-${year}-${String(count).padStart(3, "0")}`;
}

async function nextMongoTrackingId() {
  const year = new Date().getFullYear();
  const count = await CaseModel.countDocuments({
    trackingId: { $regex: `^NEO-${year}-` },
  });

  return `NEO-${year}-${String(count + 1).padStart(3, "0")}`;
}

function syncLocalEscalations() {
  store.cases = store.cases.map((caseItem) => applyEscalationRules(caseItem));
}

async function ensureMongoStoreReady() {
  if (!hasDatabaseConfig()) {
    return false;
  }

  try {
    await connectToDatabase();
  } catch {
    return false;
  }

  if (!isDatabaseReady()) {
    return false;
  }

  if (!seedPromise) {
    seedPromise = (async () => {
      await Promise.all(
        seedCases.map((caseItem) =>
          CaseModel.updateOne(
            { id: caseItem.id },
            { $setOnInsert: caseItem },
            { upsert: true },
          ),
        ),
      );

      await Promise.all(
        seedPolls.map((poll) =>
          PollModel.updateOne(
            { id: poll.id },
            { $setOnInsert: poll },
            { upsert: true },
          ),
        ),
      );

      await Promise.all(
        seedMinutes.map((minute) =>
          MinuteModel.updateOne(
            { id: minute.id },
            { $setOnInsert: minute },
            { upsert: true },
          ),
        ),
      );
    })();
  }

  await seedPromise;
  return true;
}

async function syncMongoEscalations() {
  const caseItems = await CaseModel.find({}).lean<CaseDocument[]>();

  await Promise.all(
    caseItems.map(async (caseItem) => {
      const updated = applyEscalationRules(caseItem);
      if (JSON.stringify(updated) !== JSON.stringify(caseItem)) {
        await CaseModel.updateOne({ id: caseItem.id }, { $set: updated });
      }
    }),
  );
}

async function getAllCases() {
  if (await ensureMongoStoreReady()) {
    await syncMongoEscalations();
    return CaseModel.find({}).sort({ createdAt: -1 }).lean<CaseDocument[]>();
  }

  syncLocalEscalations();
  return store.cases.map(cloneCase);
}

export const repo = {
  getUsers() {
    return store.users;
  },
  getUserByEmail(email: string) {
    return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  },
  createUser(input: CreateUserInput) {
    const user: User = {
      id: `user-${crypto.randomUUID()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      department: input.department.trim(),
      role: input.role ?? "staff",
    };

    store.users.unshift(user);
    return user;
  },
  getAssignableCaseManagers() {
    return store.users.filter((user) => user.role === "caseManager");
  },
  async getCases(role: Role, userId: string) {
    const caseItems = await getAllCases();
    if (role === "caseManager") {
      return caseItems.filter((caseItem) => caseItem.assignedToId === userId);
    }
    if (role === "staff") {
      return caseItems.filter((caseItem) => caseItem.submitterId === userId);
    }
    return caseItems;
  },
  async getCase(id: string) {
    if (await ensureMongoStoreReady()) {
      await syncMongoEscalations();
      return CaseModel.findOne({ id }).lean<CaseDocument | null>();
    }

    syncLocalEscalations();
    const caseItem = store.cases.find((item) => item.id === id);
    return caseItem ? cloneCase(caseItem) : null;
  },
  async createCase(input: CreateCaseInput) {
    if (await ensureMongoStoreReady()) {
      const caseItem: ComplaintCase = {
        id: `case-${crypto.randomUUID()}`,
        trackingId: await nextMongoTrackingId(),
        title: input.title,
        description: input.description,
        category: input.category,
        department: input.department,
        location: input.location,
        severity: input.severity,
        isAnonymous: input.isAnonymous,
        submitterName: input.isAnonymous ? "Anonymous" : input.submitterName,
        submitterId: input.submitterId,
        status: "New",
        attachmentName: input.attachmentName,
        attachmentUrl: input.attachmentUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      };

      await CaseModel.create(caseItem);
      return caseItem;
    }

    const caseItem: ComplaintCase = {
      id: `case-${crypto.randomUUID()}`,
      trackingId: nextLocalTrackingId(),
      title: input.title,
      description: input.description,
      category: input.category,
      department: input.department,
      location: input.location,
      severity: input.severity,
      isAnonymous: input.isAnonymous,
      submitterName: input.isAnonymous ? "Anonymous" : input.submitterName,
      submitterId: input.submitterId,
      status: "New",
      attachmentName: input.attachmentName,
      attachmentUrl: input.attachmentUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    };
    store.cases.unshift(caseItem);
    return cloneCase(caseItem);
  },
  async assignCase(caseId: string, assignedToId: string, assignedToName: string) {
    if (await ensureMongoStoreReady()) {
      const caseItem = await CaseModel.findOne({ id: caseId });
      if (!caseItem) {
        return null;
      }

      caseItem.assignedToId = assignedToId;
      caseItem.assignedToName = assignedToName;
      caseItem.status = "Assigned";
      caseItem.assignedAt = new Date().toISOString();
      caseItem.updatedAt = new Date().toISOString();
      await caseItem.save();
      return caseItem.toObject();
    }

    syncLocalEscalations();
    const caseItem = store.cases.find((item) => item.id === caseId);
    if (!caseItem) {
      return null;
    }

    caseItem.assignedToId = assignedToId;
    caseItem.assignedToName = assignedToName;
    caseItem.status = "Assigned";
    caseItem.assignedAt = new Date().toISOString();
    caseItem.updatedAt = new Date().toISOString();
    return cloneCase(caseItem);
  },
  async updateCase(caseId: string, input: UpdateCaseInput) {
    if (await ensureMongoStoreReady()) {
      const caseItem = await CaseModel.findOne({ id: caseId });
      if (!caseItem) {
        return null;
      }

      Object.assign(caseItem, input, { updatedAt: new Date().toISOString() });
      if (input.status && ["In Progress", "Pending", "Resolved"].includes(input.status) && !caseItem.firstResponseAt) {
        caseItem.firstResponseAt = new Date().toISOString();
      }

      await caseItem.save();
      return caseItem.toObject();
    }

    syncLocalEscalations();
    const caseItem = store.cases.find((item) => item.id === caseId);
    if (!caseItem) {
      return null;
    }

    Object.assign(caseItem, input, { updatedAt: new Date().toISOString() });
    if (input.status && ["In Progress", "Pending", "Resolved"].includes(input.status) && !caseItem.firstResponseAt) {
      caseItem.firstResponseAt = new Date().toISOString();
    }
    return cloneCase(caseItem);
  },
  async addNote(caseId: string, authorId: string, authorName: string, body: string) {
    if (await ensureMongoStoreReady()) {
      const caseItem = await CaseModel.findOne({ id: caseId });
      if (!caseItem) {
        return null;
      }

      caseItem.notes.unshift({
        id: `note-${crypto.randomUUID()}`,
        authorId,
        authorName,
        body,
        createdAt: new Date().toISOString(),
      });
      caseItem.updatedAt = new Date().toISOString();
      if (!caseItem.firstResponseAt) {
        caseItem.firstResponseAt = new Date().toISOString();
      }
      if (caseItem.status === "Assigned") {
        caseItem.status = "In Progress";
      }

      await caseItem.save();
      return caseItem.toObject();
    }

    syncLocalEscalations();
    const caseItem = store.cases.find((item) => item.id === caseId);
    if (!caseItem) {
      return null;
    }

    caseItem.notes.unshift({
      id: `note-${crypto.randomUUID()}`,
      authorId,
      authorName,
      body,
      createdAt: new Date().toISOString(),
    });
    caseItem.updatedAt = new Date().toISOString();
    if (!caseItem.firstResponseAt) {
      caseItem.firstResponseAt = new Date().toISOString();
    }
    if (caseItem.status === "Assigned") {
      caseItem.status = "In Progress";
    }
    return cloneCase(caseItem);
  },
  async getPolls() {
    if (await ensureMongoStoreReady()) {
      return PollModel.find({}).sort({ createdAt: -1 }).lean<PollDocument[]>();
    }

    return store.polls.map(clonePoll);
  },
  async createPoll(input: CreatePollInput) {
    const poll: Poll = {
      id: `poll-${crypto.randomUUID()}`,
      question: input.question,
      createdAt: new Date().toISOString(),
      createdById: input.createdById,
      createdByName: input.createdByName,
      voters: [],
      options: input.options.map((option) => ({
        id: `option-${crypto.randomUUID()}`,
        label: option,
        votes: 0,
      })),
    };

    if (await ensureMongoStoreReady()) {
      await PollModel.create(poll);
      return poll;
    }

    store.polls.unshift(poll);
    return clonePoll(poll);
  },
  async voteOnPoll(pollId: string, userId: string, optionId: string) {
    if (await ensureMongoStoreReady()) {
      const poll = await PollModel.findOne({ id: pollId });
      if (!poll || poll.voters.includes(userId)) {
        return null;
      }

      const option = poll.options.find((item: Poll["options"][number]) => item.id === optionId);
      if (!option) {
        return null;
      }

      option.votes += 1;
      poll.voters.push(userId);
      await poll.save();
      return poll.toObject();
    }

    const poll = store.polls.find((item) => item.id === pollId);
    if (!poll || poll.voters.includes(userId)) {
      return null;
    }
    const option = poll.options.find((item) => item.id === optionId);
    if (!option) {
      return null;
    }
    option.votes += 1;
    poll.voters.push(userId);
    return clonePoll(poll);
  },
  async getMinutes() {
    if (await ensureMongoStoreReady()) {
      return MinuteModel.find({}).sort({ uploadedAt: -1 }).lean<MinuteDocumentModel[]>();
    }

    return store.minutes.map(cloneMinute);
  },
  async addMinute(input: CreateMinuteInput) {
    const minute: MinuteDocument = {
      id: `minutes-${crypto.randomUUID()}`,
      title: input.title,
      quarter: input.quarter,
      uploadedAt: new Date().toISOString(),
      uploadedById: input.uploadedById,
      uploadedByName: input.uploadedByName,
      fileName: input.fileName,
      url: input.url,
    };

    if (await ensureMongoStoreReady()) {
      await MinuteModel.create(minute);
      return minute;
    }

    store.minutes.unshift(minute);
    return cloneMinute(minute);
  },
  async getAnalytics() {
    const caseItems = await getAllCases();
    const openStatuses: CaseStatus[] = ["New", "Assigned", "In Progress", "Pending", "Escalated"];
    const openCases = caseItems.filter((caseItem) => openStatuses.includes(caseItem.status));

    const byDepartment = Object.entries(
      openCases.reduce<Record<string, number>>((acc, caseItem) => {
        acc[caseItem.department] = (acc[caseItem.department] || 0) + 1;
        return acc;
      }, {}),
    ).map(([department, count]) => ({ department, count }));

    const byStatus = Object.entries(
      caseItems.reduce<Record<string, number>>((acc, caseItem) => {
        acc[caseItem.status] = (acc[caseItem.status] || 0) + 1;
        return acc;
      }, {}),
    ).map(([status, count]) => ({ status, count }));

    const byCategory = Object.entries(
      caseItems.reduce<Record<string, number>>((acc, caseItem) => {
        acc[caseItem.category] = (acc[caseItem.category] || 0) + 1;
        return acc;
      }, {}),
    ).map(([category, count]) => ({ category, count }));

    const hotspots = Object.entries(
      openCases.reduce<Record<string, number>>((acc, caseItem) => {
        const key = `${caseItem.department}::${caseItem.category}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count >= 5)
      .map(([key, count]) => {
        const [department, category] = key.split("::");
        return { department, category, count };
      });

    const summary: DashboardSummary = {
      totalCases: caseItems.length,
      openCases: openCases.length,
      escalatedCases: caseItems.filter((caseItem) => caseItem.status === "Escalated").length,
      resolvedCases: caseItems.filter((caseItem) => caseItem.status === "Resolved").length,
    };

    return { summary, byDepartment, byStatus, byCategory, hotspots };
  },
  async getPublicHubData() {
    const caseItems = await getAllCases();
    const minutes = await this.getMinutes();

    const resolvedCases = caseItems
      .filter((caseItem) => caseItem.status === "Resolved" || Boolean(caseItem.actionTaken))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

    const digest = resolvedCases.slice(0, 3).map((caseItem) => ({
      trackingId: caseItem.trackingId,
      title: caseItem.title,
      summary: caseItem.resolutionSummary || caseItem.actionTaken || "Resolution recorded by management.",
      updatedAt: caseItem.updatedAt,
    }));

    const impact = resolvedCases.map((caseItem) => ({
      trackingId: caseItem.trackingId,
      raised: caseItem.title,
      actionTaken: caseItem.actionTaken || "Action pending publication",
      changed: caseItem.impactChange || "Change log coming soon",
    }));

    return {
      digest,
      impact,
      minutes,
    };
  },
};
