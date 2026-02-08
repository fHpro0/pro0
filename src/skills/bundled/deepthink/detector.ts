export interface DeepthinkDetectionResult {
  shouldTrigger: boolean;
  confidence: number;
  recommendedMode: 'quick' | 'full' | 'auto';
  reasoning: string;
}

/**
 * Detect if query should trigger Deepthink
 */
export function shouldTriggerDeepthink(userQuery: string): boolean {
  const result = analyzeQuery(userQuery);
  return result.shouldTrigger && result.confidence >= 0.6;
}

/**
 * Detailed analysis with mode recommendation
 */
export function analyzeQuery(userQuery: string): DeepthinkDetectionResult {
  const query = userQuery.toLowerCase();

  if (isExplicitDeepthinkRequest(query)) {
    return {
      shouldTrigger: true,
      confidence: 1,
      recommendedMode: 'auto',
      reasoning: 'Explicit Deepthink request detected'
    };
  }

  // Complexity indicators
  const indicators = {
    // Analytical question words
    analytical: /\b(why|how|explain|analyze|compare|evaluate|assess|critique)\b/g,

    // Multi-part questions
    multiPart: /\b(and|also|additionally|furthermore)\b/g,

    // Comparative/contrasting
    comparative: /\b(versus|vs|compared to|difference between|contrast)\b/g,

    // Historical/contextual
    historical: /\b(history|evolution|development|origin|timeline)\b/g,

    // Causal reasoning
    causal: /\b(because|cause|reason|result|consequence|impact|effect)\b/g,

    // Multiple perspectives
    perspectives: /\b(perspective|viewpoint|argument|debate|controversy)\b/g,

    // Research/investigation
    research: /\b(research|investigate|explore|examine|study)\b/g,

    // Complex domains (add more as needed)
    complexDomain: /\b(philosophy|ethics|economics|politics|science|theory)\b/g
  };

  // Count matches for each indicator
  const scores = {
    analytical: (query.match(indicators.analytical) || []).length,
    multiPart: (query.match(indicators.multiPart) || []).length,
    comparative: (query.match(indicators.comparative) || []).length,
    historical: (query.match(indicators.historical) || []).length,
    causal: (query.match(indicators.causal) || []).length,
    perspectives: (query.match(indicators.perspectives) || []).length,
    research: (query.match(indicators.research) || []).length,
    complexDomain: (query.match(indicators.complexDomain) || []).length
  };

  // Calculate weighted score
  const weightedScore =
    scores.analytical * 2.0 +
    scores.multiPart * 1.0 +
    scores.comparative * 1.5 +
    scores.historical * 1.0 +
    scores.causal * 1.5 +
    scores.perspectives * 2.0 +
    scores.research * 1.5 +
    scores.complexDomain * 1.0;

  // Normalize to 0-1
  const maxPossibleScore = 20;
  const confidence = Math.min(weightedScore / maxPossibleScore, 1.0);

  // Determine if should trigger
  const shouldTrigger = confidence >= 0.3;

  // Recommend mode based on complexity
  let recommendedMode: 'quick' | 'full' | 'auto' = 'auto';

  if (confidence < 0.3) {
    recommendedMode = 'quick';
  } else if (confidence >= 0.7) {
    recommendedMode = 'full';
  } else {
    recommendedMode = 'auto';
  }

  // Generate reasoning
  const reasons: string[] = [];
  if (scores.analytical > 0) reasons.push(`analytical language (${scores.analytical})`);
  if (scores.comparative > 0) reasons.push(`comparative analysis (${scores.comparative})`);
  if (scores.perspectives > 0) reasons.push(`multiple perspectives (${scores.perspectives})`);
  if (scores.causal > 0) reasons.push(`causal reasoning (${scores.causal})`);
  if (scores.complexDomain > 0) reasons.push(`complex domain (${scores.complexDomain})`);

  const reasoning = reasons.length > 0
    ? `Detected complexity factors: ${reasons.join(', ')}`
    : 'Simple informational query, Deepthink not recommended';

  return {
    shouldTrigger,
    confidence,
    recommendedMode,
    reasoning
  };
}

/**
 * Check if query is explicitly requesting Deepthink
 */
export function isExplicitDeepthinkRequest(userQuery: string): boolean {
  const query = userQuery.toLowerCase();

  const explicitPatterns = [
    /\bdeepthink\b/,
    /\bdeep think\b/,
    /\bthink deeply\b/,
    /\banalyze deeply\b/,
    /\bthorough analysis\b/,
    /\bcomprehensive analysis\b/
  ];

  return explicitPatterns.some(pattern => pattern.test(query));
}
