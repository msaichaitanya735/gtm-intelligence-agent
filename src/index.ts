import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runProspectAgent } from "./agent";
import { ProspectInput, AgentResponse } from "./types";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
    res.json({status: "ok", 
                message: "GTM Intelligence Agent is running"
            });
});

app.post("/api/research", async (req, res) => {
    const startTime = Date.now();
    const { companyName, ourProduct, targetRole } =
    req.body as ProspectInput;
    if (!companyName || !ourProduct) {
        return res.status(400).json({
          success: false,
          error: "companyName and ourProduct are required",
          processingTimeMs: 0,
        } as AgentResponse);
      }
      console.log(`\n🚀 Starting research for: ${companyName}`);
      try {
        const result = await runProspectAgent({
          companyName,
          ourProduct,
          ...(targetRole ? { targetRole } : {}),
        });
        const response: AgentResponse = {
            success: true,
            data: result,
            processingTimeMs: Date.now() - startTime,
          };
          console.log(
            `\n✅ Completed in ${response.processingTimeMs}ms`
          );
          res.json(response);
        } catch (error) {
            console.error("Agent error:", error);
            res.status(500).json({
              success: false,
              error: "Agent failed to complete research",
              processingTimeMs: Date.now() - startTime,
            } as AgentResponse);
          }
        });




        app.listen(PORT, () => {
            console.log(
              `\n🤖 GTM Intelligence Agent running on port ${PORT}`
            );
            console.log(`📡 POST http://localhost:${PORT}/api/research`);
          });