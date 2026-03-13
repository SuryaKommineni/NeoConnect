import bcrypt from "bcryptjs";
import { Schema, model, models } from "mongoose";
import { seedUsers } from "@/lib/demo-data";
import { connectToDatabase, hasDatabaseConfig, isDatabaseReady } from "@/lib/db";
import { repo } from "@/lib/server-store";
import type { Role, User } from "@/lib/types";

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  passwordHash?: string;
  password?: string;
};

type CreateAuthUserInput = {
  name: string;
  email: string;
  password: string;
  department: string;
  role?: Role;
};

type UserDocument = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department: string;
};

const userSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["staff", "secretariat", "caseManager", "admin"], required: true },
    department: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const AuthUserModel = models.AuthUser || model<UserDocument>("AuthUser", userSchema);

let seedPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapMongoUser(user: UserDocument): AuthUserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    passwordHash: user.passwordHash,
  };
}

function mapPublicUser(user: AuthUserRecord): Omit<User, "password"> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };
}

async function ensureMongoUsersReady() {
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
        seedUsers.map(async (user) => {
          const passwordHash = await bcrypt.hash(user.password, 10);
          await AuthUserModel.updateOne(
            { id: user.id },
            {
              $setOnInsert: {
                id: user.id,
                name: user.name,
                email: normalizeEmail(user.email),
                passwordHash,
                role: user.role,
                department: user.department,
              },
            },
            { upsert: true },
          );
        }),
      );
    })();
  }

  await seedPromise;
  return true;
}

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (await ensureMongoUsersReady()) {
    const user = await AuthUserModel.findOne({ email: normalizedEmail }).lean<UserDocument | null>();
    return user ? mapMongoUser(user) : null;
  }

  const user = repo.getUserByEmail(normalizedEmail);
  return user ? { ...user } : null;
}

export async function findAuthUserById(id: string) {
  if (await ensureMongoUsersReady()) {
    const user = await AuthUserModel.findOne({ id }).lean<UserDocument | null>();
    return user ? mapMongoUser(user) : null;
  }

  const user = repo.getUsers().find((item) => item.id === id);
  return user ? { ...user } : null;
}

export async function listAssignableAuthUsers() {
  if (await ensureMongoUsersReady()) {
    const users = await AuthUserModel.find({ role: "caseManager" }).sort({ name: 1 }).lean<UserDocument[]>();
    return users.map((user) => mapPublicUser(mapMongoUser(user)));
  }

  return repo.getAssignableCaseManagers().map((user) => mapPublicUser(user));
}

export async function registerAuthUser(input: CreateAuthUserInput) {
  const normalizedEmail = normalizeEmail(input.email);

  if (await ensureMongoUsersReady()) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await AuthUserModel.create({
      id: `user-${crypto.randomUUID()}`,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: input.role ?? "staff",
      department: input.department.trim(),
    });

    return mapPublicUser(mapMongoUser(user.toObject()));
  }

  const user = repo.createUser({
    ...input,
    email: normalizedEmail,
  });

  return mapPublicUser(user);
}

export async function verifyAuthCredentials(email: string, password: string) {
  const user = await findAuthUserByEmail(email);
  if (!user) {
    return null;
  }

  const validPassword = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : user.password === password;
  if (!validPassword) {
    return null;
  }

  return mapPublicUser(user);
}
