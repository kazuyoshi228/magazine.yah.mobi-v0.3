CREATE TABLE `ai_crawl_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crawlerName` varchar(64) NOT NULL,
	`path` varchar(512) NOT NULL,
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_crawl_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cta_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target` enum('yah_mobile','yah_homes','esim_buy','esim_hero','esim_article') NOT NULL,
	`sourcePath` varchar(512) NOT NULL,
	`articleId` int,
	`sessionId` varchar(64),
	`lang` varchar(8),
	`referrer` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cta_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(512) NOT NULL,
	`articleId` int,
	`sessionId` varchar(64),
	`lang` varchar(8),
	`country` varchar(8),
	`referrer` varchar(512),
	`userAgent` varchar(256),
	`isAiCrawler` boolean NOT NULL DEFAULT false,
	`crawlerName` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
