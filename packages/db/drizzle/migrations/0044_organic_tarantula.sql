-- Only add the enum value here. Postgres forbids using a new enum value in the
-- same transaction it was added (55P04). Default is updated in 0045_right_archangel.sql
-- after the enum is recreated.
ALTER TYPE "public"."listing_stage" ADD VALUE 'upload' BEFORE 'categorize';