/**
 * Fraud Detection Service
 * PSD-12 Compliance: Section 11.6 - Monitor ALL payments for fraud
 * 
 * Based on NPS 10-Year Fraud Report (2013-2022):
 * - Card-not-present fraud (95% of incidents)
 * - Phishing attacks (92.5% of EFT fraud)
 * - SIM swap attacks
 * - Counterfeit card fraud
 * - Social engineering
 * 
 * Implements:
 * - Real-time fraud scoring
 * - Velocity checks
 * - Behavioral analysis
 * - Device fingerprinting
 * - Geolocation analysis
 * - ML-based anomaly detection
 */

interface PaymentContext {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentType: 'CARD' | 'EFT' | 'E_MONEY' | 'QR_CODE';
  paymentMethod: 'CARD_NOT_PRESENT' | 'CARD_PRESENT' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
  
  // Recipient
  recipientId?: string;
  merchantId?: string;
  
  // Device context
  deviceId?: string;
  deviceType?: 'MOBILE' | 'WEB' | 'API' | 'POS';
  ipAddress?: string;
  
  // Location context
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
  
  // Card details (if applicable)
  cardLast4?: string;
  cardBin?: string;
  cardType?: 'DEBIT' | 'CREDIT' | 'PREPAID';
  isCardPresent?: boolean;
  
  // Additional context
  userAgent?: string;
  sessionId?: string;
  timestamp?: Date;
}

interface FraudCheckResult {
  allowed: boolean;
  blocked: boolean;
  requiresReview: boolean;
  requiresStepUpAuth: boolean;
  
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  rulesTriggered: FraudRule[];
  fraudIndicators: string[];
  fraudType?: string;
  
  actionTaken: 'ALLOWED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'STEP_UP_AUTH_REQUIRED';
  blockReason?: string;
  
  mlPrediction?: {
    prediction: 'FRAUD' | 'LEGITIMATE' | 'UNCERTAIN';
    confidence: number;
    modelUsed: string;
  };
}

interface FraudRule {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  riskScore: number;
  triggered: boolean;
  description: string;
}

interface UserBehavioralProfile {
  userId: string;
  avgTransactionAmount: number;
  maxTransactionAmount: number;
  typicalTransactionCountPerDay: number;
  commonLocations: Array<{ lat: number; lng: number }>;
  knownDevices: string[];
  trustScore: number;
  trustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'TRUSTED';
}

interface VelocityMetrics {
  transactionsLast1Hour: number;
  transactionsLast24Hours: number;
  amountLast1Hour: number;
  amountLast24Hours: number;
  failedTransactionsLast1Hour: number;
}

export class FraudDetectionService {
  private fraudRules: Map<string, FraudRule> = new Map();
  private mlModelsEnabled: boolean = false;

  constructor() {
    this.initializeFraudRules();
  }

  /**
   * Main fraud detection method
   * Analyzes payment and returns fraud check result
   * PSD-12 Section 11.6: Monitor ALL payments
   */
  async checkPayment(context: PaymentContext): Promise<FraudCheckResult> {
    const startTime = Date.now();

    try {
      // Initialize result
      const result: FraudCheckResult = {
        allowed: true,
        blocked: false,
        requiresReview: false,
        requiresStepUpAuth: false,
        riskScore: 0,
        riskLevel: 'LOW',
        rulesTriggered: [],
        fraudIndicators: [],
        actionTaken: 'ALLOWED',
      };

      // Get user behavioral profile
      const userProfile = await this.getUserBehavioralProfile(context.userId);

      // Get velocity metrics
      const velocity = await this.getVelocityMetrics(context.userId);

      // Run fraud detection rules
      await this.runFraudRules(context, userProfile, velocity, result);

      // Calculate overall risk score
      result.riskScore = this.calculateRiskScore(result);

      // Determine risk level
      result.riskLevel = this.getRiskLevel(result.riskScore);

      // Run ML-based fraud detection (if enabled)
      if (this.mlModelsEnabled) {
        result.mlPrediction = await this.runMLFraudDetection(context, userProfile);
        
        // Adjust risk score based on ML prediction
        if (result.mlPrediction.prediction === 'FRAUD' && result.mlPrediction.confidence > 0.8) {
          result.riskScore = Math.min(result.riskScore + 30, 100);
          result.fraudIndicators.push('ML_MODEL_FRAUD_PREDICTION');
        }
      }

      // Determine action based on risk score
      result.actionTaken = this.determineAction(result.riskScore, result.rulesTriggered);
      result.allowed = result.actionTaken === 'ALLOWED';
      result.blocked = result.actionTaken === 'BLOCKED';
      result.requiresReview = result.actionTaken === 'REVIEW_REQUIRED';
      result.requiresStepUpAuth = result.actionTaken === 'STEP_UP_AUTH_REQUIRED';

      if (result.blocked) {
        result.blockReason = this.generateBlockReason(result);
      }

      // Log fraud detection event
      await this.logFraudDetectionEvent(context, result);

      // Update user behavioral profile
      await this.updateUserBehavioralProfile(context, result);

      const duration = Date.now() - startTime;
      console.log(`[FRAUD CHECK] Payment ${context.paymentId} - Risk: ${result.riskScore} - Action: ${result.actionTaken} (${duration}ms)`);

      return result;

    } catch (error) {
      console.error('Fraud detection error:', error);
      
      // In case of error, fail safely by requiring review
      return {
        allowed: false,
        blocked: false,
        requiresReview: true,
        requiresStepUpAuth: false,
        riskScore: 50,
        riskLevel: 'MEDIUM',
        rulesTriggered: [],
        fraudIndicators: ['FRAUD_CHECK_ERROR'],
        actionTaken: 'REVIEW_REQUIRED',
        blockReason: 'Fraud detection system error - manual review required',
      };
    }
  }

