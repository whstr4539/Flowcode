import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const execAsync = promisify(exec);

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { code, inputs } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供有效的Python代码' },
        { status: 400 }
      );
    }

    // 如果有预定义的输入，替换 input() 调用
    let processedCode = code;
    if (inputs && Array.isArray(inputs) && inputs.length > 0) {
      let inputIndex = 0;
      
      // 替换 input() 调用
      processedCode = processedCode.replace(/input\s*\(\s*([^)]*)\s*\)/g, (match, prompt) => {
        if (inputIndex < inputs.length) {
          const inputValue = inputs[inputIndex++];
          // 处理字符串值
          if (typeof inputValue === 'string') {
            return `'${inputValue.replace(/'/g, "\\'")}'`;
          }
          return String(inputValue);
        }
        return match;
      });
    }

    if (code.length > 10000) {
      return NextResponse.json(
        { success: false, error: '代码过长，最多支持10000个字符' },
        { status: 400 }
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
        return NextResponse.json(
          { 
            success: false, 
            error: '检测到不安全的代码模式。为了安全起见，某些操作（如文件操作、系统调用等）被禁止。' 
          },
          { status: 400 }
        );
      }
    }

    const sessionId = uuidv4();
    const tempDir = os.tmpdir();
    const fileName = `code_${sessionId}.py`;
    const filePath = join(tempDir, fileName);
    const timeout = 10000;
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const command = `${pythonCommand} "${filePath}"`;

    // 确保临时目录存在
    await mkdir(tempDir, { recursive: true }).catch(() => {});
    
    await writeFile(filePath, processedCode, 'utf-8');

    try {
      console.log('执行Python命令:', command);
      console.log('文件路径:', filePath);
      console.log('临时目录:', tempDir);

      const { stdout, stderr } = await execAsync(command, {
        timeout: timeout,
        cwd: tempDir,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
        },
      });

      let output = '';
      if (stdout) {
        output += stdout;
      }
      if (stderr) {
        output += (output ? '\n' : '') + '警告/错误:\n' + stderr;
      }

      await unlink(filePath).catch(() => {});

      return NextResponse.json({
        success: true,
        output: output || '代码执行完成，没有输出',
      });

    } catch (execError: any) {
      await unlink(filePath).catch(() => {});

      let errorMessage = '执行出错';
      
      if (execError.signal === 'SIGTERM' || execError.killed) {
        errorMessage = '执行超时（超过10秒）';
      } else if (execError.stderr) {
        errorMessage = execError.stderr;
      } else if (execError.message) {
        errorMessage = execError.message;
      }

      // 检查是否是Python未找到的错误
      if (errorMessage.includes('python: command not found') || errorMessage.includes('不是内部或外部命令')) {
        errorMessage = 'Python未安装或未添加到系统PATH中';
      }

      // 检查是否是权限错误
      if (errorMessage.includes('EPERM') || errorMessage.includes('permission denied')) {
        errorMessage = '权限错误：无法执行Python文件';
      }

      // 检查是否是文件不存在错误
      if (errorMessage.includes('ENOENT') || errorMessage.includes('No such file')) {
        errorMessage = '文件不存在错误：无法找到Python文件';
      }

      console.error('Python执行错误详情:', {
        error: execError,
        errorMessage: errorMessage,
        command: command,
        filePath: filePath
      });

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 200 }
      );
    }

  } catch (error: any) {
    console.error('Python执行API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误: ' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}
