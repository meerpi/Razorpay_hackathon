import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const seed = body.seed || 42;
    const mode = body.mode || 'benchmark'; // 'benchmark' or 'run'

    const cwd = process.cwd();
    const pythonPath = path.join(cwd, '.venv', 'bin', 'python3');
    const command = `${pythonPath} main.py ${mode} ${seed}`;

    console.log(`[RunBatch] Executing: ${command} in ${cwd}`);
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });

    // Read updated summary and benchmark results
    const summaryPath = path.join(cwd, 'output', 'recovery_summary.json');
    const benchmarkPath = path.join(cwd, 'output', 'benchmark_results.json');

    let summary = null;
    let benchmark = null;

    if (fs.existsSync(summaryPath)) {
      summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    }
    if (fs.existsSync(benchmarkPath)) {
      benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
    }

    return NextResponse.json({
      success: true,
      command,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      summary,
      benchmark,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error executing batch run:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      },
      { status: 500 }
    );
  }
}
