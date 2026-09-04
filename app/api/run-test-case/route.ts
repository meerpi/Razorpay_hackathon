import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python3');
    const scriptPath = path.join(process.cwd(), 'cli_test_runner.py');

    const child = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
      },
    });

    child.stdin.write(JSON.stringify(body));
    child.stdin.end();

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => resolve(code ?? 0));
    });

    if (exitCode !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Python execution failed with code ${exitCode}`,
          stderr: stderrData,
        },
        { status: 500 }
      );
    }

    const result = JSON.parse(stdoutData.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
