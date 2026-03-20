const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { writeFile, unlink, mkdir } = require('fs/promises');
const os = require('os');

const execAsync = promisify(exec);
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = isDev 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../public/icon.png');
  
  console.log('Preload path:', preloadPath);
  console.log('Icon path:', iconPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('__dirname:', __dirname);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false, // 先不显示窗口，等待内容加载完成
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false // 允许加载本地资源
    },
    icon: iconPath,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff'
  });

  // 设置窗口标题
  mainWindow.setTitle('FlowCode Platform');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
    mainWindow.show();
  } else {
    // 使用正确的路径加载 index.html
    const indexPath = path.join(__dirname, '../out/index.html');
    console.log('Loading index.html from:', indexPath);
    
    // 检查文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(indexPath)) {
      console.error('ERROR: index.html not found at:', indexPath);
      // 尝试备用路径
      const altPath = path.join(process.resourcesPath, 'app/out/index.html');
      console.log('Trying alternative path:', altPath);
      if (fs.existsSync(altPath)) {
        mainWindow.loadFile(altPath);
      } else {
        console.error('ERROR: index.html not found at alternative path either');
        // 显示错误页面
        mainWindow.loadURL(`data:text/html,<h1>Error: Application files not found</h1><p>Please reinstall the application.</p>`);
        mainWindow.show();
        return;
      }
    } else {
      mainWindow.loadFile(indexPath);
    }
  }

  // 页面加载完成后显示窗口
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    // 确保窗口显示并聚焦
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      
      // 强制窗口到前台
      if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(false);
          }
        }, 100);
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
    // 加载失败时也显示窗口，显示错误信息
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // 处理渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // 处理未捕获的异常
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3) { // Error level
      console.error('Renderer console error:', message);
    }
  });
}

// 确保单实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当尝试运行第二个实例时，聚焦到第一个实例的窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log('App is ready, creating window...');
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'http://localhost:5000') {
        event.preventDefault();
      }
    } catch (e) {
      // 本地文件路径，允许导航
    }
  });
});

// 处理便携版启动问题
if (process.platform === 'win32') {
  app.setAppUserModelId('com.flowcode.app');
}

ipcMain.handle('execute-python', async (event, code) => {
  try {
    if (!code || typeof code !== 'string') {
      return { success: false, error: '请提供有效的Python代码' };
    }

    if (code.length > 10000) {
      return { success: false, error: '代码过长，最多支持10000个字符' };
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
        return { 
          success: false, 
          error: '检测到不安全的代码模式。为了安全起见，某些操作（如文件操作、系统调用等）被禁止。' 
        };
      }
    }

    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const tempDir = os.tmpdir();
    const fileName = `code_${sessionId}.py`;
    const filePath = path.join(tempDir, fileName);
    const timeout = 10000;
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const command = `"${pythonCommand}" "${filePath}"`;

    await mkdir(tempDir, { recursive: true }).catch(() => {});
    
    await writeFile(filePath, code, 'utf-8');

    try {
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

      return {
        success: true,
        output: output || '代码执行完成，没有输出',
      };

    } catch (execError) {
      await unlink(filePath).catch(() => {});

      let errorMessage = '执行出错';
      
      if (execError.signal === 'SIGTERM' || execError.killed) {
        errorMessage = '执行超时（超过10秒）';
      } else if (execError.stderr) {
        errorMessage = execError.stderr;
      } else if (execError.message) {
        errorMessage = execError.message;
      }

      if (errorMessage.includes('python: command not found') || errorMessage.includes('不是内部或外部命令')) {
        errorMessage = 'Python未安装或未添加到系统PATH中';
      }

      if (errorMessage.includes('EPERM') || errorMessage.includes('permission denied')) {
        errorMessage = '权限错误：无法执行Python文件';
      }

      if (errorMessage.includes('ENOENT') || errorMessage.includes('No such file')) {
        errorMessage = '文件不存在错误：无法找到Python文件';
      }

      return {
        success: false,
        error: errorMessage
      };
    }

  } catch (error) {
    return {
      success: false,
      error: '服务器错误: ' + (error.message || '未知错误')
    };
  }
});