  /**
   * Initialize fraud detection rules based on NPS 10-year fraud report
   */
  private initializeFraudRules(): void {
    // Rule 1: Card-Not-Present (CNP) Fraud Detection
    // NPS Report: 95% of card fraud incidents are CNP
    this.addRule({
      ruleId: 'CNP_001',
      ruleName: 'Card-Not-Present High Amount',
      ruleType: 'CARD_NOT_PRESENT',
      riskScore: 25,
      triggered: false,
      description: 'High-value CNP transaction detected',
    });

    // Rule 2: Velocity Check - Multiple Transactions
    // NPS Report: Fraudsters often attempt multiple rapid transactions
    this.addRule({
      ruleId: 'VEL_001',
      ruleName: 'High Transaction Velocity',
      ruleType: 'VELOCITY_CHECK',
      riskScore: 30,
      triggered: false,
      description: 'Unusual number of transactions in short timeframe',
    });

    // Rule 3: Phishing Detection
    // NPS Report: 92.5% of EFT fraud is phishing
    this.addRule({
      ruleId: 'PHISH_001',
      ruleName: 'Suspicious Login Pattern',
      ruleType: 'PHISHING',
      riskScore: 35,
      triggered: false,
      description: 'Login pattern consistent with phishing attack',
    });

    // Rule 4: SIM Swap Detection
    // NPS Report: Significant e-money fraud from SIM swaps
    this.addRule({
      ruleId: 'SIM_001',
      ruleName: 'Device Change After Phone Number Change',
      ruleType: 'SIM_SWAP',
      riskScore: 40,
      triggered: false,
      description: 'Possible SIM swap attack detected',
    });

    // Rule 5: New Device + High Amount
    this.addRule({
      ruleId: 'DEV_001',
      ruleName: 'New Device High-Value Transaction',
      ruleType: 'DEVICE_FINGERPRINT',
      riskScore: 20,
      triggered: false,
      description: 'First transaction from new device with high amount',
    });

    // Rule 6: Geographic Anomaly
    this.addRule({
      ruleId: 'GEO_001',
      ruleName: 'Impossible Travel',
      ruleType: 'GEOLOCATION',
      riskScore: 35,
      triggered: false,
      description: 'Transaction location inconsistent with recent activity',
    });

    // Rule 7: Behavioral Anomaly
    this.addRule({
      ruleId: 'BEH_001',
      ruleName: 'Unusual Transaction Pattern',
      ruleType: 'BEHAVIORAL',
      riskScore: 25,
      triggered: false,
      description: 'Transaction pattern deviates from user norm',
    });

    // Rule 8: Amount Threshold
    this.addRule({
      ruleId: 'AMT_001',
      ruleName: 'Large Single Transaction',
      ruleType: 'AMOUNT_THRESHOLD',
      riskScore: 15,
      triggered: false,
      description: 'Transaction amount exceeds typical range',
    });

    // Rule 9: Failed Authentication Attempts
    this.addRule({
      ruleId: 'AUTH_001',
      ruleName: 'Multiple Failed Authentication',
      ruleType: 'AUTHENTICATION',
      riskScore: 30,
      triggered: false,
      description: 'Multiple failed authentication attempts detected',
    });

    // Rule 10: Blacklist Check
    this.addRule({
      ruleId: 'BLACK_001',
      ruleName: 'Blacklisted Entity',
      ruleType: 'BLACKLIST',
      riskScore: 100, // Automatic block
      triggered: false,
      description: 'User, device, or IP on blacklist',
    });
  }

