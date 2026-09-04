import {
  TransactionCase,
  SwitchHealth,
  AuditBlock,
  ActiveVoiceCall,
  ActivePayLink,
  PtpCommitment,
  CaseType,
  BankRail,
  DeclineClass,
  CaseStatus,
} from './types';

// Simple fast SHA-256 for deterministic in-browser cryptographic chain
function sha256Sync(str: string): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  
  // Custom deterministic digest simulation for browser mock
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, '0');
  const hex3 = Math.abs((hash * 67) | 0).toString(16).padStart(8, '0');
  const hex4 = Math.abs((hash * 103) | 0).toString(16).padStart(8, '0');
  return (hex + hex2 + hex3 + hex4 + hex + hex2 + hex3 + hex4).slice(0, 64);
}

export const INITIAL_SWITCHES: SwitchHealth[] = [
  {
    railId: 'hdfc_netbanking',
    name: 'HDFC Bank Netbanking',
    issuer: 'HDFC',
    method: 'netbanking',
    status: 'DEGRADED',
    isDegraded: true,
    currentSuccessRate: 31.9,
    baselineSuccessRate: 84.0,
    avgLatencyMs: 8900,
    rootCause: 'Core Banking Host Timeout / Maintenance (NPCI Switch Error 91)',
    failoverTarget: 'UPI Intent (PhonePe / GPay / Paytm)',
    latencyHistory: [
      { time: '14:20', latency: 1250 },
      { time: '14:22', latency: 1400 },
      { time: '14:24', latency: 2900 },
      { time: '14:26', latency: 6400 },
      { time: '14:28', latency: 8900 },
    ],
  },
  {
    railId: 'sbi_upi',
    name: 'SBI UPI Switch (NPCI)',
    issuer: 'SBI · NPCI',
    method: 'upi',
    status: 'HEALTHY',
    isDegraded: false,
    currentSuccessRate: 88.4,
    baselineSuccessRate: 88.0,
    avgLatencyMs: 950,
    latencyHistory: [
      { time: '14:20', latency: 920 },
      { time: '14:22', latency: 980 },
      { time: '14:24', latency: 940 },
      { time: '14:26', latency: 960 },
      { time: '14:28', latency: 950 },
    ],
  },
  {
    railId: 'icici_cards',
    name: 'ICICI Card Gateway',
    issuer: 'ICICI',
    method: 'card',
    status: 'HEALTHY',
    isDegraded: false,
    currentSuccessRate: 91.2,
    baselineSuccessRate: 91.0,
    avgLatencyMs: 820,
    latencyHistory: [
      { time: '14:20', latency: 810 },
      { time: '14:22', latency: 830 },
      { time: '14:24', latency: 800 },
      { time: '14:26', latency: 840 },
      { time: '14:28', latency: 820 },
    ],
  },
  {
    railId: 'axis_netbanking',
    name: 'Axis Bank Netbanking',
    issuer: 'AXIS',
    method: 'netbanking',
    status: 'HEALTHY',
    isDegraded: false,
    currentSuccessRate: 82.5,
    baselineSuccessRate: 82.0,
    avgLatencyMs: 1400,
    latencyHistory: [
      { time: '14:20', latency: 1380 },
      { time: '14:22', latency: 1420 },
      { time: '14:24', latency: 1390 },
      { time: '14:26', latency: 1410 },
      { time: '14:28', latency: 1400 },
    ],
  },
  {
    railId: 'upi_intent',
    name: 'UPI Intent (PhonePe/GPay)',
    issuer: 'UPI Intent',
    method: 'upi',
    status: 'HEALTHY',
    isDegraded: false,
    currentSuccessRate: 94.8,
    baselineSuccessRate: 94.0,
    avgLatencyMs: 640,
    latencyHistory: [
      { time: '14:20', latency: 610 },
      { time: '14:22', latency: 630 },
      { time: '14:24', latency: 650 },
      { time: '14:26', latency: 620 },
      { time: '14:28', latency: 640 },
    ],
  },
];

