import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// 存储活跃的执行会话
const activeSessions = new Map<string, {
  process: any;
  inputQueue: string[];
  isWaitingForInput: boolean;
  controller?: any;
}>();

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { code, sessionId } = await request.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: '请提供有效的Python代码' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (code.length > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: '代码过长，最多支持10000个字符' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dangerousPatterns = [
      /import\s+os/i,
      /import\s+subprocess/i,
      /import\s+shutil/i,
      /__import__/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /open\s*\(/i,
      /os\./i,
      /subprocess\./i,
      /shutil\./i,
      /__file__/i,
      /__builtins__/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: '检测到不安全的代码模式。为了安全起见，某些操作（如文件操作、系统调用等）被禁止。' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const newSessionId = sessionId || uuidv4();
    const tempDir = os.tmpdir();
    const fileName = `code_${newSessionId}.py`;
    const filePath = join(tempDir, fileName);
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    // 确保临时目录存在
    await mkdir(tempDir, { recursive: true }).catch(() => {});
    await writeFile(filePath, code, 'utf-8');

    console.log('启动交互式Python执行:', { sessionId: newSessionId, filePath });

    // 创建可读流用于SSE
    const encoder = new TextEncoder();
    let streamController: any = null;
    
    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;
        
        try {
          // 启动Python进程
          const pythonProcess = spawn(pythonCommand, [filePath], {
            cwd: tempDir,
            env: {
              ...process.env,
              PYTHONIOENCODING: 'utf-8',
              PYTHONUNBUFFERED: '1',
            },
          });

          // 存储会话信息
          activeSessions.set(newSessionId, {
            process: pythonProcess,
            inputQueue: [],
            isWaitingForInput: false,
            controller: controller,
          });

          // 发送会话开始事件
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', sessionId: newSessionId })}\n\n`));

          // 处理标准输出
          pythonProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString('utf-8');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'output', content: output })}\n\n`));
          });

          // 处理标准错误
          pythonProcess.stderr.on('data', (data: Buffer) => {
            const error = data.toString('utf-8');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error })}\n\n`));
          });

          // 处理进程退出
          pythonProcess.on('close', async (code: number) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`));
            controller.close();
            
            // 清理文件和会话
            await unlink(filePath).catch(() => {});
            activeSessions.delete(newSessionId);
          });

          // 处理进程错误
          pythonProcess.on('error', async (error: Error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'exit', code: 1 })}\n\n`));
            controller.close();
            
            // 清理文件和会话
            await unlink(filePath).catch(() => {});
            activeSessions.delete(newSessionId);
          });

        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'exit', code: 1 })}\n\n`));
          controller.close();
          
          // 清理文件
          await unlink(filePath).catch(() => {});
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('交互式Python执行API错误:', error);
    return new Response(
      JSON.stringify({ success: false, error: '服务器错误: ' + (error.message || '未知错误') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 处理输入的API
export async function PUT(request: NextRequest) {
  try {
    const { sessionId, input } = await request.json();

    if (!sessionId || !activeSessions.has(sessionId)) {
      return new Response(
        JSON.stringify({ success: false, error: '会话不存在或已结束' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = activeSessions.get(sessionId)!;
    
    if (session.process && session.process.stdin) {
      session.process.stdin.write(input + '\n');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('输入API错误:', error);
    return new Response(
      JSON.stringify({ success: false, error: '服务器错误: ' + (error.message || '未知错误') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 停止执行的API
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId || !activeSessions.has(sessionId)) {
      return new Response(
        JSON.stringify({ success: false, error: '会话不存在或已结束' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = activeSessions.get(sessionId)!;
    
    if (session.process) {
      session.process.kill('SIGTERM');
    }

    activeSessions.delete(sessionId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('停止执行API错误:', error);
    return new Response(
      JSON.stringify({ success: false, error: '服务器错误: ' + (error.message || '未知错误') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
