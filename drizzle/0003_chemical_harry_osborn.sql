CREATE TABLE `clinicDoctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`specialty` varchar(128),
	`phone` varchar(32),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinicDoctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surgeries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`surgeryTypeId` int NOT NULL,
	`surgeryDate` timestamp NOT NULL,
	`notes` text,
	`status` enum('scheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surgeries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surgeryTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surgeryTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `prescriptions` ADD `treatmentName` varchar(256);--> statement-breakpoint
CREATE INDEX `idx_surgeries_patientId` ON `surgeries` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_surgeries_doctorId` ON `surgeries` (`doctorId`);--> statement-breakpoint
CREATE INDEX `idx_surgeries_date` ON `surgeries` (`surgeryDate`);--> statement-breakpoint
CREATE INDEX `idx_surgeries_status` ON `surgeries` (`status`);