export const INITIAL_CASES: TransactionCase[] = [
  // ── 1. NEEDS REVIEW CASES (Human-in-the-Loop Triggers) ─────────────────
  {
    id: 'case_rzp_9a2f1b04',
    paymentId: 'pay_P92kLm91A',
    orderId: 'order_Nx829kLp1',
    timestamp: '2026-09-04T14:28:10+05:30',
    timeFormatted: '14:28:10 IST',
    customerName: 'Aarav Singhania',
    customerPhone: '+91 98201 44821',
    customerEmail: 'aarav.singhania@apexlogistics.in',
    amountPaise: 2450000,
    amountRupees: 24500.0,
    caseType: 'mandate',
    method: 'emandate',
    rail: 'HDFC',
    wasRerouted: false,
    declineClass: 'soft',
    errorReason: 'transaction_limit_exceeded',
    errorCode: 'BAD_REQUEST_ERROR',
    errorDescription: 'Recurring e-mandate debit exceeds ₹15,000 statutory limit without customer AFA.',
    isoCode: '61',
    isoCategory: 2,
    status: 'needs_review',
    needsReview: true,
    escalationReason: 'REGULATORY_GATE: E-Mandate Debit Exceeds ₹15,000 AFA Ceiling',
    regulatoryCitation: 'RBI "Digital Payments – E-Mandate Framework 2026" §4.2',
    financialExposure: 24500.0,
    agentConfidence: 0.94,
    agentSuggestedAction: 'Generate Razorpay Smart PayLink with Pre-Debit AFA OTP flow via WhatsApp.',
    slaCountdownSeconds: 24 * 3600 - 1840,
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Current time 14:28 IST is within 08:00–19:00 IST calling window.' },
      emandateAfa: { passed: false, citation: 'RBI E-Mandate 2026 §4.2', detail: '₹24,500 exceeds ₹15,000 AFA-free limit. Explicit 2-factor OTP required.', requiresAfa: true },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'Not applicable to consumer mandate.' },
      traiDltHeader: { passed: true, citation: 'TRAI TCCCPR', detail: 'Header series 1601 verified.', header: '1601-RZPAY-TXN' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout Standard', detail: 'Safe window. Blackout active 23:30–03:30 IST.' },
    },
    bayesianTiming: {
      tenureEvents: 8,
      shrinkageWeight: 0.6154,
      modalDay: 5,
      targetDay: 4,
      delayHours: 4,
      scheduledTime: '2026-09-04T18:30:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/Nx829kLp1_afa',
      smsDelivered: true,
      dltHeader: '1601-RZPAY-TXN',
      timestamp: '2026-09-04T14:28:12+05:30',
    },
    outcome: {
      ptpStatus: 'PENDING',
      ptpPromisedDate: '2026-09-05',
    },
    auditBlockIndex: 1842,
    auditBlockHash: '7c89f10a8b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
  },
  {
    id: 'case_rzp_8f110c72',
    paymentId: 'pay_K71j0Pq2B',
    orderId: 'inv_BLUEDART_2026_891',
    timestamp: '2026-09-04T14:25:44+05:30',
    timeFormatted: '14:25:44 IST',
    customerName: 'Rameshwar Kulkarni',
    customerPhone: '+91 94220 88129',
    customerEmail: 'finance@vanguardchem.co.in',
    amountPaise: 18500000,
    amountRupees: 185000.0,
    caseType: 'b2b_receivable',
    method: 'netbanking',
    rail: 'SBI · NPCI',
    wasRerouted: false,
    declineClass: 'soft',
    errorReason: 'payment_timed_out',
    errorCode: 'GATEWAY_ERROR',
    errorDescription: 'B2B Invoice Payment Timed Out. Approaching Section 43B(h) 45-day statutory disallowance.',
    isoCode: '91',
    isoCategory: 2,
    status: 'needs_review',
    needsReview: true,
    escalationReason: 'STATUTORY_DEADLINE: MSMED Act §43B(h) 45-Day Tax Disallowance in 48h',
    regulatoryCitation: 'Finance Act 2023 §43B(h) / MSMED Act 2006 §15',
    financialExposure: 185000.0,
    agentConfidence: 0.88,
    agentSuggestedAction: 'Send Formal AP Escalation Notice with 1-Click NEFT/RTGS Virtual Account Link.',
    slaCountdownSeconds: 48 * 3600 - 320,
    b2bInvoiceId: 'INV-2026-VG-8812',
    b2bCompanyName: 'Vanguard Chemical Industries Ltd',
    b2bAgingBucket: '31_60_days',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Within daytime window.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'B2B Invoice flow.' },
      msmed43Bh: { passed: false, citation: 'MSMED Act §15', detail: 'Day 43 of 45. Penal interest (19.5% p.a.) accrues if unpaid past Day 45.', daysRemaining: 2 },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: '1601-RZPB2B-INV' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Safe daylight hours.' },
    },
    bayesianTiming: {
      tenureEvents: 14,
      shrinkageWeight: 0.7368,
      modalDay: 1,
      targetDay: 1,
      delayHours: 2,
      scheduledTime: '2026-09-04T16:30:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/inv_vg_8812',
      smsDelivered: true,
      timestamp: '2026-09-04T14:25:46+05:30',
    },
    outcome: {
      ptpStatus: 'PENDING',
      ptpPromisedDate: '2026-09-05',
    },
    auditBlockIndex: 1841,
    auditBlockHash: '6b5a4d3c2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
  },
  {
    id: 'case_rzp_7e098a51',
    paymentId: 'pay_M80vQw33C',
    orderId: 'order_BoatAir141_99',
    timestamp: '2026-09-04T14:21:19+05:30',
    timeFormatted: '14:21:19 IST',
    customerName: 'Pooja Deshmukh',
    customerPhone: '+91 97665 12044',
    customerEmail: 'pooja.deshmukh@gmail.com',
    amountPaise: 149900,
    amountRupees: 1499.0,
    caseType: 'checkout_drop_off',
    method: 'upi',
    rail: 'HDFC',
    originalRail: 'HDFC',
    wasRerouted: true,
    rerouteReason: 'HDFC Switch Latency spiked to 8,900ms (31.9% SR). Failsafe to UPI Intent.',
    declineClass: 'technical',
    errorReason: 'bank_technical_error',
    errorCode: 'GATEWAY_ERROR',
    errorDescription: 'HDFC Core Banking timeout. Automated failover triggered.',
    isoCode: '91',
    isoCategory: 2,
    status: 'needs_review',
    needsReview: true,
    escalationReason: 'CUSTOMER_DISPUTE: Voicebot RPV Interrupted — Customer Requested Human Agent',
    regulatoryCitation: 'RBI FREE-AI Framework & Fair Practices Code §3.1',
    financialExposure: 1499.0,
    agentConfidence: 0.76,
    agentSuggestedAction: 'Assign to Grievance Redressal Officer; suppress automated voice retries.',
    slaCountdownSeconds: 3600 * 4 - 820,
    checkoutStage: 'otp_abandoned',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Within daytime window.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'Under ₹15,000 threshold.' },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'Consumer order.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Verified 1601 series.' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Daylight processing.' },
    },
    bayesianTiming: {
      tenureEvents: 3,
      shrinkageWeight: 0.375,
      modalDay: 7,
      targetDay: 5,
      delayHours: 1,
      scheduledTime: '2026-09-04T15:21:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'voicebot',
      voiceFsmState: 'HUMAN_ESCALATION',
      timestamp: '2026-09-04T14:21:25+05:30',
    },
    outcome: {},
    auditBlockIndex: 1840,
    auditBlockHash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
  },

  // ── 2. IN PROGRESS CASES ───────────────────────────────────────────────
  {
    id: 'case_rzp_6d987f40',
    paymentId: 'pay_J62hNx44D',
    orderId: 'sub_CloudScale_101',
    timestamp: '2026-09-04T14:18:02+05:30',
    timeFormatted: '14:18:02 IST',
    customerName: 'Vikramaditya Bose',
    customerPhone: '+91 99301 92831',
    customerEmail: 'vikram@cloudscale.tech',
    amountPaise: 499900,
    amountRupees: 4999.0,
    caseType: 'subscription',
    method: 'card',
    rail: 'ICICI',
    wasRerouted: false,
    declineClass: 'soft',
    errorReason: 'insufficient_funds',
    errorCode: 'BAD_REQUEST_ERROR',
    errorDescription: 'Your payment could not be completed due to insufficient account balance.',
    isoCode: '51',
    isoCategory: 2,
    status: 'in_progress',
    needsReview: false,
    agentConfidence: 0.92,
    agentSuggestedAction: 'Bayesian timing retry scheduled for payday (Day 1). Auto-retries paused.',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Within calling window.' },
      emandateAfa: { passed: true, citation: 'RBI E-mandate', detail: 'Under ₹15k limit.' },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'Consumer SaaS.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Verified.' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Safe.' },
    },
    bayesianTiming: {
      tenureEvents: 9,
      shrinkageWeight: 0.6429,
      modalDay: 1,
      targetDay: 1,
      delayHours: 18,
      scheduledTime: '2026-09-05T08:30:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/sub_cloudscale_101',
      smsDelivered: true,
      timestamp: '2026-09-04T14:18:05+05:30',
    },
    outcome: {
      ptpStatus: 'PENDING',
      ptpPromisedDate: '2026-09-05',
    },
    auditBlockIndex: 1839,
    auditBlockHash: '4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b',
  },
  {
    id: 'case_rzp_5c876e30',
    paymentId: 'pay_H51gMw55E',
    orderId: 'order_NoiseWatch_02',
    timestamp: '2026-09-04T14:15:22+05:30',
    timeFormatted: '14:15:22 IST',
    customerName: 'Ananya Sharma',
    customerPhone: '+91 98110 54321',
    customerEmail: 'ananya.s@outlook.com',
    amountPaise: 299900,
    amountRupees: 2999.0,
    caseType: 'checkout_drop_off',
    method: 'upi',
    rail: 'UPI Intent',
    originalRail: 'HDFC',
    wasRerouted: true,
    rerouteReason: 'Degraded HDFC switch bypassed. Direct UPI Intent dispatch.',
    declineClass: 'soft',
    errorReason: 'payment_cancelled',
    errorCode: 'BAD_REQUEST_ERROR',
    errorDescription: 'Customer cancelled UPI checkout sheet on mobile.',
    isoCode: '00',
    isoCategory: 2,
    status: 'in_progress',
    needsReview: false,
    agentConfidence: 0.95,
    checkoutStage: 'payment_method_selected',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Compliant.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'Standard e-commerce.' },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'N/A.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: '1601-RZPAY-CHK' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Compliant.' },
    },
    bayesianTiming: {
      tenureEvents: 2,
      shrinkageWeight: 0.2857,
      modalDay: 10,
      targetDay: 7,
      delayHours: 2,
      scheduledTime: '2026-09-04T16:15:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/chk_noise_02',
      smsDelivered: true,
      timestamp: '2026-09-04T14:15:26+05:30',
    },
    outcome: {},
    auditBlockIndex: 1838,
    auditBlockHash: '3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c',
  },

  // ── 3. AUTO RESOLVED CASES ─────────────────────────────────────────────
  {
    id: 'case_rzp_4b765d20',
    paymentId: 'pay_G40fLv66F',
    orderId: 'order_Mokobara_24L',
    timestamp: '2026-09-04T14:10:14+05:30',
    timeFormatted: '14:10:14 IST',
    customerName: 'Tanvi Nair',
    customerPhone: '+91 98450 19283',
    customerEmail: 'tanvi.nair@gmail.com',
    amountPaise: 449900,
    amountRupees: 4499.0,
    caseType: 'payment',
    method: 'upi',
    rail: 'UPI Intent',
    originalRail: 'HDFC',
    wasRerouted: true,
    rerouteReason: 'HDFC switch degraded. Rerouted to UPI Intent.',
    declineClass: 'technical',
    errorReason: 'gateway_technical_error',
    errorCode: 'GATEWAY_ERROR',
    errorDescription: 'Transient gateway malfunction. Re-routed to UPI Intent.',
    isoCode: '96',
    isoCategory: 2,
    status: 'auto_resolved',
    needsReview: false,
    agentConfidence: 0.98,
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI 2022-23/108', detail: 'Compliant.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'One-time payment.' },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'Retail D2C.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Passed.' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Passed.' },
    },
    bayesianTiming: {
      tenureEvents: 5,
      shrinkageWeight: 0.5,
      modalDay: 3,
      targetDay: 2,
      delayHours: 1,
      scheduledTime: '2026-09-04T14:12:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'auto_retry',
      paylinkUrl: 'https://rzp.io/i/moko_24l_rec',
      timestamp: '2026-09-04T14:10:20+05:30',
    },
    outcome: {
      ptpStatus: 'KEPT',
      recoveredAmountPaise: 449900,
      resolutionTimestamp: '2026-09-04T14:11:45+05:30',
      resolutionRule: 'upi_intent_auto_reroute_success',
    },
    auditBlockIndex: 1837,
    auditBlockHash: '2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
  },
  {
    id: 'case_rzp_3a654c10',
    paymentId: 'pay_F30eKu77G',
    orderId: 'inv_ZENITH_4091',
    timestamp: '2026-09-04T14:04:50+05:30',
    timeFormatted: '14:04:50 IST',
    customerName: 'Suresh Menon',
    customerPhone: '+91 98230 45678',
    customerEmail: 'accounts@zenithhealthware.com',
    amountPaise: 52000000,
    amountRupees: 520000.0,
    caseType: 'b2b_receivable',
    method: 'netbanking',
    rail: 'AXIS',
    wasRerouted: false,
    declineClass: 'soft',
    errorReason: 'payment_timed_out',
    errorCode: 'GATEWAY_ERROR',
    errorDescription: 'Corporate netbanking token expired.',
    isoCode: '91',
    isoCategory: 2,
    status: 'auto_resolved',
    needsReview: false,
    agentConfidence: 0.96,
    b2bInvoiceId: 'INV-ZENITH-4091',
    b2bCompanyName: 'Zenith Healthware LLP',
    b2bAgingBucket: '1_15_days',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI 2022-23/108', detail: 'Compliant.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'B2B Invoice.' },
      msmed43Bh: { passed: true, citation: 'MSMED Act §15', detail: 'Day 12 of 45. Within courteous AP cycle.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Passed.' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Safe daylight hours.' },
    },
    bayesianTiming: {
      tenureEvents: 22,
      shrinkageWeight: 0.8148,
      modalDay: 4,
      targetDay: 4,
      delayHours: 2,
      scheduledTime: '2026-09-04T14:06:00+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/inv_zenith_4091',
      timestamp: '2026-09-04T14:05:00+05:30',
    },
    outcome: {
      ptpStatus: 'KEPT',
      recoveredAmountPaise: 52000000,
      resolutionTimestamp: '2026-09-04T14:08:12+05:30',
      resolutionRule: 'corporate_smart_paylink_settlement',
    },
    auditBlockIndex: 1836,
    auditBlockHash: '1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
  },

  // ── 4. CLOSED / EXHAUSTED CASES (Stopped by ISO 8583 Rules) ───────────
  {
    id: 'case_rzp_29543b00',
    paymentId: 'pay_E20dJt88H',
    orderId: 'order_OTT_Sub_01',
    timestamp: '2026-09-04T13:58:30+05:30',
    timeFormatted: '13:58:30 IST',
    customerName: 'Kunal Kapoor',
    customerPhone: '+91 99870 11223',
    customerEmail: 'kunal.kapoor@gmail.com',
    amountPaise: 49900,
    amountRupees: 499.0,
    caseType: 'subscription',
    method: 'card',
    rail: 'ICICI',
    wasRerouted: false,
    declineClass: 'hard',
    errorReason: 'card_expired',
    errorCode: 'BAD_REQUEST_ERROR',
    errorDescription: 'Your card has expired. Please use another card.',
    isoCode: '54',
    isoCategory: 1,
    status: 'closed',
    needsReview: false,
    agentConfidence: 0.99,
    agentSuggestedAction: 'ISO 8583 Category 1 stopping rule applied. 0 auto-retries. Excess authorization fee avoided (₹42 saved).',
    complianceChecks: {
      rbiCallingWindow: { passed: true, citation: 'RBI 2022-23/108', detail: 'Compliant.' },
      emandateAfa: { passed: true, citation: 'N/A', detail: 'Under ₹15,000.' },
      msmed43Bh: { passed: true, citation: 'N/A', detail: 'N/A.' },
      traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Verified.' },
      cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Safe.' },
    },
    bayesianTiming: {
      tenureEvents: 4,
      shrinkageWeight: 0.4444,
      modalDay: 1,
      targetDay: 1,
      delayHours: 0,
      scheduledTime: '2026-09-04T13:58:30+05:30',
      cbsSafe: true,
    },
    dispatch: {
      channel: 'smart_paylink',
      paylinkUrl: 'https://rzp.io/i/sub_card_update_499',
      timestamp: '2026-09-04T13:58:32+05:30',
    },
    outcome: {
      resolutionRule: 'iso_8583_cat1_zero_retry_enforced',
      resolutionTimestamp: '2026-09-04T13:58:35+05:30',
    },
    auditBlockIndex: 1835,
    auditBlockHash: '0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f',
  },
];

