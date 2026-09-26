CREATE INDEX `analysis_cache_expiry_idx` ON `analysis_cache` (`expires_at`);--> statement-breakpoint
CREATE INDEX `api_rate_limits_reset_idx` ON `api_rate_limits` (`reset_at`);--> statement-breakpoint
CREATE INDEX `auth_tokens_expiry_idx` ON `auth_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);