import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cwd = process.cwd();
    const summaryPath = path.join(cwd, 'output', 'recovery_summary.json');
    const benchmarkPath = path.join(cwd, 'output', 'benchmark_results.json');

    let summary = null;
    let benchmark = null;

    if (fs.existsSync(summaryPath)) {
      const raw = fs.readFileSync(summaryPath, 'utf8');
      summary = JSON.parse(raw);
    }

    if (fs.existsSync(benchmarkPath)) {
      const raw = fs.readFileSync(benchmarkPath, 'utf8');
      benchmark = JSON.parse(raw);
    }

    return NextResponse.json({
      success: true,
      summary,
      benchmark,
      source: 'output_files',
    });
  } catch (error: any) {
    console.error('Error loading engine summary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
