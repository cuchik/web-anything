ALTER TABLE `auth_tokens` ADD `email_version` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_version` integer DEFAULT 0 NOT NULL;