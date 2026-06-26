CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicName` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`plan` enum('demo','monthly','quarterly','yearly') NOT NULL DEFAULT 'demo',
	`status` enum('pending','active','expired','suspended') NOT NULL DEFAULT 'pending',
	`activationToken` varchar(128),
	`activationTokenExpiresAt` timestamp,
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_tenants_email` ON `tenants` (`email`);--> statement-breakpoint
CREATE INDEX `idx_tenants_status` ON `tenants` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tenants_activationToken` ON `tenants` (`activationToken`);