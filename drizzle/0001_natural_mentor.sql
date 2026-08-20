CREATE TABLE `orbit_agents` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`systemPrompt` text NOT NULL,
	`modelId` varchar(160),
	`memoryEnabled` boolean NOT NULL DEFAULT true,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orbit_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orbit_files` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`threadId` varchar(32),
	`name` varchar(180) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(700) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`size` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orbit_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orbit_memory_notes` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(32),
	`content` text NOT NULL,
	`source` enum('user','agent','chat') NOT NULL DEFAULT 'user',
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orbit_memory_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orbit_messages` (
	`id` varchar(32) NOT NULL,
	`threadId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orbit_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orbit_threads` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(32),
	`title` varchar(180) NOT NULL,
	`modelId` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orbit_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orbit_user_settings` (
	`userId` int NOT NULL,
	`defaultModel` varchar(160),
	`defaultSystemPrompt` text,
	`behavior` enum('balanced','concise','detailed') NOT NULL DEFAULT 'balanced',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orbit_user_settings_userId` PRIMARY KEY(`userId`)
);