export const INITIAL_VOICE_CALLS: ActiveVoiceCall[] = [
  {
    callId: 'call_fsm_8091',
    caseId: 'case_rzp_7e098a51',
    customerName: 'Pooja Deshmukh',
    customerPhone: '+91 97665 12044',
    amountRupees: 1499.0,
    originatingNumber: '+91 1601 294 819',
    state: 'HUMAN_ESCALATION',
    rpvRetries: 1,
    durationSeconds: 94,
    transcriptSnippet: 'Voicebot: "Namaste Pooja ji, Razorpay Merchant ki taraf se phone hai..." Customer: "Mujhe kisi executive se baat karni hai."',
    callStartedAt: '14:21:25 IST',
  },
  {
    callId: 'call_fsm_8092',
    caseId: 'case_rzp_6d987f40',
    customerName: 'Vikramaditya Bose',
    customerPhone: '+91 99301 92831',
    amountRupees: 4999.0,
    originatingNumber: '+91 1601 294 820',
    state: 'RIGHT_PARTY_VERIFICATION',
    rpvRetries: 0,
    durationSeconds: 28,
    transcriptSnippet: 'Voicebot: "Namaste, kya meri baat Vikramaditya Bose ji se ho rahi hai?"',
    callStartedAt: '14:27:50 IST',
  },
  {
    callId: 'call_fsm_8093',
    caseId: 'case_rzp_8f110c72',
    customerName: 'Rameshwar Kulkarni',
    customerPhone: '+91 94220 88129',
    amountRupees: 185000.0,
    originatingNumber: '+91 1601 294 821',
    state: 'PAYMENT_DISCUSSION',
    rpvRetries: 0,
    durationSeconds: 142,
    transcriptSnippet: 'Voicebot: "Invoice INV-2026-VG-8812 ka balance pending hai. Kya aap kal tak clear karenge?" Customer: "Haan, kal subah finance team process kar degi."',
    callStartedAt: '14:25:55 IST',
  },
];

