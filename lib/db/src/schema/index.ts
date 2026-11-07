import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// 1. USERS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).unique().notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. STUDENTS
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNumber: varchar("student_number", { length: 50 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: integer("age"),
  faculty: varchar("faculty", { length: 150 }),
  programme: varchar("programme", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. ACADEMIC RECORDS
export const academicRecords = pgTable("academic_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => students.id)
    .notNull(),
  academicYear: integer("academic_year").notNull(),
  semester: varchar("semester", { length: 30 }),
  gpa: numeric("gpa", { precision: 4, scale: 2 }),
  assignmentAverage: numeric("assignment_average", { precision: 5, scale: 2 }),
  testAverage: numeric("test_average", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. ATTENDANCE
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => students.id)
    .notNull(),
  attendancePercentage: numeric("attendance_percentage", {
    precision: 5,
    scale: 2,
  }),
  totalClasses: integer("total_classes"),
  attendedClasses: integer("attended_classes"),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 5. LMS ACTIVITY
export const lmsActivity = pgTable("lms_activity", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => students.id)
    .notNull(),
  weeklyLogins: integer("weekly_logins"),
  assignmentSubmissionRate: numeric("assignment_submission_rate", {
    precision: 5,
    scale: 2,
  }),
  resourceDownloads: integer("resource_downloads"),
  discussionParticipation: integer("discussion_participation"),
  sessionDuration: integer("session_duration"),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 6. PREDICTIONS
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => students.id)
    .notNull(),
  riskLevel: varchar("risk_level", { length: 30 }).notNull(),
  riskProbability: numeric("risk_probability", { precision: 6, scale: 5 }),
  modelName: varchar("model_name", { length: 100 }),
  modelVersion: varchar("model_version", { length: 50 }),
  shapExplanation: jsonb("shap_explanation"),
  predictionDate: timestamp("prediction_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 7. INTERVENTIONS
export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .references(() => students.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  interventionType: varchar("intervention_type", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("Open").notNull(),
  interventionDate: timestamp("intervention_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  followUpDate: date("follow_up_date"),
});
