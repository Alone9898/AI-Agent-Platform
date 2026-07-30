import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { dirname, isAbsolute, resolve } from 'path';

export type ToolExecutionErrorCode =
  | 'INVALID_INPUT'
  | 'SPAWN_FAILED'
  | 'TIMEOUT'
  | 'NON_ZERO_EXIT'
  | 'INVALID_OUTPUT';

export class ToolExecutionError extends Error {
  readonly code: ToolExecutionErrorCode;
  readonly scriptPath?: string;
  readonly exitCode?: number | null;
  readonly signal?: NodeJS.Signals | null;
  readonly stdout?: string;
  readonly stderr?: string;

  constructor(
    message: string,
    code: ToolExecutionErrorCode,
    details: {
      scriptPath?: string;
      exitCode?: number | null;
      signal?: NodeJS.Signals | null;
      stdout?: string;
      stderr?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ToolExecutionError';
    this.code = code;
    this.scriptPath = details.scriptPath;
    this.exitCode = details.exitCode;
    this.signal = details.signal;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    if (details.cause !== undefined) {
      (this as unknown as { cause: unknown }).cause = details.cause;
    }
  }
}

export interface ToolExecutionRequest<TInput = unknown> {
  scriptPath: string;
  input: TInput;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  pythonExecutable?: string;
}

export interface ToolExecutionResult<TOutput = unknown> {
  output: TOutput;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
}

@Injectable()
export class ToolExecutor {
  async execute<TInput = unknown, TOutput = unknown>(
    request: ToolExecutionRequest<TInput>,
  ): Promise<ToolExecutionResult<TOutput>> {
    const pythonExecutable =
      request.pythonExecutable ??
      process.env.PYTHON_EXECUTABLE ??
      process.env.PYTHON ??
      (process.platform === 'win32' ? 'python' : 'python3');

    const executionCwd = request.cwd ?? process.cwd();
    const resolvedScriptPath = isAbsolute(request.scriptPath)
      ? request.scriptPath
      : resolve(executionCwd, request.scriptPath);
    const spawnCwd = request.cwd ?? dirname(resolvedScriptPath);
    const timeoutMs = request.timeoutMs ?? 30000;

    let inputPayload: string;
    try {
      inputPayload = JSON.stringify(request.input ?? null);
    } catch (cause) {
      throw new ToolExecutionError(
        'Tool input must be JSON serializable.',
        'INVALID_INPUT',
        {
          scriptPath: resolvedScriptPath,
          cause,
        },
      );
    }

    const startedAt = Date.now();

    return new Promise<ToolExecutionResult<TOutput>>((resolveResult, rejectResult) => {
      const child = spawn(
        pythonExecutable,
        [resolvedScriptPath, ...(request.args ?? [])],
        {
          cwd: spawnCwd,
          env: {
            ...process.env,
            ...request.env,
            PYTHONUNBUFFERED: '1',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let settled = false;
      let timedOut = false;

      const finishWithError = (error: ToolExecutionError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        rejectResult(error);
      };

      const finishWithResult = (result: ToolExecutionResult<TOutput>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolveResult(result);
      };

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);

      child.on('error', (cause) => {
        finishWithError(
          new ToolExecutionError('Failed to start Python process.', 'SPAWN_FAILED', {
            scriptPath: resolvedScriptPath,
            cause,
          }),
        );
      });

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      child.stdin.on('error', () => {
        // Ignore stdin errors after the child exits or closes early.
      });

      child.stdin.end(inputPayload);

      child.on('close', (exitCode, signal) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf8');
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        const durationMs = Date.now() - startedAt;

        if (timedOut) {
          finishWithError(
            new ToolExecutionError('Python tool execution timed out.', 'TIMEOUT', {
              scriptPath: resolvedScriptPath,
              exitCode,
              signal,
              stdout: truncateText(stdout),
              stderr: truncateText(stderr),
            }),
          );
          return;
        }

        if (exitCode !== 0) {
          finishWithError(
            new ToolExecutionError(
              `Python tool exited with code ${exitCode}.`,
              'NON_ZERO_EXIT',
              {
                scriptPath: resolvedScriptPath,
                exitCode,
                signal,
                stdout: truncateText(stdout),
                stderr: truncateText(stderr),
              },
            ),
          );
          return;
        }

        const normalizedOutput = stdout.replace(/^\uFEFF/, '').trim();
        if (!normalizedOutput) {
          finishWithError(
            new ToolExecutionError('Python tool returned empty output.', 'INVALID_OUTPUT', {
              scriptPath: resolvedScriptPath,
              exitCode,
              signal,
              stdout,
              stderr: truncateText(stderr),
            }),
          );
          return;
        }

        try {
          const output = JSON.parse(normalizedOutput) as TOutput;
          finishWithResult({
            output,
            stdout,
            stderr,
            exitCode,
            signal,
            durationMs,
          });
        } catch (cause) {
          finishWithError(
            new ToolExecutionError(
              'Python tool output is not valid JSON.',
              'INVALID_OUTPUT',
              {
                scriptPath: resolvedScriptPath,
                exitCode,
                signal,
                stdout: truncateText(stdout),
                stderr: truncateText(stderr),
                cause,
              },
            ),
          );
        }
      });
    });
  }
}

function truncateText(text: string, limit = 4000): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}... [truncated ${text.length - limit} chars]`;
}
