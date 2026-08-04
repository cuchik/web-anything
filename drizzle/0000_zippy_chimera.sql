CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`image_url` text NOT NULL,
	`recipe_json` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recipes_owner_created_idx` ON `recipes` (`owner_key`,`created_at`);