  /**
   * Run all fraud detection rules
   */
  private async runFraudRules(
    context: PaymentContext,
    userProfile: UserBehavioralProfile | null,
    velocity: VelocityMetrics,
    result: FraudCheckResult
  ): Promise<void> {
    // Rule 1: Card-Not-Present High Amount
    if (context.paymentMethod === 'CARD_NOT_PRESENT' && context.amount > 5000) {
      const rule = this.getRule('CNP_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('HIGH_VALUE_CNP_TRANSACTION');
      }
    }

    // Rule 2: High Transaction Velocity
    if (velocity.transactionsLast1Hour >= 5) {
      const rule = this.getRule('VEL_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('HIGH_VELOCITY');
      }
    }

    // Rule 3: Phishing - Rapid Failed Auth + Transaction
    const failedAuthCount = await this.getFailedAuthCount(context.userId, 1); // Last 1 hour
    if (failedAuthCount >= 3) {
      const rule = this.getRule('PHISH_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('POSSIBLE_PHISHING');
      }
    }

    // Rule 4: SIM Swap Detection
    if (await this.checkSIMSwapIndicators(context.userId, context.deviceId)) {
      const rule = this.getRule('SIM_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('POSSIBLE_SIM_SWAP');
      }
    }

    // Rule 5: New Device + High Amount
    if (context.deviceId && !(await this.isKnownDevice(context.userId, context.deviceId))) {
      if (context.amount > 10000) {
        const rule = this.getRule('DEV_001');
        if (rule) {
          rule.triggered = true;
          result.rulesTriggered.push(rule);
          result.fraudIndicators.push('NEW_DEVICE_HIGH_AMOUNT');
        }
      }
    }

    // Rule 6: Geographic Anomaly (Impossible Travel)
    if (context.latitude && context.longitude) {
      const lastLocation = await this.getLastTransactionLocation(context.userId);
      if (lastLocation) {
        const distance = this.calculateDistance(
          lastLocation.lat,
          lastLocation.lng,
          context.latitude,
          context.longitude
        );
        const timeDiff = Date.now() - lastLocation.timestamp.getTime();
        const hoursElapsed = timeDiff / (1000 * 60 * 60);
        const speedKmh = distance / hoursElapsed;

        // If speed > 900 km/h (impossible by car, suspicious for short timeframes)
        if (speedKmh > 900 && hoursElapsed < 6) {
          const rule = this.getRule('GEO_001');
          if (rule) {
            rule.triggered = true;
            result.rulesTriggered.push(rule);
            result.fraudIndicators.push('IMPOSSIBLE_TRAVEL');
          }
        }
      }
    }

    // Rule 7: Behavioral Anomaly
    if (userProfile) {
      // Check if amount is significantly higher than average
      if (context.amount > userProfile.avgTransactionAmount * 5) {
        const rule = this.getRule('BEH_001');
        if (rule) {
          rule.triggered = true;
          result.rulesTriggered.push(rule);
          result.fraudIndicators.push('AMOUNT_ANOMALY');
        }
      }

      // Check transaction frequency
      if (velocity.transactionsLast24Hours > userProfile.typicalTransactionCountPerDay * 3) {
        const rule = this.getRule('BEH_001');
        if (rule && !rule.triggered) {
          rule.triggered = true;
          result.rulesTriggered.push(rule);
          result.fraudIndicators.push('FREQUENCY_ANOMALY');
        }
      }
    }

    // Rule 8: Large Single Transaction
    if (context.amount > 50000) {
      const rule = this.getRule('AMT_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('LARGE_TRANSACTION');
      }
    }

    // Rule 9: Multiple Failed Authentication
    if (failedAuthCount >= 5) {
      const rule = this.getRule('AUTH_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('MULTIPLE_FAILED_AUTH');
      }
    }

    // Rule 10: Blacklist Check
    if (await this.checkBlacklist(context)) {
      const rule = this.getRule('BLACK_001');
      if (rule) {
        rule.triggered = true;
        result.rulesTriggered.push(rule);
        result.fraudIndicators.push('BLACKLISTED');
      }
    }
  }

