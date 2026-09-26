import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    // Optional: added after sign-in, and only needed for password recovery.
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    passwordIterations: integer("password_iterations").notNull(),
    emailVerifiedAt: integer("email_verified_at"),
    emailVersion: integer("email_version").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_username_idx").on(table.username),
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)],
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    purpose: text("purpose").notNull(),
    // Legacy tokens remain unbound and cannot be redeemed.
    emailVersion: integer("email_version"),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("auth_tokens_user_purpose_idx").on(table.userId, table.purpose), index("auth_tokens_expiry_idx").on(table.expiresAt)],
);

export const recipes = sqliteTable(
  "recipes",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    imageUrl: text("image_url").notNull(),
    recipeJson: text("recipe_json").notNull(),
    promptVersion: text("prompt_version").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("recipes_owner_created_idx").on(table.ownerKey, table.createdAt)],
);

export const apiRateLimits = sqliteTable("api_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
}, (table) => [index("api_rate_limits_reset_idx").on(table.resetAt)]);

export const analysisCache = sqliteTable("analysis_cache", {
  key: text("key").primaryKey(),
  responseJson: text("response_json").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("analysis_cache_expiry_idx").on(table.expiresAt)]);
