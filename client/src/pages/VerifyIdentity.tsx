import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { CyberInput } from "@/components/CyberInput";
import { useVerifyIdentity } from "@/hooks/use-identities";
import { registerIdentitySchema } from "@shared/schema"; // Reusing input schema for form
import { User, Calendar, CreditCard, QrCode, LockKeyhole, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { CryptoLog, LogEntry } from "@/components/CryptoLog";
import SHA256 from "crypto-js/sha256";

// Reuse the same form schema as registration, as user provides same details
type VerifyForm = z.infer<typeof registerIdentitySchema>;

export default function VerifyIdentity() {
  const { mutateAsync, isPending } = useVerifyIdentity();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<"success" | "failure" | null>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      message,
      type
    }]);
  };

  const form = useForm<VerifyForm>({
    resolver: zodResolver(registerIdentitySchema),
    defaultValues: {
      fullName: "",
      age: 18,
      passportId: "",
      expiryDate: "",
      verificationCode: "",
    }
  });

  const onSubmit = async (data: VerifyForm) => {
    setResult(null);
    setLogs([]);
    
    try {
      // 1. Simulation: Client-side Hashing
      addLog("Initializing verification sequence...", "info");
      await new Promise(r => setTimeout(r, 600)); // Delay for visual effect
      
      const passportHash = SHA256(data.passportId).toString();
      addLog(`Hashed PassportID (SHA-256): ${passportHash.substring(0, 16)}...`, "encrypt");
      await new Promise(r => setTimeout(r, 400));

      // 2. Simulation: Client-side Encryption (Mock FHE)
      addLog("Encrypting sensitive fields with FHE Public Key...", "encrypt");
      
      // The server expects a JSON string representing a Ciphertext object
      // We must match the format expected by FHESimulator.decrypt
      const mockEncrypt = (val: any) => {
        const payload = btoa(JSON.stringify({ v: val, r: Math.random().toString(36).substring(7) }));
        return JSON.stringify({
          type: 'FHE_CT',
          data: payload,
          noise: Math.random().toString(36).substring(7)
        });
      };

      const encryptedQuery = {
        fullName: mockEncrypt(data.fullName),
        age: mockEncrypt(Number(data.age)), // Ensure numeric types match for "age"
        expiryDate: mockEncrypt(data.expiryDate),
        verificationCode: mockEncrypt(data.verificationCode)
      };
      
      await new Promise(r => setTimeout(r, 500));
      addLog("Constructed encrypted query payload.", "info");

      // 3. Send to API
      addLog("Transmitting encrypted payload to Taakad Verifier...", "network");
      const response = await mutateAsync({
        passportHash,
        encryptedQuery,
        publicParams: "mock_fhe_params_v1"
      });

      addLog("Received encrypted response packet.", "network");
      await new Promise(r => setTimeout(r, 400));

      // 4. Decrypt Result
      addLog(`Decrypting result blob: ${response.encryptedResult.substring(0, 20)}...`, "decrypt");
      await new Promise(r => setTimeout(r, 600));

      // Use the same decryption logic as server simulation
      const mockDecrypt = (ctStr: string) => {
        try {
          const ct = JSON.parse(ctStr);
          const payload = JSON.parse(atob(ct.data));
          return payload.v;
        } catch (e) {
          return null;
        }
      };

      const isSuccess = mockDecrypt(response.encryptedResult) === 1;
      
      if (isSuccess) {
        addLog("Decryption complete: MATCH CONFIRMED (1)", "success");
        setResult("success");
      } else {
        addLog("Decryption complete: NO MATCH (0)", "success");
        setResult("failure");
      }

    } catch (error: any) {
      addLog(`Error: ${error.message}`, "info");
      setResult("failure");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Form (The "Website") */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-2 text-primary font-mono text-sm">
                <GlobeIcon />
                <span>PARTNER WEBSITE DEMO</span>
              </div>
              <h1 className="text-3xl font-display font-bold mb-2">Checkout Verification</h1>
              <p className="text-muted-foreground">
                Enter your details to verify your identity for this transaction. 
                <br />
                <span className="text-sm italic text-primary/80">
                  Note: This website will NEVER see your raw data.
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              {/* Result Overlay */}
              {result && (
                <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                  {result === "success" ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <LockKeyhole className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Verification Successful</h3>
                      <p className="text-muted-foreground mt-2">Identity confirmed without data exposure.</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <LockKeyhole className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Verification Failed</h3>
                      <p className="text-muted-foreground mt-2">Credentials did not match our secure records.</p>
                    </>
                  )}
                  <button 
                    onClick={() => { setResult(null); setLogs([]); }}
                    className="mt-6 text-sm text-primary hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <CyberInput
                  label="Full Name"
                  placeholder="JOHN DOE"
                  icon={<User className="w-4 h-4" />}
                  {...form.register("fullName")}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="Age"
                    type="number"
                    placeholder="25"
                    icon={<Calendar className="w-4 h-4" />}
                    {...form.register("age", { valueAsNumber: true })}
                  />
                  
                  <CyberInput
                    label="Code"
                    placeholder="XYZ-123"
                    icon={<QrCode className="w-4 h-4" />}
                    {...form.register("verificationCode")}
                  />
                </div>

                <CyberInput
                  label="Passport ID"
                  placeholder="A12345678"
                  icon={<CreditCard className="w-4 h-4" />}
                  {...form.register("passportId")}
                />

                <CyberInput
                  label="Passport Expiry"
                  type="date"
                  icon={<Calendar className="w-4 h-4" />}
                  {...form.register("expiryDate")}
                />

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                >
                  {isPending ? "Verifying..." : "Verify with Taakad"}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Column: The "Under the Hood" Log (Taakad) */}
          <div className="h-[600px] flex flex-col">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-4 text-secondary font-mono text-sm"
            >
               <ArrowRight className="w-4 h-4" />
               <span>SECURE CHANNEL VISUALIZER</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <CryptoLog logs={logs} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 p-4 rounded-xl bg-secondary/5 border border-secondary/20 text-xs text-muted-foreground font-mono"
            >
              <p className="flex items-start gap-2">
                <LockKeyhole className="w-3.5 h-3.5 mt-0.5 text-secondary shrink-0" />
                This window visualizes the background cryptographic operations. 
                In a real integration, this happens silently in the browser and on the Taakad server.
              </p>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
