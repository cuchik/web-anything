CREATE TABLE `analysis_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`response_json` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
