import { identities, type Identity, type InsertIdentity } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createIdentity(identity: InsertIdentity): Promise<Identity>;
  getIdentityByHash(passportHash: string): Promise<Identity | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createIdentity(identity: InsertIdentity): Promise<Identity> {
    const [newIdentity] = await db
      .insert(identities)
      .values(identity)
      .returning();
    return newIdentity;
  }

  async getIdentityByHash(passportHash: string): Promise<Identity | undefined> {
    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.passportHash, passportHash));
    return identity;
  }
}

export const storage = new DatabaseStorage();
