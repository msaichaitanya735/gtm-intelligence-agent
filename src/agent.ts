import OpenAI from "openai";
import type { ProspectInput, ResearchResult } from "./types";

const MODEL = "anthropic/claude-3.5-sonnet";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Set it in .env or your environment."
    );
  }
  cachedClient = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
  return cachedClient;
}

async function researchCompany(
  companyName: string
): Promise<string> {
  const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a GTM research specialist. 
          You analyze companies and identify their 
          business model, growth stage, tech stack, 
          and likely challenges. Be specific and factual.
          Always respond in valid JSON only.`,
        },
        {
          role: "user",
          content: `Research this company: "${companyName}"
          
          Return JSON:
          {
            "description": "2 sentence company summary",
            "industry": "their industry",
            "stage": "startup/scaleup/enterprise",
            "techStack": ["likely", "technologies"],
            "recentSignals": ["any growth signals you know about"],
            "teamSize": "estimated size"
          }`,
        },
      ],
    });
    return response.choices?.[0]?.message?.content ?? "{}";
}

async function identifyPainPoints(
    companyProfile: string,
  ourProduct: string
): Promise<string> {
    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a sales intelligence expert.
            You identify specific pain points a company 
            likely experiences that a product could solve.
            Never be generic. Always be specific to the company.
            Always respond in valid JSON only.`,
          },
          {
            role: "user",
            content: `Company profile: ${companyProfile}
            
            Our product: "${ourProduct}"
            
            Return JSON:
            {
              "painPoints": [
                "specific pain point 1",
                "specific pain point 2", 
                "specific pain point 3"
              ],
              "buyingSignals": [
                "signal that suggests they need this now"
              ],
              "bestAngle": "the single strongest reason they'd buy"
            }`,
          },
        ],
      });
      return response.choices?.[0]?.message?.content ?? "{}";
    }

async function generateOutreach(
  companyName: string,
  companyProfile: string,
  painAnalysis: string,
  ourProduct: string,
  targetRole: string
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert B2B copywriter.
        You write outreach that feels personal, specific,
        and human — never generic or templated.
        Reference specific things about the company.
        Keep emails under 100 words. 
        LinkedIn messages under 50 words.
        Always respond in valid JSON only.`,
      },
      {
        role: "user",
        content: `Write personalized outreach for:
        
        Company: ${companyName}
        Target role: ${targetRole}
        Profile: ${companyProfile}
        Pain analysis: ${painAnalysis}
        Our product: ${ourProduct}
        
        Return JSON:
        {
          "email": {
            "subject": "specific subject line",
            "body": "personalized email body under 100 words"
          },
          "linkedInMessage": "under 50 words, conversational",
          "bestTimeToContact": "reasoning on when to reach out",
          "confidenceScore": 85,
          "reasoning": "why this outreach angle will work"
        }`,
      },
    ],
  });

  return response.choices?.[0]?.message?.content ?? "{}";
}
function passesQualityGate(data: ResearchResult): boolean {
  if (!data.companyProfile) return false;
  if (!data.likelyPainPoints?.length) return false;
  if (!data.personalizedEmail?.subject) return false;
  if (!data.personalizedEmail?.body) return false;
  if (data.confidenceScore < 40) return false;
  return true;
}
  function safeParseJSON(text: string): Record<string, unknown> {
  try {
    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    try {
        const fixed = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim()
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r");
        return JSON.parse(fixed);
      } catch {
        console.error("JSON parse failed after retry:", text);
        return {};
      }
  }
}

export async function runProspectAgent(
    input: ProspectInput,
    retryCount = 0
  ): Promise<ResearchResult> {
    const MAX_RETRIES = 2;
    const targetRole = input.targetRole || "Founder / Head of Sales";
  
    console.log(`\n🔍 Stage 1: Researching ${input.companyName}...`);
    const rawProfile = await researchCompany(input.companyName);
    const profileData = safeParseJSON(rawProfile);
  
    console.log(`\n💡 Stage 2: Identifying pain points...`);
    const rawPains = await identifyPainPoints(
      JSON.stringify(profileData),
      input.ourProduct
    );
    const painData = safeParseJSON(rawPains);
  
    console.log(`\n✍️  Stage 3: Generating personalized outreach...`);
    const rawOutreach = await generateOutreach(
      input.companyName,
      JSON.stringify(profileData),
      JSON.stringify(painData),
      input.ourProduct,
      targetRole
    );
    const outreachData = safeParseJSON(rawOutreach);
  
    // Assemble final result
    const result: ResearchResult = {
      companyProfile: (profileData.description as string) || "",
      likelyPainPoints: (painData.painPoints as string[]) || [],
      buyingSignals: (painData.buyingSignals as string[]) || [],
      personalizedEmail: {
        subject:
          (outreachData.email as Record<string, string>)?.subject || "",
        body: (outreachData.email as Record<string, string>)?.body || "",
      },
      linkedInMessage: (outreachData.linkedInMessage as string) || "",
      bestTimeToContact: (outreachData.bestTimeToContact as string) || "",
      confidenceScore: (outreachData.confidenceScore as number) || 0,
      reasoning: (outreachData.reasoning as string) || "",
    };
  
    // Quality gate with retry
    if (!passesQualityGate(result) && retryCount < MAX_RETRIES) {
      console.log(
        `\n⚠️  Quality gate failed. Retry ${retryCount + 1}/${MAX_RETRIES}...`
      );
      return runProspectAgent(input, retryCount + 1);
    }
  
    return result;
  }