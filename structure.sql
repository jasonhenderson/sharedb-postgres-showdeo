-- ----------------------------
--  Table structure for shared_op
-- ----------------------------
-- DROP TABLE IF EXISTS "show1"."shared_op";
CREATE TABLE "shared_op" (
	"data_id" int8 not null, // replaces doc_id
	"collection_id" int2 not null, // replaces collection
	"version" int4 not null,
	"account_id" int8 not null,
	"operation" jsonb not null, -- {v:0, create:{...}} or {v:n, op:[...]}
	"created_at" date NOT NULL DEFAULT ('now'::text)::date
);

-- ----------------------------
--  Primary key structure for table shared_op
-- ----------------------------
ALTER TABLE "show1"."shared_op" ADD PRIMARY KEY ("data_id", "version") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Table structure for shared_snapshot
-- ----------------------------
-- DROP TABLE IF EXISTS "show1"."shared_snapshot";
CREATE TABLE "shared_snapshot" (
	"data_id" int8 NOT NULL, // replaces doc_id
	"collection_id" int2 NOT NULL, // replaces collection
	"account_id" int8  NOT NULL,
	"data_type" character varying(255) NULL,
	"version" int4 NOT NULL,
	"data" jsonb NULL,
	"forked_from_data_id" int8 NULL,
	"forked_from_version" int4 NULL,
	"created_at" date NOT NULL DEFAULT ('now'::text)::date,
	"updated_at" date NOT NULL DEFAULT ('now'::text)::date
);

-- ----------------------------
--  Primary key structure for table shared_snapshot
-- ----------------------------
ALTER TABLE "show1"."shared_snapshot" ADD PRIMARY KEY ("data_id") NOT DEFERRABLE INITIALLY IMMEDIATE;


-- ----------------------------
--  Foreign keys structure for table shared_snapshot
-- ----------------------------
ALTER TABLE "show1"."shared_snapshot" ADD CONSTRAINT "fk_shared_collection_id" FOREIGN KEY ("collection_id") REFERENCES "show1"."shared_collection" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION NOT DEFERRABLE INITIALLY IMMEDIATE;
