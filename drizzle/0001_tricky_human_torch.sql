CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`appointmentDate` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`reason` text,
	`notes` text,
	`status` enum('pending','completed','cancelled','no-show') NOT NULL DEFAULT 'pending',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnoses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64),
	`color` varchar(16) DEFAULT '#3B82F6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnoses_id` PRIMARY KEY(`id`),
	CONSTRAINT `diagnoses_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `medicalFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`visitId` int,
	`uploadedBy` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`originalName` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int,
	`category` enum('lab','xray','mri','ct','ultrasound','report','prescription','other') NOT NULL DEFAULT 'other',
	`description` text,
	`annotations` json,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medicalFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` varchar(16) NOT NULL,
	`fullName` varchar(256) NOT NULL,
	`gender` enum('male','female','other') NOT NULL,
	`dateOfBirth` timestamp,
	`phone` varchar(32),
	`address` text,
	`occupation` varchar(128),
	`bloodType` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') DEFAULT 'unknown',
	`allergies` text,
	`chronicDiseases` text,
	`emergencyContactName` varchar(256),
	`emergencyContactPhone` varchar(32),
	`emergencyContactRelation` varchar(64),
	`medicalNotes` text,
	`status` enum('new','follow-up','stable','critical') NOT NULL DEFAULT 'new',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedBy` int,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientId_unique` UNIQUE(`patientId`)
);
--> statement-breakpoint
CREATE TABLE `prescriptionTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`doctorId` int NOT NULL,
	`medications` json NOT NULL,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescriptionTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`visitId` int,
	`doctorId` int NOT NULL,
	`prescriptionDate` timestamp NOT NULL DEFAULT (now()),
	`medications` json NOT NULL,
	`notes` text,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`visitDate` timestamp NOT NULL,
	`chiefComplaint` text,
	`symptoms` text,
	`diagnosisText` text,
	`diagnosisTags` json DEFAULT ('[]'),
	`bloodPressureSystolic` int,
	`bloodPressureDiastolic` int,
	`heartRate` int,
	`temperature` decimal(4,1),
	`weight` decimal(5,1),
	`height` decimal(5,1),
	`oxygenSaturation` int,
	`respiratoryRate` int,
	`doctorNotes` text,
	`followUpDate` timestamp,
	`followUpNotes` text,
	`status` enum('scheduled','in-progress','completed','cancelled') NOT NULL DEFAULT 'completed',
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor','assistant') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `specialty` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_activity_userId` ON `activityLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_activity_entityType` ON `activityLogs` (`entityType`);--> statement-breakpoint
CREATE INDEX `idx_activity_createdAt` ON `activityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_appointments_patientId` ON `appointments` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_appointments_doctorId` ON `appointments` (`doctorId`);--> statement-breakpoint
CREATE INDEX `idx_appointments_date` ON `appointments` (`appointmentDate`);--> statement-breakpoint
CREATE INDEX `idx_files_patientId` ON `medicalFiles` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_files_visitId` ON `medicalFiles` (`visitId`);--> statement-breakpoint
CREATE INDEX `idx_files_category` ON `medicalFiles` (`category`);--> statement-breakpoint
CREATE INDEX `idx_patients_fullName` ON `patients` (`fullName`);--> statement-breakpoint
CREATE INDEX `idx_patients_phone` ON `patients` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_patients_status` ON `patients` (`status`);--> statement-breakpoint
CREATE INDEX `idx_patients_isDeleted` ON `patients` (`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_prescriptions_patientId` ON `prescriptions` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_prescriptions_visitId` ON `prescriptions` (`visitId`);--> statement-breakpoint
CREATE INDEX `idx_visits_patientId` ON `visits` (`patientId`);--> statement-breakpoint
CREATE INDEX `idx_visits_doctorId` ON `visits` (`doctorId`);--> statement-breakpoint
CREATE INDEX `idx_visits_visitDate` ON `visits` (`visitDate`);