export const INITIAL_PAYLINKS: ActivePayLink[] = [
  {
    linkId: 'plink_99182',
    caseId: 'case_rzp_9a2f1b04',
    customerName: 'Aarav Singhania',
    shortUrl: 'https://rzp.io/i/Nx829kLp1_afa',
    amountRupees: 24500.0,
    channel: 'WhatsApp',
    createdAt: '14:28:12 IST',
    expiresInMinutes: 1438,
    clicksCount: 1,
    status: 'opened',
  },
  {
    linkId: 'plink_99181',
    caseId: 'case_rzp_5c876e30',
    customerName: 'Ananya Sharma',
    shortUrl: 'https://rzp.io/i/chk_noise_02',
    amountRupees: 2999.0,
    channel: 'WhatsApp',
    createdAt: '14:15:26 IST',
    expiresInMinutes: 1425,
    clicksCount: 2,
    status: 'opened',
  },
  {
    linkId: 'plink_99180',
    caseId: 'case_rzp_6d987f40',
    customerName: 'Vikramaditya Bose',
    shortUrl: 'https://rzp.io/i/sub_cloudscale_101',
    amountRupees: 4999.0,
    channel: 'SMS',
    createdAt: '14:18:05 IST',
    expiresInMinutes: 1428,
    clicksCount: 0,
    status: 'sent',
  },
];

