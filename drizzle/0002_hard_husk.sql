CREATE TABLE `orbit_local_accounts` (
	`userId` int NOT NULL,
	`username` varchar(48) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orbit_local_accounts_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `orbit_local_accounts_username_unique` UNIQUE(`username`)
);
