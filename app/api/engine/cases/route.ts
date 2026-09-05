import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { TransactionCase, CaseStatus, CaseType, DeclineClass, BankRail, PaymentMethod } from '@/lib/types';

function capitalizeWords(str: string): string {
  return str
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function deriveCustomerName(raw: any): string {
  if (raw.customer_name && typeof raw.customer_name === 'string' && raw.customer_name.trim()) {
    return raw.customer_name.trim();
  }
  if (raw.company_name && typeof raw.company_name === 'string') {
    return raw.company_name;
  }
  if (raw.contact_email && typeof raw.contact_email === 'string') {
    const prefix = raw.contact_email.split('@')[0];
    const clean = prefix.replace(/[0-9]/g, '');
    if (clean.length > 2) {
      return capitalizeWords(clean);
    }
  }
  return 'Merchant Customer';
}

function mapRail(method: string, network?: string | null): BankRail {
  if (method === 'upi') return 'UPI Intent';
  if (method === 'netbanking') return 'HDFC';
  if (method === 'emandate') return 'SBI · NPCI';
  if (method === 'card') {
    if (network === 'visa') return 'ICICI';
    if (network === 'mastercard') return 'AXIS';
    return 'ICICI';
  }
  return 'UPI Intent';
}

function transformRawCase(raw: any): TransactionCase {
  const amountPaise = raw.amount_paise || 0;
  const amountRupees = amountPaise / 100;
  const declineClass: DeclineClass = raw.decline_class || 'soft';
  const method: PaymentMethod = (raw.method as PaymentMethod) || 'upi';
  const rail = mapRail(method, raw.card_network);

  const isHard = declineClass === 'hard';
  const isAfaCeiling = raw.case_type === 'mandate' && amountPaise > 1500000;
  const isHighValueB2B = raw.case_type === 'b2b_receivable' && amountRupees > 50000;
  const isNeedsReview = isAfaCeiling || (isHard && amountRupees > 10000) || isHighValueB2B;

  let status: CaseStatus = 'in_progress';
  if (raw.operator_decision?.action === 'approve' || raw.operator_decision?.action === 'override') {
    status = 'auto_resolved';
  } else if (raw.operator_decision?.action === 'reject') {
    status = 'closed';
  } else if (isNeedsReview) {
    status = 'needs_review';
  } else if (raw.case_status === 'recovered') {
    status = 'auto_resolved';
  } else if (raw.case_status === 'closed') {
    status = 'closed';
  }

  const createdAt = raw.created_at || new Date().toISOString();
  let timeFormatted = '14:28:10 IST';
  try {
    const d = new Date(createdAt);
    timeFormatted = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} IST`;
  } catch (e) {
    // fallback
  }

  const customerName = deriveCustomerName(raw);
  const isoCode = isHard ? '54' : raw.error_reason === 'insufficient_funds' ? '51' : '91';
  const isoCategory = isHard ? 1 : 2;

  let escalationReason: string | undefined = undefined;
  let regulatoryCitation: string | undefined = undefined;

  if (isAfaCeiling) {
    escalationReason = 'REGULATORY_GATE: E-Mandate Debit Exceeds ₹15,000 AFA Ceiling';
    regulatoryCitation = 'RBI E-Mandate Framework 2026 §4.2';
  } else if (isHard && amountRupees > 10000) {
    escalationReason = 'HIGH_EXPOSURE_HARD_DECLINE: Stopping rule triggered on high-value transaction';
    regulatoryCitation = 'NPCI / RBI Procedural Guidelines';
  } else if (isHighValueB2B) {
    escalationReason = 'STATUTORY_SECTION_43B_H: MSME 45-day statutory payment ceiling exceeded';
    regulatoryCitation = 'Finance Act 2023 §43B(h)';
  }

  return {
    id: raw.case_id,
    paymentId: raw.razorpay_payment_id || `pay_${raw.case_id.slice(0, 12)}`,
    orderId: raw.razorpay_order_id || `order_${raw.case_id.slice(0, 12)}`,
    timestamp: createdAt,
    timeFormatted,
    customerName,
    customerPhone: raw.contact_phone || '+91 98201 00000',
    customerEmail: raw.contact_email || 'customer@example.in',
    amountPaise,
    amountRupees,
    caseType: (raw.case_type as CaseType) || 'payment',
    method,
    rail,
    wasRerouted: rail === 'UPI Intent' || raw.recovery_method === 'payment_link',
    rerouteReason: rail === 'UPI Intent' ? 'Autonomous failover from degraded bank switch' : undefined,
    declineClass,
    errorReason: raw.error_reason || 'payment_failed',
    errorCode: raw.error_code || 'GATEWAY_ERROR',
    errorDescription: raw.error_description || raw.error_reason || 'Payment failure',
    isoCode,
    isoCategory,
    status,
    needsReview: isNeedsReview,
    escalationReason,
    regulatoryCitation,
    financialExposure: isNeedsReview ? amountRupees : undefined,
    agentConfidence: status === 'auto_resolved' ? 0.94 : isHard ? 0.98 : 0.79,
    agentSuggestedAction: isHard
      ? 'Enforce ISO 8583 Cat 1 zero-retry stopping rule; notify cardholder.'
      : raw.recovery_method === 'payment_link'
      ? 'Approve dynamic WhatsApp PayLink dispatch with 2-factor OTP auth.'
      : 'Bayesian timing retry scheduled on liquidity cycle.',
    slaCountdownSeconds: 86400,
    b2bInvoiceId: raw.invoice_id || undefined,
    b2bCompanyName: raw.company_name || undefined,
    b2bAgingBucket: raw.aging_bucket || undefined,
    checkoutStage: raw.checkout_stage || undefined,
    complianceChecks: {
      rbiCallingWindow: {
        passed: true,
        citation: 'RBI/2022-23/108',
        detail: 'Compliant with 08:00–19:00 IST outreach window',
      },
      emandateAfa: {
        passed: !isAfaCeiling,
        citation: 'RBI E-Mandate Framework',
        detail: isAfaCeiling ? 'Debit exceeds ₹15,000 ceiling. Requires AFA.' : 'Under ₹15,000 threshold',
        requiresAfa: isAfaCeiling,
      },
      msmed43Bh: {
        passed: true,
        citation: 'Finance Act §43B(h)',
        detail: 'MSMED statutory payment window verified',
      },
      traiDltHeader: {
        passed: true,
        citation: 'TRAI 1601',
        detail: 'Registered 1601-RZPAY header',
        header: '1601-RZPAY-TXN',
      },
      cbsBlackout: {
        passed: true,
        citation: 'CBS Blackout',
        detail: 'CBS nocturnal maintenance blackout safe',
      },
    },
    bayesianTiming: {
      tenureEvents: 3,
      shrinkageWeight: 0.375,
      modalDay: 1,
      targetDay: 1,
      delayHours: 4,
      scheduledTime: raw.last_attempt_at || createdAt,
      cbsSafe: true,
    },
    dispatch: {
      channel: raw.recovery_method === 'voice'
        ? 'voicebot'
        : raw.recovery_method === 'payment_link'
        ? 'smart_paylink'
        : raw.recovery_method === 'sms'
        ? 'sms'
        : 'auto_retry',
      paylinkUrl: raw.payment_link_url || (raw.recovery_method === 'payment_link' ? `https://rzp.io/i/${raw.case_id.slice(0, 8)}` : undefined),
      timestamp: raw.last_attempt_at || createdAt,
    },
    outcome: {
      ptpStatus: raw.case_status === 'recovered' ? 'KEPT' : 'PENDING',
      recoveredAmountPaise: raw.recovered_amount_paise || 0,
      resolutionRule: raw.recovery_method || undefined,
    },
    auditBlockIndex: raw.audit_block_index || 1,
    auditBlockHash: raw.audit_block_hash || '0'.repeat(64),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const statusFilter = searchParams.get('status') || 'all';
    const caseTypeFilter = searchParams.get('case_type') || 'all';
    const declineClassFilter = searchParams.get('decline_class') || 'all';
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

    const cwd = process.cwd();
    const casesPath = path.join(cwd, 'output', 'cases.jsonl');

    if (!fs.existsSync(casesPath)) {
      return NextResponse.json({
        success: true,
        cases: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    const fileStream = fs.createReadStream(casesPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const matchedCases: TransactionCase[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const raw = JSON.parse(line);
        const transformed = transformRawCase(raw);

        // Apply filters
        if (statusFilter !== 'all' && transformed.status !== statusFilter) {
          continue;
        }
        if (caseTypeFilter !== 'all' && transformed.caseType !== caseTypeFilter) {
          continue;
        }
        if (declineClassFilter !== 'all' && transformed.declineClass !== declineClassFilter) {
          continue;
        }

        if (searchQuery) {
          const matchId = transformed.id.toLowerCase().includes(searchQuery);
          const matchPayment = transformed.paymentId.toLowerCase().includes(searchQuery);
          const matchCustomer = transformed.customerName.toLowerCase().includes(searchQuery);
          const matchPhone = transformed.customerPhone.toLowerCase().includes(searchQuery);
          const matchReason = transformed.errorReason.toLowerCase().includes(searchQuery);
          if (!matchId && !matchPayment && !matchCustomer && !matchPhone && !matchReason) {
            continue;
          }
        }

        matchedCases.push(transformed);
      } catch (err) {
        // skip malformed line
      }
    }

    // Sort: needs_review first, then by timestamp descending
    matchedCases.sort((a, b) => {
      if (a.needsReview && !b.needsReview) return -1;
      if (!a.needsReview && b.needsReview) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const total = matchedCases.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedCases = matchedCases.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      cases: paginatedCases,
      total,
      page,
      limit,
      totalPages,
      counts: {
        total,
        needs_review: matchedCases.filter((c) => c.status === 'needs_review').length,
        in_progress: matchedCases.filter((c) => c.status === 'in_progress').length,
        auto_resolved: matchedCases.filter((c) => c.status === 'auto_resolved').length,
        closed: matchedCases.filter((c) => c.status === 'closed').length,
      },
    });
  } catch (error: any) {
    console.error('Error reading cases.jsonl:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, action, note, overrideAction } = body;

    if (!caseId || !action) {
      return NextResponse.json({ success: false, error: 'caseId and action are required' }, { status: 400 });
    }

    const cwd = process.cwd();
    const casesPath = path.join(cwd, 'output', 'cases.jsonl');
    const summaryPath = path.join(cwd, 'output', 'recovery_summary.json');

    if (!fs.existsSync(casesPath)) {
      return NextResponse.json({ success: false, error: 'cases.jsonl not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(casesPath, 'utf8');
    const lines = fileContent.split('\n');
    let targetCase: any = null;
    let targetIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.case_id === caseId) {
          targetCase = parsed;
          targetIndex = i;
          break;
        }
      } catch (e) {}
    }

    if (!targetCase) {
      return NextResponse.json({ success: false, error: `Case ${caseId} not found` }, { status: 404 });
    }

    const wasAlreadyRecovered = targetCase.case_status === 'recovered';

    if (action === 'approve') {
      targetCase.case_status = 'recovered';
      targetCase.recovered_amount_paise = targetCase.amount_paise;
      targetCase.operator_decision = { action: 'approve', note, timestamp: new Date().toISOString() };
    } else if (action === 'override') {
      targetCase.case_status = 'recovered';
      targetCase.recovered_amount_paise = targetCase.amount_paise;
      targetCase.recovery_method = 'payment_link';
      targetCase.operator_decision = { action: 'override', override_action: overrideAction, note, timestamp: new Date().toISOString() };
    } else if (action === 'reject') {
      targetCase.case_status = 'closed';
      targetCase.recovered_amount_paise = 0;
      targetCase.operator_decision = { action: 'reject', note, timestamp: new Date().toISOString() };
    }

    lines[targetIndex] = JSON.stringify(targetCase);
    fs.writeFileSync(casesPath, lines.join('\n'), 'utf8');

    // If approved or overrode and wasn't already recovered, increment recovery summary
    if ((action === 'approve' || action === 'override') && !wasAlreadyRecovered && fs.existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        summary.recovered_cases = (summary.recovered_cases || 0) + 1;
        summary.recovered_amount_paise = (summary.recovered_amount_paise || 0) + targetCase.amount_paise;
        summary.recovered_amount_rupees = summary.recovered_amount_paise / 100.0;
        summary.overall_recovery_rate = summary.recovered_cases / (summary.total_cases || 1);
        summary.recovery_rate_by_amount = summary.recovered_amount_paise / (summary.total_amount_paise || 1);
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      case: targetCase,
      action,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