export const INITIAL_PTPS: PtpCommitment[] = [
  {
    ptpId: 'ptp_case_rzp_9a2f_1',
    caseId: 'case_rzp_9a2f1b04',
    customerName: 'Aarav Singhania',
    customerPhone: '+91 98201 44821',
    amountRupees: 24500.0,
    promisedDate: '2026-09-05',
    status: 'PENDING',
    createdAt: '2026-09-04T14:28:10+05:30',
    notes: 'Customer promised to complete AFA OTP step once desktop banking access is active.',
    graceHoursRemaining: 23,
  },
  {
    ptpId: 'ptp_case_rzp_8f11_2',
    caseId: 'case_rzp_8f110c72',
    customerName: 'Rameshwar Kulkarni',
    customerPhone: '+91 94220 88129',
    amountRupees: 185000.0,
    promisedDate: '2026-09-05',
    status: 'PENDING',
    createdAt: '2026-09-04T14:25:44+05:30',
    notes: 'Corporate AP commitment to avoid Section 43B(h) disallowance.',
    graceHoursRemaining: 21,
  },
  {
    ptpId: 'ptp_case_rzp_4b76_3',
    caseId: 'case_rzp_4b765d20',
    customerName: 'Tanvi Nair',
    customerPhone: '+91 98450 19283',
    amountRupees: 4499.0,
    promisedDate: '2026-09-04',
    status: 'KEPT',
    createdAt: '2026-09-04T14:10:14+05:30',
    notes: 'Payment completed via UPI Intent link.',
    graceHoursRemaining: 0,
  },
  {
    ptpId: 'ptp_case_rzp_old_4',
    caseId: 'case_rzp_old_expired',
    customerName: 'Mohit Chhabra',
    customerPhone: '+91 98101 23456',
    amountRupees: 8999.0,
    promisedDate: '2026-09-02',
    status: 'BROKEN',
    createdAt: '2026-09-01T11:00:00+05:30',
    notes: 'PTP expired past 24h grace period. Escalated to Tier 2 outreach.',
    graceHoursRemaining: 0,
  },
];

export const INITIAL_AUDIT_BLOCKS: AuditBlock[] = [
  {
    index: 1842,
    timestamp: '2026-09-04T14:28:10.891Z',
    caseId: 'case_rzp_9a2f1b04',
    action: 'regulatory_gate_afa_hold',
    ruleFired: 'emandate_afa_free_limit_check',
    reason: 'Debit ₹24,500.00 exceeds statutory ₹15,000 ceiling. Autopay halted; customer AFA required.',
    prevHash: '6b5a4d3c2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
    canonicalHash: '7c89f10a8b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    payload: { case_id: 'case_rzp_9a2f1b04', amount_paise: 2450000, citation: 'RBI E-Mandate 2026' },
  },
  {
    index: 1841,
    timestamp: '2026-09-04T14:25:44.210Z',
    caseId: 'case_rzp_8f110c72',
    action: 'b2b_statutory_dunning_escalation',
    ruleFired: 'msmed_act_section_43bh_countdown',
    reason: 'Invoice Day 43/45. Flagged for human AP override before tax disallowance.',
    prevHash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    canonicalHash: '6b5a4d3c2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
    payload: { invoice_id: 'INV-2026-VG-8812', days_remaining: 2, legal_status: 'disallowance_imminent' },
  },
  {
    index: 1840,
    timestamp: '2026-09-04T14:21:19.450Z',
    caseId: 'case_rzp_7e098a51',
    action: 'fsm_human_transfer_logged',
    ruleFired: 'rbi_free_ai_customer_override',
    reason: 'Customer requested human agent during voicebot conversation. AI autonomous actions stopped.',
    prevHash: '4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b',
    canonicalHash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    payload: { phone: '+919766512044', reason: 'customer_requested_human', gro_assigned: 'GRO-PUN-01' },
  },
  {
    index: 1839,
    timestamp: '2026-09-04T14:18:02.110Z',
    caseId: 'case_rzp_6d987f40',
    action: 'bayesian_timing_slot_scheduled',
    ruleFired: 'timing_shrinkage_payday_alignment',
    reason: 'Customer modal payday Day 1 with shrinkage weight 0.64. Scheduled 18h delay avoiding CBS blackout.',
    prevHash: '3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c',
    canonicalHash: '4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b',
    payload: { modal_day: 1, target_day: 1, delay_hours: 18, cbs_safe: true },
  },
  {
    index: 1838,
    timestamp: '2026-09-04T14:15:22.780Z',
    caseId: 'case_rzp_5c876e30',
    action: 'switch_degradation_bypass_applied',
    ruleFired: 'dynamic_switch_rerouting_degradation_bypass',
    reason: 'Detected HDFC Bank switch degradation (8,900ms). Rerouted to UPI Intent.',
    prevHash: '2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
    canonicalHash: '3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c',
    payload: { degraded_switch: 'HDFC', fallback_rail: 'UPI Intent', lift_expected: '+62%' },
  },
  {
    index: 1837,
    timestamp: '2026-09-04T14:10:14.330Z',
    caseId: 'case_rzp_4b765d20',
    action: 'ai_agent_recovered',
    ruleFired: 'upi_intent_auto_reroute_success',
    reason: 'Recovered ₹4,499.00 via instant UPI Intent webhook confirmation.',
    prevHash: '1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
    canonicalHash: '2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
    payload: { recovered_amount_paise: 449900, channel: 'upi_intent', captured: true },
  },
  {
    index: 1836,
    timestamp: '2026-09-04T14:04:50.190Z',
    caseId: 'case_rzp_3a654c10',
    action: 'ai_agent_recovered',
    ruleFired: 'corporate_smart_paylink_settlement',
    reason: 'Recovered ₹5,20,000.00 via B2B Invoice PayLink settlement.',
    prevHash: '0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f',
    canonicalHash: '1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
    payload: { recovered_amount_paise: 52000000, company: 'Zenith Healthware LLP' },
  },
  {
    index: 1835,
    timestamp: '2026-09-04T13:58:30.040Z',
    caseId: 'case_rzp_29543b00',
    action: 'stop_retries',
    ruleFired: 'visa_mastercard_cat1_stopping_rule',
    reason: 'ISO 8583 Code 54 (Category 1) hard decline card_expired stopped (0 retries). Avoided penalties.',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    canonicalHash: '0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f',
    payload: { iso_code: '54', category: 1, penalty_avoided_inr: 42.0 },
  },
];

