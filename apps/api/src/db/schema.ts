import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "plus", "premium"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const storyStatusEnum = pgEnum("story_status", ["draft", "ongoing", "completed", "paused"]);
export const storyVisibilityEnum = pgEnum("story_visibility", ["private", "unlisted", "public"]);
export const chapterStatusEnum = pgEnum("chapter_status", ["draft", "published", "archived"]);
export const versionReasonEnum = pgEnum("version_reason", [
  "autosave",
  "manual",
  "publish",
  "restore",
  "ai_snapshot",
]);
export const analysisStatusEnum = pgEnum("analysis_status", ["queued", "running", "completed", "failed"]);
export const memoryStatusEnum = pgEnum("memory_status", ["proposed", "confirmed", "rejected"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "reviewing", "resolved", "dismissed"]);
export const plotStatusEnum = pgEnum("plot_status", ["planned", "active", "resolved", "abandoned"]);
export const ideaKindEnum = pgEnum("idea_kind", [
  "scene",
  "dialogue",
  "character",
  "revelation",
  "research",
  "note",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    plan: planEnum("plan").notNull().default("free"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pseudonym: text("pseudonym").notNull(),
    bio: text("bio").notNull().default(""),
    avatarMotif: text("avatar_motif").notNull().default("quill"),
    goal: text("goal"),
    experience: text("experience"),
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("profiles_user_unique").on(table.userId),
    uniqueIndex("profiles_pseudonym_unique").on(table.pseudonym),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifications: jsonb("notifications")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({ newChapters: true, comments: true, coaching: true, progress: true }),
    readingTheme: text("reading_theme").notNull().default("night"),
    writingTheme: text("writing_theme").notNull().default("night"),
    fontScale: real("font_scale").notNull().default(1),
    reduceMotion: boolean("reduce_motion").notNull().default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("preferences_user_unique").on(table.userId)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_unique").on(table.tokenHash),
    index("refresh_tokens_user_idx").on(table.userId),
  ],
);

export const authTokenKindEnum = pgEnum("auth_token_kind", [
  "email_verification",
  "password_reset",
]);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: authTokenKindEnum("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash),
    index("auth_tokens_user_kind_idx").on(table.userId, table.kind),
    index("auth_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    synopsis: text("synopsis"),
    genre: text("genre"),
    secondaryGenres: jsonb("secondary_genres").$type<string[]>().notNull().default([]),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    language: text("language").notNull().default("fr"),
    audience: text("audience").notNull().default("all"),
    contentWarnings: jsonb("content_warnings").$type<string[]>().notNull().default([]),
    status: storyStatusEnum("status").notNull().default("draft"),
    visibility: storyVisibilityEnum("visibility").notNull().default("private"),
    coverMotif: text("cover_motif").notNull().default("arch"),
    coverAssetUrl: text("cover_asset_url"),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("stories_author_idx").on(table.authorId, table.updatedAt),
    index("stories_visibility_idx").on(table.visibility, table.status),
    index("stories_genre_idx").on(table.genre),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    status: chapterStatusEnum("status").notNull().default("draft"),
    orderIndex: integer("order_index").notNull().default(0),
    version: integer("version").notNull().default(1),
    lastMutationId: text("last_mutation_id"),
    lastSnapshotAt: timestamp("last_snapshot_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("chapters_story_order_idx").on(table.storyId, table.orderIndex),
    index("chapters_status_idx").on(table.status),
  ],
);

export const chapterVersions = pgTable(
  "chapter_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    contentHash: text("content_hash").notNull(),
    reason: versionReasonEnum("reason").notNull().default("autosave"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("chapter_versions_unique").on(table.chapterId, table.versionNumber),
    index("chapter_versions_chapter_idx").on(table.chapterId, table.createdAt),
  ],
);

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => chapterVersions.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true }),
  },
  (table) => [index("publications_chapter_idx").on(table.chapterId, table.publishedAt)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.authorId] }),
    index("follows_author_idx").on(table.authorId),
  ],
);

export const storyFollows = pgTable(
  "story_follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.storyId] }),
    index("story_follows_story_idx").on(table.storyId),
  ],
);

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    progress: real("progress").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reading_progress_unique").on(table.userId, table.storyId),
    index("reading_progress_story_idx").on(table.storyId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bookmarks_user_idx").on(table.userId, table.createdAt)],
);

export const readingLists = pgTable(
  "reading_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reading_lists_user_idx").on(table.userId)],
);

export const readingListItems = pgTable(
  "reading_list_items",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => readingLists.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.listId, table.storyId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("comments_story_idx").on(table.storyId, table.createdAt),
    index("comments_chapter_idx").on(table.chapterId, table.createdAt),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("heart"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reactions_unique").on(table.commentId, table.userId, table.kind)],
);

export const storyReactions = pgTable(
  "story_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("story_reactions_unique").on(table.storyId, table.userId, table.kind),
    index("story_reactions_story_idx").on(table.storyId, table.kind),
  ],
);

export const chapterLikes = pgTable(
  "chapter_likes",
  {
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chapterId, table.userId] }),
    index("chapter_likes_story_idx").on(table.storyId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("reports_status_idx").on(table.status, table.createdAt)],
);

