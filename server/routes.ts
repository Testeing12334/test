import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { FHESimulator } from "./lib/fhe";
import { SHA256 } from "crypto-js"; // We might need to use node crypto if crypto-js is client side, but let's see. 
// Actually, backend should use 'crypto' module.
import { createHash } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === REGISTER IDENTITY ===
  app.post(api.identities.register.path, async (req, res) => {
    try {
      const input = api.identities.register.input.parse(req.body);
      
      // 1. Hash the Passport ID for storage lookup
      const hash = createHash('sha256').update(input.passportId).digest('hex');
      
      // 2. "Encrypt" the sensitive fields using FHE Simulator
      // In a real system, this might happen on the client (Issuer Portal)
      // But here we simulate the Trusted Issuer Backend doing it.
      const encryptedData = JSON.stringify({
        fullName: FHESimulator.encrypt(input.fullName),
        age: FHESimulator.encrypt(Number(input.age)), // Explicitly ensure number
        expiryDate: FHESimulator.encrypt(input.expiryDate),
        verificationCode: FHESimulator.encrypt(input.verificationCode)
      });

      const identity = await storage.createIdentity({
        passportHash: hash,
        encryptedData: encryptedData,
      });

      res.status(201).json({ message: "Identity Issued", id: identity.id });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === VERIFY IDENTITY (FHE) ===
  app.post(api.verification.verify.path, async (req, res) => {
    try {
      const { passportHash, encryptedQuery } = api.verification.verify.input.parse(req.body);
      
      // 1. Lookup by Hash (O(1) Access)
      const identity = await storage.getIdentityByHash(passportHash);
      
      if (!identity) {
        // Return 404? Or fake success to prevent enumeration?
        // For demo, 404 is fine.
        return res.status(404).json({ message: "Identity not found" });
      }

      // 2. Load Stored Encrypted Data
      const storedData = JSON.parse(identity.encryptedData);

      // 3. Homomorphic Comparison
      // We compare each field requested in the query.
      // If ALL match -> 1, else 0.
      
      let overallMatch = 1;

      // Note: In real FHE, we would AND the results homomorphically.
      // Enc(Res) = Enc(Field1_Match) * Enc(Field2_Match) ...
      
      for (const [key, encQueryVal] of Object.entries(encryptedQuery)) {
        if (storedData[key]) {
          const encStoredVal = storedData[key];
          
          // Perform Homomorphic Equality Check
          const encMatch = FHESimulator.homomorphicEquality(encQueryVal, encStoredVal);
          
          // "Decrypt" internally for the logic flow (Simulating the circuit evaluation)
          const isMatch = FHESimulator.decrypt(encMatch);
          
          if (isMatch === 0) {
            overallMatch = 0;
          }
        } else {
            // Field not found in record -> Mismatch
            overallMatch = 0;
        }
      }

      // 4. Return Encrypted Result
      const encryptedResult = FHESimulator.encrypt(overallMatch);

      res.json({ encryptedResult });

    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getIdentityByHash(
    createHash('sha256').update("A1234567").digest('hex')
  );

  if (!existing) {
    console.log("Seeding Database with Demo Identity...");
    
    // Identity 1: Amjad Masad
    const p1 = "A1234567";
    const h1 = createHash('sha256').update(p1).digest('hex');
    const enc1 = JSON.stringify({
      fullName: FHESimulator.encrypt("Amjad Masad"),
      age: FHESimulator.encrypt(35),
      expiryDate: FHESimulator.encrypt("2030-01-01"),
      verificationCode: FHESimulator.encrypt("1234")
    });
    
    await storage.createIdentity({
      passportHash: h1,
      encryptedData: enc1
    });

    console.log(`Seeded Identity: PassportID=${p1}, Hash=${h1.substring(0,8)}...`);
  }
}
