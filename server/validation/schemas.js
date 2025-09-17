// server/validation/schemas.js
const { z } = require('zod');

/* -------------------------- Reusable helpers -------------------------- */
const UUID = z.string().uuid('Invalid id');

const nonEmpty = (min, max) => z.string().trim().min(min).max(max);
const title120 = nonEmpty(3, 120);

// Keep microtask status in sync with your app
const microStatus = z.enum(['todo', 'in_progress', 'done', 'blocked']);

// Match the values you actually accept in updateGoalStatus()
const goalStatus = z.enum(['not_started', 'in_progress', 'done']);

const emailLower = z
  .string()
  .email('Invalid email')
  .transform((e) => e.toLowerCase());

/* ------------------------------- Auth -------------------------------- */
const auth = {
  register: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    email: emailLower,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    // allow number or string; store as string if provided
    telegram_id: z.union([z.string(), z.number()]).transform(String).optional(),
  }),
  login: z.object({
    email: emailLower,
    password: z.string().min(1, 'Password is required'),
  }),
};

/* ---------------------------- Goal shapes ----------------------------- */
// Input shapes used by AI breakdown and manual subgoal entry
const MicrotaskList = z.array(nonEmpty(2, 160)).default([]);

const TaskInput = z.object({
  title: title120,
  microtasks: MicrotaskList.optional().default([]),
});

const SubgoalInput = z.object({
  title: title120,
  tasks: z.array(TaskInput).optional().default([]),
});

/* ------------------------------- Users ------------------------------- */
const UserPatchSchema = z.object({
  name: nonEmpty(2, 100).optional(),
  email: emailLower.optional(),
  telegram_id: z.union([z.string(), z.number()]).transform(String).optional(),
  timezone: z.string().trim().min(2).max(64).optional(), // server will normalize
  plan: z.enum(['free', 'pro']).optional(),
  plan_status: z.enum(['active', 'inactive', 'past_due']).optional(),
  telegram_enabled: z.boolean().optional(),
});

const UserIdParam = z.object({ id: UUID });
const UserDashboardParams = z.object({ userId: UUID });

/* ------------------------------- Goals ------------------------------- */
const GoalCreateSchema = z.object({
  title: title120,
  description: z.string().trim().max(1000).optional(),
  tone: z.enum(['friendly', 'strict', 'motivational']).optional(),
  due_date: z.union([z.string(), z.date()]).optional(),

  // Support either new "breakdown" or legacy "subgoals"
  breakdown: z.array(SubgoalInput).optional().default([]),
  subgoals: z.array(SubgoalInput).optional().default([]),
});

const GoalUpdateSchema = z.object({
  title: title120.optional(),
  description: z.string().trim().max(1000).optional(),
  tone: z.enum(['friendly', 'strict', 'motivational']).optional(),
  due_date: z.union([z.string(), z.date()]).optional(),
  status: goalStatus.optional(),
});

const IdParam = z.object({ id: UUID });

/* ------------------------------ Subgoals ----------------------------- */
const SubgoalCreateSchema = z.object({
  goal_id: UUID,
  title: title120,
  position: z.number().finite().optional(),
});

const SubgoalUpdateSchema = z.object({
  title: title120.optional(),
  position: z.number().finite().optional(),
});

/* ------------------------------- Tasks ------------------------------- */
const TaskCreateSchema = z.object({
  subgoal_id: UUID,
  title: title120,
  position: z.number().finite().optional(),
});

const TaskUpdateSchema = z.object({
  title: title120.optional(),
  position: z.number().finite().optional(),
});

/* ---------------------------- Microtasks ----------------------------- */
const MicrotaskCreateSchema = z.object({
  task_id: UUID,
  title: nonEmpty(2, 160),
  position: z.number().finite().optional(),
  status: microStatus.optional(),
});

const MicrotaskUpdateSchema = z.object({
  title: nonEmpty(2, 160).optional(),
  position: z.number().finite().optional(),
  status: microStatus.optional(),
});

const MicrotaskStatusBody = z.object({ status: microStatus });

/* ------------------------------ Exports ------------------------------ */
module.exports = {
  auth,

  // common params
  IdParam,
  UserIdParam,
  UserDashboardParams,

  // users
  UserPatchSchema,

  // goals
  GoalCreateSchema,
  GoalUpdateSchema,

  // subgoals
  SubgoalCreateSchema,
  SubgoalUpdateSchema,

  // tasks
  TaskCreateSchema,
  TaskUpdateSchema,

  // microtasks
  MicrotaskCreateSchema,
  MicrotaskUpdateSchema,
  MicrotaskStatusBody,
};