export const moderationActions = pgTable("moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    provider: text("provider").notNull().default("google_play"),
    providerRef: text("provider_ref"),
    status: text("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("subscriptions_user_idx").on(table.userId, table.status)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull().default("true"),
    source: text("source").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("entitlements_unique").on(table.userId, table.key)],
);

export const aiUsageRecords = pgTable(
  "ai_usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }),
    analysisId: uuid("analysis_id"),
    taskKind: text("task_kind").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_usage_user_idx").on(table.userId, table.createdAt)],
);

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    chapterVersionId: uuid("chapter_version_id").references(() => chapterVersions.id, {
      onDelete: "set null",
    }),
    skill: text("skill").notNull(),
    scope: text("scope").notNull().default("chapter"),
    status: analysisStatusEnum("status").notNull().default("queued"),
    summary: text("summary"),
    score: integer("score"),
    confidence: real("confidence"),
    provider: text("provider").notNull().default("mock"),
    model: text("model").notNull().default("mock-pedagogue-v1"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("analyses_user_idx").on(table.userId, table.createdAt),
    index("analyses_story_idx").on(table.storyId, table.createdAt),
  ],
);

export const analysisFindings = pgTable(
  "analysis_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => aiAnalyses.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    observation: text("observation").notNull(),
    quote: text("quote"),
    explanation: text("explanation").notNull(),
    impact: text("impact"),
    priority: text("priority").notNull().default("medium"),
    confidence: real("confidence").notNull().default(0.5),
    recommendation: text("recommendation"),
    exercise: text("exercise"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [index("findings_analysis_idx").on(table.analysisId, table.orderIndex)],
);

export const skillAssessments = pgTable(
  "skill_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").references(() => aiAnalyses.id, { onDelete: "set null" }),
    skill: text("skill").notNull(),
    score: integer("score").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    methodVersion: text("method_version").notNull().default("plume-rubric-v1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assessments_user_skill_idx").on(table.userId, table.skill, table.createdAt)],
);

export const exerciseAttempts = pgTable(
  "exercise_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    status: text("status").notNull().default("started"),
    feedback: text("feedback"),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    improvements: jsonb("improvements").$type<string[]>().notNull().default([]),
    nextStep: text("next_step"),
    score: integer("score"),
    confidence: real("confidence"),
    feedbackProvider: text("feedback_provider"),
    feedbackModel: text("feedback_model"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exercise_attempts_user_idx").on(table.userId, table.createdAt)],
);

export const coachingSessions = pgTable("coaching_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Conversation avec le coach"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coachingMessages = pgTable(
  "coaching_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => coachingSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<Array<{ chapterId: string; quote: string }>>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("coaching_messages_session_idx").on(table.sessionId, table.createdAt)],
);

export const narrativeMemoryEntries = pgTable(
  "narrative_memory_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    key: text("key").notNull(),
    content: text("content").notNull(),
    sourceChapterId: uuid("source_chapter_id").references(() => chapters.id, {
      onDelete: "set null",
    }),
    sourceQuote: text("source_quote"),
    sourceVersion: integer("source_version"),
    confidence: real("confidence").notNull().default(0.5),
    status: memoryStatusEnum("status").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("memory_story_idx").on(table.storyId, table.status)],
);

export const memoryEvidence = pgTable("memory_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  memoryEntryId: uuid("memory_entry_id")
    .notNull()
    .references(() => narrativeMemoryEntries.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  quote: text("quote").notNull(),
  version: integer("version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    summary: text("summary"),
    motivation: text("motivation"),
    fear: text("fear"),
    secret: text("secret"),
    arc: text("arc"),
    notes: text("notes"),
    customFields: jsonb("custom_fields").$type<Array<{ label: string; value: string }>>().notNull().default([]),
    ...timestamps,
  },
  (table) => [index("characters_story_idx").on(table.storyId, table.name)],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    atmosphere: text("atmosphere"),
    history: text("history"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("locations_story_idx").on(table.storyId, table.name)],
);

export const plotThreads = pgTable(
  "plot_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    stakes: text("stakes"),
    status: plotStatusEnum("status").notNull().default("planned"),
    resolution: text("resolution"),
    ...timestamps,
  },
  (table) => [index("plots_story_idx").on(table.storyId)],
);

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    fictionalDate: text("fictional_date"),
    narrativeOrder: integer("narrative_order").notNull().default(0),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    consequences: text("consequences"),
    ...timestamps,
  },
  (table) => [index("events_story_idx").on(table.storyId, table.narrativeOrder)],
);

export const storyIdeas = pgTable(
  "story_ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    kind: ideaKindEnum("kind").notNull().default("note"),
    convertedToType: text("converted_to_type"),
    convertedToId: uuid("converted_to_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ideas_story_idx").on(table.storyId, table.createdAt)],
);

export const storyPlans = pgTable(
  "story_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Plan"),
    structure: jsonb("structure").$type<unknown>().notNull().default([]),
    ...timestamps,
  },
  (table) => [index("plans_story_idx").on(table.storyId)],
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("jobs_status_idx").on(table.status, table.createdAt)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_actor_idx").on(table.actorId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Analysis = typeof aiAnalyses.$inferSelect;