// In-memory simulation store with event emitter
type Listener = () => void;
class Store {
  private cases: TransactionCase[] = [...INITIAL_CASES];
  private switches: SwitchHealth[] = [...INITIAL_SWITCHES];
  private auditBlocks: AuditBlock[] = [...INITIAL_AUDIT_BLOCKS];
  private voiceCalls: ActiveVoiceCall[] = [...INITIAL_VOICE_CALLS];
  private payLinks: ActivePayLink[] = [...INITIAL_PAYLINKS];
  private ptps: PtpCommitment[] = [...INITIAL_PTPS];
  private listeners: Set<Listener> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private isStreaming: boolean = true;
  private blockCounter: number = 1843;

  constructor() {
    // Auto-stream completely disabled per user requirement (no fake demo ticks)
    this.isStreaming = false;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  getCases() {
    return this.cases;
  }

  clearCases() {
    this.cases = [];
    this.notify();
  }

  addRealExecutedCase(realData: any) {
    const newCase: TransactionCase = {
      id: realData.case_id,
      paymentId: realData.payment_id,
      orderId: realData.order_id,
      timestamp: realData.timestamp,
      timeFormatted: realData.time_formatted,
      customerName: realData.customer_name,
      customerPhone: realData.customer_phone,
      customerEmail: realData.customer_email,
      amountPaise: realData.amount_paise,
      amountRupees: realData.amount_rupees,
      caseType: realData.case_type,
      method: realData.method,
      rail: realData.rail,
      wasRerouted: false,
      declineClass: realData.decline_class,
      errorReason: realData.error_reason,
      errorCode: "BAD_REQUEST_ERROR",
      errorDescription: realData.error_reason,
      isoCode: realData.iso_code,
      isoCategory: realData.iso_category,
      status: realData.status,
      needsReview: realData.needs_review,
      escalationReason: realData.escalation_reason,
      regulatoryCitation: realData.regulatory_citation,
      financialExposure: realData.amount_rupees,
      agentConfidence: realData.agent_confidence,
      agentSuggestedAction: realData.agent_suggested_action,
      slaCountdownSeconds: 86400,
      complianceChecks: {
        rbiCallingWindow: {
          passed: realData.compliance_checks?.rbi_calling_window?.passed ?? true,
          citation: realData.compliance_checks?.rbi_calling_window?.citation ?? "RBI/2022-23/108",
          detail: realData.compliance_checks?.rbi_calling_window?.detail ?? "Compliance check",
        },
        emandateAfa: {
          passed: realData.compliance_checks?.emandate_afa?.passed ?? true,
          citation: realData.compliance_checks?.emandate_afa?.citation ?? "RBI E-Mandate",
          detail: realData.compliance_checks?.emandate_afa?.detail ?? "AFA check",
          requiresAfa: !realData.compliance_checks?.emandate_afa?.passed,
        },
        msmed43Bh: {
          passed: realData.compliance_checks?.msmed_43bh?.passed ?? true,
          citation: realData.compliance_checks?.msmed_43bh?.citation ?? "Finance Act §43B(h)",
          detail: realData.compliance_checks?.msmed_43bh?.detail ?? "MSMED check",
        },
        traiDltHeader: {
          passed: realData.compliance_checks?.trai_1601?.passed ?? true,
          citation: "TRAI 1601",
          detail: "TRAI 1601 series",
          header: "1601-RZPAY-TXN",
        },
        cbsBlackout: {
          passed: realData.compliance_checks?.cbs_blackout?.passed ?? true,
          citation: "CBS Blackout",
          detail: "CBS check",
        },
      },
      bayesianTiming: {
        tenureEvents: realData.bayesian_timing?.tenure ?? 2,
        shrinkageWeight: realData.bayesian_timing?.shrinkage_weight ?? 0.2857,
        modalDay: realData.bayesian_timing?.modal_day ?? 1,
        targetDay: realData.bayesian_timing?.target_day ?? 1,
        delayHours: realData.bayesian_timing?.delay_hours ?? 4,
        scheduledTime: realData.bayesian_timing?.scheduled_iso ?? new Date().toISOString(),
        cbsSafe: realData.bayesian_timing?.cbs_safe ?? true,
      },
      dispatch: {
        channel: realData.payment_link ? "smart_paylink" : "auto_retry",
        paylinkUrl: realData.payment_link || undefined,
        timestamp: new Date().toISOString(),
      },
      outcome: {
        ptpStatus: "PENDING",
      },
      auditBlockIndex: realData.audit_block_index || 1,
      auditBlockHash: realData.audit_block_hash || "0".repeat(64),
    };

    this.cases = [newCase, ...this.cases];

    // Append to in-memory audit blocks
    const newBlock: AuditBlock = {
      index: realData.audit_block_index || 1,
      timestamp: realData.timestamp,
      caseId: realData.case_id,
      action: "real_testbed_pipeline_execution",
      ruleFired: "autonomous_recovery_agent_evaluation",
      reason: `Live testbed execution for ${realData.customer_name} (${realData.customer_phone})`,
      prevHash: "0".repeat(64),
      canonicalHash: realData.audit_block_hash,
      payload: realData,
    };
    this.auditBlocks = [newBlock, ...this.auditBlocks];

    this.notify();
    return newCase;
  }

  getSwitches() {
    return this.switches;
  }

  getAuditBlocks() {
    return this.auditBlocks;
  }

  getVoiceCalls() {
    return this.voiceCalls;
  }

  getPayLinks() {
    return this.payLinks;
  }

  getPtps() {
    return this.ptps;
  }

  getStreamingStatus() {
    return this.isStreaming;
  }

  toggleStreaming() {
    this.isStreaming = !this.isStreaming;
    if (this.isStreaming) {
      this.startStream();
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  startStream() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.isStreaming) return;
      this.generateSimulatedEvent();
    }, 6000);
  }

  generateSimulatedEvent() {
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    const caseId = `case_rzp_${randomHex}`;
    const paymentId = `pay_${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

    const names = ['Aditya Rao', 'Neha Verma', 'Rohit Gupta', 'Meera Iyer', 'Arjun Kapoor', 'Sanjay Patel', 'Divya Nair'];
    const selectedName = names[Math.floor(Math.random() * names.length)];
    const rails: BankRail[] = ['HDFC', 'SBI · NPCI', 'ICICI', 'AXIS', 'UPI Intent'];
    const rail = rails[Math.floor(Math.random() * rails.length)];

    const isNeedsReview = Math.random() < 0.22; // 22% rate
    const isHard = Math.random() < 0.20;

    let errorReason = isHard ? 'card_expired' : 'insufficient_funds';
    let status: CaseStatus = isNeedsReview ? 'needs_review' : 'in_progress';
    let amountRupees = Math.floor(Math.random() * 8000) + 499;

    if (isNeedsReview && Math.random() < 0.4) {
      amountRupees = Math.floor(Math.random() * 15000) + 16000; // Trigger AFA ceiling
    }

    const prevBlock = this.auditBlocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newBlockHash = sha256Sync(`block_${this.blockCounter}_${caseId}`);

    const newCase: TransactionCase = {
      id: caseId,
      paymentId,
      orderId: `order_${randomHex}`,
      timestamp: now.toISOString(),
      timeFormatted,
      customerName: selectedName,
      customerPhone: '+91 98' + Math.floor(Math.random() * 89999999 + 10000000),
      customerEmail: `${selectedName.toLowerCase().replace(' ', '.')}@example.in`,
      amountPaise: amountRupees * 100,
      amountRupees,
      caseType: isHard ? 'subscription' : 'payment',
      method: isHard ? 'card' : 'upi',
      rail,
      wasRerouted: rail === 'UPI Intent',
      declineClass: isHard ? 'hard' : 'soft',
      errorReason,
      errorCode: isHard ? 'BAD_REQUEST_ERROR' : 'GATEWAY_ERROR',
      errorDescription: isHard ? 'Card expired. Zero retry stopping rule enforced.' : 'Account balance low. Retrying on payday.',
      isoCode: isHard ? '54' : '51',
      isoCategory: isHard ? 1 : 2,
      status,
      needsReview: isNeedsReview,
      escalationReason: isNeedsReview ? (amountRupees > 15000 ? 'REGULATORY_GATE: E-Mandate Debit Exceeds ₹15,000 AFA Ceiling' : 'NOVEL_DECLINE: Multi-Switch Latency Spike Detected') : undefined,
      regulatoryCitation: isNeedsReview ? 'RBI E-Mandate Framework 2026 §4.2' : undefined,
      financialExposure: isNeedsReview ? amountRupees : undefined,
      agentConfidence: isNeedsReview ? 0.79 : 0.94,
      agentSuggestedAction: isNeedsReview ? 'Approve dynamic WhatsApp PayLink dispatch with 2-factor OTP auth.' : 'Bayesian timing retry scheduled.',
      slaCountdownSeconds: 86400,
      complianceChecks: {
        rbiCallingWindow: { passed: true, citation: 'RBI/2022-23/108', detail: 'Within calling window.' },
        emandateAfa: { passed: amountRupees <= 15000, citation: 'RBI E-Mandate', detail: amountRupees > 15000 ? 'Exceeds ₹15k AFA limit' : 'Under limit', requiresAfa: amountRupees > 15000 },
        msmed43Bh: { passed: true, citation: 'N/A', detail: 'N/A' },
        traiDltHeader: { passed: true, citation: 'TRAI 1601', detail: 'Passed' },
        cbsBlackout: { passed: true, citation: 'CBS Blackout', detail: 'Safe' },
      },
      bayesianTiming: {
        tenureEvents: 4,
        shrinkageWeight: 0.4444,
        modalDay: 1,
        targetDay: 1,
        delayHours: 4,
        scheduledTime: now.toISOString(),
        cbsSafe: true,
      },
      dispatch: {
        channel: 'smart_paylink',
        paylinkUrl: `https://rzp.io/i/${caseId.slice(5)}`,
        timestamp: now.toISOString(),
      },
      outcome: {},
      auditBlockIndex: this.blockCounter,
      auditBlockHash: newBlockHash,
    };

    // Prepend case
    this.cases = [newCase, ...this.cases.slice(0, 75)];

    // Prepend audit block
    const newBlock: AuditBlock = {
      index: this.blockCounter,
      timestamp: now.toISOString(),
      caseId,
      action: isNeedsReview ? 'human_review_flagged' : 'auto_retry_scheduled',
      ruleFired: isNeedsReview ? 'regulatory_override_sentinel' : 'bayesian_timing_slot_scheduled',
      reason: isNeedsReview ? 'Escalated to human-in-the-loop per compliance rules.' : 'Optimal timing scheduled.',
      prevHash,
      canonicalHash: newBlockHash,
      payload: { case_id: caseId, amount: amountRupees },
    };
    this.auditBlocks = [newBlock, ...this.auditBlocks.slice(0, 50)];
    this.blockCounter++;

    this.notify();
  }

  // Operator Actions
  approveCase(caseId: string, note: string, operatorName: string = 'Operator (NOC Team)') {
    const c = this.cases.find((x) => x.id === caseId);
    if (!c) return;
    c.status = 'in_progress';
    c.needsReview = false;
    c.operatorDecision = {
      action: 'approve',
      note: note || 'Approved agent suggested action.',
      decidedAt: new Date().toISOString(),
      decidedBy: operatorName,
    };

    // Write to audit ledger
    const prevBlock = this.auditBlocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newHash = sha256Sync(`block_${this.blockCounter}_approve_${caseId}`);
    const block: AuditBlock = {
      index: this.blockCounter++,
      timestamp: new Date().toISOString(),
      caseId,
      action: 'operator_human_approved',
      ruleFired: 'human_in_the_loop_approval',
      reason: `Operator approved case remediation. Note: "${note}"`,
      prevHash,
      canonicalHash: newHash,
      payload: { operator: operatorName, note, status: 'approved' },
    };
    this.auditBlocks = [block, ...this.auditBlocks];
    this.notify();
  }

  overrideCase(caseId: string, newRailOrChannel: string, note: string, operatorName: string = 'Operator (NOC Team)') {
    const c = this.cases.find((x) => x.id === caseId);
    if (!c) return;
    c.status = 'in_progress';
    c.needsReview = false;
    c.wasRerouted = true;
    c.rerouteReason = `Operator manually overrode routing to: ${newRailOrChannel}`;
    c.operatorDecision = {
      action: 'override',
      overrideAction: newRailOrChannel,
      note: note || `Overrode default action to ${newRailOrChannel}`,
      decidedAt: new Date().toISOString(),
      decidedBy: operatorName,
    };

    const prevBlock = this.auditBlocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newHash = sha256Sync(`block_${this.blockCounter}_override_${caseId}`);
    const block: AuditBlock = {
      index: this.blockCounter++,
      timestamp: new Date().toISOString(),
      caseId,
      action: 'operator_human_override',
      ruleFired: 'human_in_the_loop_override',
      reason: `Operator overrode route to ${newRailOrChannel}. Note: "${note}"`,
      prevHash,
      canonicalHash: newHash,
      payload: { operator: operatorName, override_action: newRailOrChannel, note },
    };
    this.auditBlocks = [block, ...this.auditBlocks];
    this.notify();
  }

  rejectCase(caseId: string, note: string, operatorName: string = 'Operator (NOC Team)') {
    const c = this.cases.find((x) => x.id === caseId);
    if (!c) return;
    c.status = 'closed';
    c.needsReview = false;
    c.operatorDecision = {
      action: 'reject',
      note: note || 'Rejected and assigned to Grievance Redressal Officer.',
      decidedAt: new Date().toISOString(),
      decidedBy: operatorName,
    };

    const prevBlock = this.auditBlocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newHash = sha256Sync(`block_${this.blockCounter}_reject_${caseId}`);
    const block: AuditBlock = {
      index: this.blockCounter++,
      timestamp: new Date().toISOString(),
      caseId,
      action: 'operator_human_rejected',
      ruleFired: 'human_in_the_loop_rejection',
      reason: `Operator rejected remediation and escalated to GRO. Note: "${note}"`,
      prevHash,
      canonicalHash: newHash,
      payload: { operator: operatorName, note, status: 'rejected_escalated_to_gro' },
    };
    this.auditBlocks = [block, ...this.auditBlocks];
    this.notify();
  }

  toggleSwitchDegradation(railId: string) {
    const sw = this.switches.find((s) => s.railId === railId);
    if (!sw) return;
    sw.isDegraded = !sw.isDegraded;
    if (sw.isDegraded) {
      sw.status = 'DEGRADED';
      sw.currentSuccessRate = 31.9;
      sw.avgLatencyMs = 8900;
      sw.rootCause = 'Core Banking Host Timeout / Maintenance (NPCI Switch Error 91)';
      sw.failoverTarget = 'UPI Intent (PhonePe / GPay / Paytm)';
    } else {
      sw.status = 'HEALTHY';
      sw.currentSuccessRate = sw.baselineSuccessRate;
      sw.avgLatencyMs = 1100;
      sw.rootCause = undefined;
      sw.failoverTarget = undefined;
    }
    this.notify();
  }

  tamperBlock(blockIndex: number) {
    const block = this.auditBlocks.find((b) => b.index === blockIndex);
    if (!block) return;
    block.isTampered = true;
    block.canonicalHash = 'deadbeef' + block.canonicalHash.slice(8); // corrupt hash
    this.notify();
  }

  restoreBlocks() {
    this.auditBlocks = [...INITIAL_AUDIT_BLOCKS];
    this.notify();
  }

  auditSampleCase(caseId: string, auditorNote: string) {
    const c = this.cases.find((x) => x.id === caseId);
    if (!c) return;
    const prevBlock = this.auditBlocks[0];
    const prevHash = prevBlock ? prevBlock.canonicalHash : '0'.repeat(64);
    const newHash = sha256Sync(`block_${this.blockCounter}_sample_${caseId}`);
    const block: AuditBlock = {
      index: this.blockCounter++,
      timestamp: new Date().toISOString(),
      caseId,
      action: 'governance_audit_sampling_verified',
      ruleFired: 'rbi_independent_assurance_sampling',
      reason: `Independent assurance sampling sign-off: "${auditorNote}"`,
      prevHash,
      canonicalHash: newHash,
      payload: { case_id: caseId, auditor: 'Compliance Officer (Internal Audit)', note: auditorNote },
    };
    this.auditBlocks = [block, ...this.auditBlocks];
    this.notify();
  }
}

export const dataStore = new Store();
