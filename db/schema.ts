import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
});

export const analysisCache = sqliteTable("analysis_cache", {
  key: text("key").primaryKey(),
  responseJson: text("response_json").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});
