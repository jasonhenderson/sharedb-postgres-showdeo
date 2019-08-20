-- ----------------------------
--  Table structure for resource_op
-- ----------------------------
-- DROP TABLE IF EXISTS "show1"."resource_op";
CREATE TABLE "resource_op" (
	"id" int8 not null, // replaces doc_id
	"collection_id" int2 not null, // replaces collection
	"version" int4 not null,
	"account_id" int8 not null,
	"operation" jsonb not null, -- {v:0, create:{...}} or {v:n, op:[...]}
	"created_at" date NOT NULL DEFAULT ('now'::text)::date
);

-- ----------------------------
--  Primary key structure for table resource_op
-- ----------------------------
ALTER TABLE "show1"."resource_op" ADD PRIMARY KEY ("id", "version") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Table structure for resource_snapshot
-- ----------------------------
-- DROP TABLE IF EXISTS "show1"."resource_snapshot";
CREATE TABLE "resource_snapshot" (
	"id" int8 NOT NULL, // replaces doc_id
	"collection_id" int2 NOT NULL, // replaces collection
	"account_id" int8  NOT NULL,
	"data_type" character varying(255) NULL,
	"version" int4 NOT NULL,
	"data" jsonb NULL,
	"forked_from_id" int8 NULL,
	"forked_from_version" int4 NULL,
	"created_at" date NOT NULL DEFAULT ('now'::text)::date,
	"updated_at" date NOT NULL DEFAULT ('now'::text)::date
);

-- ----------------------------
--  Primary key structure for table resource_snapshot
-- ----------------------------
ALTER TABLE "show1"."resource_snapshot" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;


-- ----------------------------
--  Foreign keys structure for table resource_snapshot
-- ----------------------------
ALTER TABLE "show1"."resource_snapshot" ADD CONSTRAINT "fk_shared_collection_id" FOREIGN KEY ("collection_id") REFERENCES "show1"."shared_collection" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION NOT DEFERRABLE INITIALLY IMMEDIATE;