  /**
   * Calculate overall risk score based on triggered rules
   */
  private calculateRiskScore(result: FraudCheckResult): number {
    let score = 0;

    for (const rule of result.rulesTriggered) {
      score += rule.riskScore;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Determine risk level based on score
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determine action based on risk score and rules
   */
  private determineAction(
    riskScore: number,
    rulesTriggered: FraudRule[]
  ): 'ALLOWED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'STEP_UP_AUTH_REQUIRED' {
    // Check for blacklist (automatic block)
    const blacklistRule = rulesTriggered.find((r) => r.ruleId === 'BLACK_001');
    if (blacklistRule) {
      return 'BLOCKED';
    }

    // Critical risk: Block
    if (riskScore >= 70) {
      return 'BLOCKED';
    }

    // High risk: Require manual review
    if (riskScore >= 50) {
      return 'REVIEW_REQUIRED';
    }

    // Medium risk: Step-up authentication (additional 2FA)
    if (riskScore >= 30) {
      return 'STEP_UP_AUTH_REQUIRED';
    }

    // Low risk: Allow
    return 'ALLOWED';
  }

  /**
   * Generate human-readable block reason
   */
  private generateBlockReason(result: FraudCheckResult): string {
    const indicators = result.fraudIndicators.slice(0, 3).join(', ');
    return `Transaction blocked due to high fraud risk. Indicators: ${indicators}`;
  }

  /**
   * ML-based fraud detection (placeholder for ML model integration)
   */
  private async runMLFraudDetection(
    context: PaymentContext,
    userProfile: UserBehavioralProfile | null
  ): Promise<{ prediction: 'FRAUD' | 'LEGITIMATE' | 'UNCERTAIN'; confidence: number; modelUsed: string }> {
    // TODO: Integrate with actual ML model
    // This is a placeholder that simulates ML prediction
    
    // Features for ML model:
    const features = {
      amount: context.amount,
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isCardPresent: context.isCardPresent ? 1 : 0,
      avgAmount: userProfile?.avgTransactionAmount || 0,
      trustScore: userProfile?.trustScore || 50,
    };

    // Simulate ML model prediction
    // In production, call your trained ML model API
    const confidence = Math.random();
    const prediction = confidence > 0.7 ? 'FRAUD' : 'LEGITIMATE';

    return {
      prediction,
      confidence,
      modelUsed: 'random_forest_v1', // Replace with actual model name
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  // ==================== Helper Methods ====================

  private addRule(rule: FraudRule): void {
    this.fraudRules.set(rule.ruleId, rule);
  }

  private getRule(ruleId: string): FraudRule | undefined {
    return this.fraudRules.get(ruleId);
  }

  // ==================== Database Integration Methods ====================
  // TODO: Implement actual database queries

  private async getUserBehavioralProfile(userId: string): Promise<UserBehavioralProfile | null> {
    // Query user_behavioral_profiles table
    return null;
  }

  private async getVelocityMetrics(userId: string): Promise<VelocityMetrics> {
    // Query velocity_tracking table
    return {
      transactionsLast1Hour: 0,
      transactionsLast24Hours: 0,
      amountLast1Hour: 0,
      amountLast24Hours: 0,
      failedTransactionsLast1Hour: 0,
    };
  }

  private async getFailedAuthCount(userId: string, hours: number): Promise<number> {
    // Query two_factor_auth_logs or audit_logs table
    return 0;
  }

  private async checkSIMSwapIndicators(userId: string, deviceId?: string): Promise<boolean> {
    // Check for indicators of SIM swap attack
    return false;
  }

  private async isKnownDevice(userId: string, deviceId: string): Promise<boolean> {
    // Check device_fingerprints table
    return false;
  }

  private async getLastTransactionLocation(
    userId: string
  ): Promise<{ lat: number; lng: number; timestamp: Date } | null> {
    // Query fraud_detection_events or payment_audit_trail table
    return null;
  }

  private async checkBlacklist(context: PaymentContext): Promise<boolean> {
    // Query fraud_lists table
    return false;
  }

  private async logFraudDetectionEvent(context: PaymentContext, result: FraudCheckResult): Promise<void> {
    // INSERT INTO fraud_detection_events
    console.log('[FRAUD LOG]', {
      paymentId: context.paymentId,
      riskScore: result.riskScore,
      action: result.actionTaken,
    });
  }

  private async updateUserBehavioralProfile(
    context: PaymentContext,
    result: FraudCheckResult
  ): Promise<void> {
    // Update user_behavioral_profiles table
    // Adjust trust score based on fraud check result
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();

/**
 * Example Usage:
 * 
 * const result = await fraudDetectionService.checkPayment({
 *   paymentId: 'pay_123',
 *   userId: 'user_456',
 *   amount: 15000,
 *   currency: 'NAD',
 *   paymentType: 'CARD',
 *   paymentMethod: 'CARD_NOT_PRESENT',
 *   deviceId: 'device_789',
 *   ipAddress: '41.182.123.45',
 *   latitude: -22.5609,
 *   longitude: 17.0658,
 * });
 * 
 * if (result.blocked) {
 *   console.log('Payment blocked:', result.blockReason);
 * } else if (result.requiresStepUpAuth) {
 *   console.log('Additional authentication required');
 * } else {
 *   console.log('Payment allowed');
 * }
 */
