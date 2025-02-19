import { isNotNull, relations } from "drizzle-orm";
import {
  timestamp,
  pgTable,
  text,
  pgEnum,
  varchar,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { AttendanceName } from "@/types/attendance";
import { RoleName } from "@/types/roles";

export const userRoleEnum = pgEnum(
  "user_role",
  Object.values(RoleName) as [RoleName, ...RoleName[]]
);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "eft",
  "payment_gateway",
]);

export const attendanceStatusEnum = pgEnum(
  "attendance_status",
  Object.values(AttendanceName) as [AttendanceName, ...AttendanceName[]]
);

export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: userRoleEnum("role").notNull(),
  image: varchar("image", { length: 255 }),
});

export const departmentsTable = pgTable("departments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const coursesTable = pgTable("course", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  departmentId: varchar("departmentId", { length: 255 })
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const fields = pgTable("field", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  courseId: varchar("courseId", { length: 255 })
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
});

export const lessonRostersTable = pgTable("lessonRoster", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  courseId: varchar("courseId", { length: 255 })
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),
  creatorId: varchar("creatorId", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const marks = pgTable("mark", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fieldId: varchar("fieldId", { length: 255 })
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  studentId: varchar("studentId", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  lessonRosterId: varchar("lessonRosterId", { length: 255 })
    .notNull()
    .references(() => lessonRostersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
});

export const attendanceTable = pgTable("attendance", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: varchar("studentId", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  periodId: varchar("periodId", { length: 255 })
    .notNull()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  type: attendanceStatusEnum("type").default(AttendanceName.PRESENT).notNull(),
});

export const coursesToAcademies = pgTable("courseToAcademy", {
  courseId: varchar("courseId", { length: 255 })
    .notNull()
    .references(() => coursesTable.id, { onDelete: "cascade" }),
  departmentId: varchar("departmentId", { length: 255 })
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "cascade" }),
});

export const studentsToLessonRosters = pgTable("studentToLessonRoster", {
  studentId: varchar("studentId", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  lessonRosterId: varchar("lessonRosterId", { length: 255 })
    .notNull()
    .references(() => lessonRostersTable.id, { onDelete: "cascade" }),
});

export const departmentLeadersToDepartments = pgTable(
  "departmentLeadersToAcademy",
  {
    departmentId: varchar("departmentId", { length: 255 })
      .notNull()
      .references(() => departmentsTable.id, { onDelete: "cascade" }),
    departmentLeaderId: varchar("departmentLeaderId", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  }
);

export const lecturerToAcademy = pgTable("lecturerToAcademy", {
  departmentId: varchar("departmentId", { length: 255 })
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "cascade" }),
  lecturerId: varchar("lecturerId", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});
