ALTER TABLE `tenants` ADD `botApiKey` varchar(64);--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_botApiKey_unique` UNIQUE(`botApiKey`);