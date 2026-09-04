import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { AuditBlock } from '@/lib/types';

export async function GET() {
  try {
    const cwd = process.cwd();
    const auditPath = path.join(cwd, 'output', 'audit_log.jsonl');

    if (!fs.existsSync(auditPath)) {
      return NextResponse.json({
        success: true,
        blocks: [],
        total: 0,
      });
    }

    const fileStream = fs.createReadStream(auditPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const blocks: AuditBlock[] = [];
    let index = 1;

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const raw = JSON.parse(line);
        blocks.push({
          index: index++,
          timestamp: raw.timestamp || new Date().toISOString(),
          caseId: raw.case_id || 'system_event',
          action: raw.action || 'decision_recorded',
          ruleFired: raw.rule_fired || 'statutory_compliance_rule',
          reason: raw.reason || 'Decision recorded in immutable SHA-256 chain.',
          prevHash: raw.prev_hash || '0'.repeat(64),
          canonicalHash: raw.canonical_hash || '0'.repeat(64),
          payload: raw.details || raw.payload || {},
        });
      } catch (err) {
        // skip malformed
      }
    }

    // Reverse to show latest first (block explorer standard)
    const reversed = [...blocks].reverse();

    return NextResponse.json({
      success: true,
      blocks: reversed,
      total: blocks.length,
      latestHash: blocks[blocks.length - 1]?.canonicalHash || '0'.repeat(64),
    });
  } catch (error: any) {
    console.error('Error reading audit_log.jsonl:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
