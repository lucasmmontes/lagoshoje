import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    summaryGeneratedBy: text("summary_generated_by").notNull().default("metadata"),
    category: text("category").notNull().default("Cidades"),
    area: text("area").notNull().default("Capital e Grande Rio"),
    city: text("city"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    originalUrl: text("original_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("news_articles_original_url_unique").on(table.originalUrl),
    index("news_articles_published_at_idx").on(table.publishedAt),
    index("news_articles_category_idx").on(table.category),
    index("news_articles_area_idx").on(table.area),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [uniqueIndex("admin_users_email_unique").on(table.email)],
);

export const newsSyncRuns = pgTable(
  "news_sync_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull().default("running"),
    insertedCount: integer("inserted_count").notNull().default(0),
    sourcesChecked: integer("sources_checked").notNull().default(0),
    errorSummary: text("error_summary"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [index("news_sync_runs_requested_at_idx").on(table.requestedAt)],
);
