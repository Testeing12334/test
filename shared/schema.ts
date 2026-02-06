import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const identities = pgTable("identities", {
  id: serial("id").primaryKey(),
  passportHash: text("passport_hash").notNull().unique(), // SHA-256 of Passport ID
  encryptedData: text("encrypted_data").notNull(), // JSON blob containing { name: Enc(Name), age: Enc(Age), ... }
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertIdentitySchema = createInsertSchema(identities).omit({
  id: true,
  createdAt: true,
});

// === API CONTRACT TYPES ===
export type Identity = typeof identities.$inferSelect;
export type InsertIdentity = z.infer<typeof insertIdentitySchema>;

// Input for Registration (Raw data - assuming Taakad encrypts it for storage)
export const registerIdentitySchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  age: z.number().min(18, "Must be 18+"),
  passportId: z.string().min(5, "Invalid Passport ID"),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  verificationCode: z.string().min(4, "Code required"),
});
export type RegisterIdentityRequest = z.infer<typeof registerIdentitySchema>;

// Input for Verification (Encrypted Query)
// passportHash is sent in clear (hashed) to lookup the record.
// The rest is encrypted.
export const verifyIdentitySchema = z.object({
  passportHash: z.string(),
  encryptedQuery: z.record(z.string(), z.string()), // Key: field, Value: EncryptedString (Hex/Base64)
  publicParams: z.string().optional(), // For simulated FHE context/noise
});
export type VerifyIdentityRequest = z.infer<typeof verifyIdentitySchema>;

// Response for Verification
export const verifyIdentityResponseSchema = z.object({
  encryptedResult: z.string(), // Enc(1) or Enc(0)
});
export type VerifyIdentityResponse = z.infer<typeof verifyIdentityResponseSchema>;
