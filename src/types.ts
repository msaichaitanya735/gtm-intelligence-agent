export interface ProspectInput {
    companyName: string;
    ourProduct: string;
    targetRole?: string; // e.g. "Head of Sales", "Founder"
  }
  
  export interface ResearchResult {
    companyProfile: string;
    likelyPainPoints: string[];
    buyingSignals: string[];
    personalizedEmail: {
      subject: string;
      body: string;
    };
    linkedInMessage: string;
    bestTimeToContact: string;
    confidenceScore: number;
    reasoning: string;
  }
  
  export interface AgentResponse {
    success: boolean;
    data?: ResearchResult;
    error?: string;
    processingTimeMs: number;
  }