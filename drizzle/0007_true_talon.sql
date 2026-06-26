ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `tenantRole` enum('clinic_admin','staff') DEFAULT 'staff';