export type CaseType =
  | 'payment'
  | 'subscription'
  | 'mandate'
  | 'checkout_drop_off'
  | 'b2b_receivable';

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emandate';

export type BankRail = 'HDFC' | 'SBI · NPCI' | 'ICICI' | 'AXIS' | 'UPI Intent';

export type DeclineClass = 'hard' | 'soft' | 'technical';

export type CaseStatus = 'needs_review' | 'in_progress' | 'auto_resolved' | 'closed';

export type PtpStatus = 'PENDING' | 'KEPT' | 'BROKEN';

export interface ComplianceGateStatus {
  passed: boolean;
  citation: string;
  detail: string;
  daysRemaining?: number;
  requiresAfa?: boolean;
  header?: string;
  meta?: Record<string, any>;
}

export interface BayesianTimingProfile {
  tenureEvents: number;
  shrinkageWeight: number; // w = N / (N + k0)
  modalDay: number;
  targetDay: number;
  delayHours: number;
  scheduledTime: string;
  cbsSafe: boolean;
}

export interface DispatchProfile {
  channel: 'smart_paylink' | 'voicebot' | 'sms' | 'auto_retry';
  paylinkUrl?: string;
  voiceFsmState?: string;
  smsDelivered?: boolean;
  dltHeader?: string;
  timestamp: string;
}

export interface OutcomeProfile {
  ptpStatus?: PtpStatus;
  ptpPromisedDate?: string;
  recoveredAmountPaise?: number;
  resolutionTimestamp?: string;
  resolutionRule?: string;
}

export interface OperatorDecision {
  action: 'approve' | 'override' | 'reject';
  overrideAction?: string;
  note: string;
  decidedAt: string;
  decidedBy: string;
}

export interface TransactionCase {
  id: string;
  paymentId: string;
  orderId: string;
  timestamp: string;
  timeFormatted: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amountPaise: number;
  amountRupees: number;
  caseType: CaseType;
  method: PaymentMethod;
  rail: BankRail;
  originalRail?: BankRail;
  wasRerouted: boolean;
  rerouteReason?: string;
  declineClass: DeclineClass;
  errorReason: string;
  errorCode: string;
  errorDescription: string;
  isoCode: string;
  isoCategory: 1 | 2 | 3;
  status: CaseStatus;
  needsReview: boolean;
  escalationReason?: string;
  regulatoryCitation?: string;
  financialExposure?: number;
  agentConfidence: number;
  agentSuggestedAction?: string;
  slaCountdownSeconds?: number;
  b2bInvoiceId?: string;
  b2bCompanyName?: string;
  b2bAgingBucket?: 'current' | '1_15_days' | '16_30_days' | '31_60_days' | '60_plus_days';
  checkoutStage?: 'cart_abandoned' | 'address_submitted' | 'payment_method_selected' | 'otp_abandoned';
  complianceChecks: {
    rbiCallingWindow: ComplianceGateStatus;
    emandateAfa: ComplianceGateStatus;
    msmed43Bh: ComplianceGateStatus;
    traiDltHeader: ComplianceGateStatus;
    cbsBlackout: ComplianceGateStatus;
  };
  bayesianTiming: BayesianTimingProfile;
  dispatch: DispatchProfile;
  outcome: OutcomeProfile;
  auditBlockIndex: number;
  auditBlockHash: string;
  operatorDecision?: OperatorDecision;
}

export interface SwitchHealth {
  railId: string;
  name: string;
  issuer: string;
  method: string;
  status: 'HEALTHY' | 'DEGRADED';
  isDegraded: boolean;
  currentSuccessRate: number; // percentage e.g. 84.0 or 31.9
  baselineSuccessRate: number; // percentage e.g. 84.0
  avgLatencyMs: number; // e.g. 1250 or 8900
  latencyHistory: { time: string; latency: number }[];
  rootCause?: string;
  failoverTarget?: string;
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  caseId: string;
  action: string;
  ruleFired: string;
  reason: string;
  prevHash: string;
  canonicalHash: string;
  payload: Record<string, any>;
  isTampered?: boolean;
}

export interface ActiveVoiceCall {
  callId: string;
  caseId: string;
  customerName: string;
  customerPhone: string;
  amountRupees: number;
  originatingNumber: string; // +91 1601...
  state:
    | 'CALLING_WINDOW_CHECK'
    | 'GENERIC_DISCLOSURE'
    | 'RIGHT_PARTY_VERIFICATION'
    | 'LENDER_DISCLOSURE'
    | 'PAYMENT_DISCUSSION'
    | 'RESOLUTION_ATTEMPT'
    | 'PTP_COMMITTED'
    | 'HUMAN_ESCALATION';
  rpvRetries: number;
  durationSeconds: number;
  transcriptSnippet: string;
  callStartedAt: string;
}

export interface ActivePayLink {
  linkId: string;
  caseId: string;
  customerName: string;
  shortUrl: string; // rzp.io/...
  amountRupees: number;
  channel: 'WhatsApp' | 'SMS';
  createdAt: string;
  expiresInMinutes: number;
  clicksCount: number;
  status: 'sent' | 'opened' | 'expired';
}

export interface PtpCommitment {
  ptpId: string;
  caseId: string;
  customerName: string;
  customerPhone: string;
  amountRupees: number;
  promisedDate: string;
  status: PtpStatus;
  createdAt: string;
  notes: string;
  graceHoursRemaining: number;
}

export interface CaseTypeBreakdown {
  total: number;
  recovered: number;
  rate: number;
}

export interface AgingBucketBreakdown {
  total: number;
  recovered: number;
  rate: number;
  total_amount_paise: number;
  recovered_amount_paise: number;
}

export interface RecoverySummaryData {
  generated_at: string;
  epistemic_caveat: string;
  total_cases: number;
  recovered_cases: number;
  overall_recovery_rate: number;
  total_amount_paise: number;
  recovered_amount_paise: number;
  recovered_amount_rupees: number;
  recovery_rate_by_amount: number;
  by_case_type: Record<string, CaseTypeBreakdown>;
  by_decline_class: Record<string, CaseTypeBreakdown>;
  by_recovery_method: Record<string, number>;
  by_aging_bucket: Record<string, AgingBucketBreakdown>;
  by_checkout_stage?: Record<string, AgingBucketBreakdown>;
  voice_escalation?: {
    total_voice_cases: number;
    voice_recovered: number;
    voice_recovery_rate: number;
  };
  benchmarks_comparison?: Record<string, any>;
}

export interface BenchmarkResultsData {
  run_id: string;
  seed: number;
  executed_at: string;
  total_cases: number;
  total_revenue_at_risk_paise: number;
  control_recovered_paise: number;
  treatment_recovered_paise: number;
  control_penalty_fees_paise: number;
  treatment_penalty_fees_paise: number;
  control_violations: number;
  treatment_violations: number;
  control_net_recovery_paise: number;
  treatment_net_recovery_paise: number;
  net_recovery_lift_paise: number;
  net_recovery_lift_pct: number;
  lift_ci_lower_paise: number;
  lift_ci_upper_paise: number;
  lift_p_value: number;
  is_statistically_significant: boolean;
  control_comm_costs_paise: number;
  treatment_comm_costs_paise: number;
  control_interchange_paise: number;
  treatment_interchange_paise: number;
}
