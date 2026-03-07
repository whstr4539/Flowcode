# FlowCode Platform - 网页应用部署指南（初学者版）

本文档专为初学者编写，详细介绍如何将 FlowCode Platform 部署为网页应用。即使你没有服务器管理经验，按照本指南也能成功部署。

## 目录

**公网部署方案（面向互联网用户）：**
1. [准备工作](#1-准备工作)
   - 1.1 [选择服务器](#11-选择服务器)
   - 1.2 [购买域名](#12-购买域名)
   - 1.3 [准备工具](#13-准备工具)
2. [服务器基础配置](#2-服务器基础配置)
   - 2.1 [连接服务器](#21-连接服务器)
   - 2.2 [开放端口](#22-开放端口)
   - 2.3 [创建新用户（推荐）](#23-创建新用户推荐)
3. [环境安装](#3-环境安装)
4. [项目部署](#4-项目部署)
5. [域名配置](#5-域名配置)
6. [HTTPS配置](#6-https配置)
7. [部署验证](#7-部署验证)
8. [常见问题](#8-常见问题)

**局域网部署方案（面向内网用户）：**
9. [局域网部署指南](#9-局域网部署指南)
   - 9.1 [局域网 vs 公网部署的区别](#91-局域网-vs-公网部署的区别)
   - 9.2 [机房服务器准备](#92-机房服务器准备)
   - 9.3 [内网域名配置（可选）](#93-内网域名配置可选)
   - 9.4 [局域网部署步骤](#94-局域网部署步骤)
   - 9.5 [内网访问方式](#95-内网访问方式)

---

## 1. 准备工作

### 1.1 选择服务器

#### 什么是服务器？
服务器就是一台24小时不关机的电脑，专门用来存放你的网站，让全世界的人都能访问。

#### 推荐的服务器提供商

**国内用户（访问速度快）：**

| 提供商 | 价格（月） | 优点 | 适合人群 |
|--------|-----------|------|----------|
| 阿里云 ECS | ￥60-100 | 稳定，文档齐全 | 初学者 |
| 腾讯云 CVM | ￥50-90 | 性价比高 | 初学者 |
| 华为云 | ￥60-100 | 企业级服务 | 商业项目 |

**国外用户（免备案）：**

| 提供商 | 价格（月） | 优点 | 适合人群 |
|--------|-----------|------|----------|
| Vultr | $5-10 | 按小时计费，随时删除 | 初学者 |
| DigitalOcean | $6-12 | 简单易用 | 初学者 |
| Linode | $5-10 | 稳定可靠 | 初学者 |

#### 服务器配置选择

**最低配置（适合测试/学习）：**
- CPU：1核
- 内存：2GB
- 硬盘：40GB SSD
- 带宽：1Mbps（国内）/ 1TB流量（国外）
- 系统：Ubuntu 22.04 LTS（推荐）

**推荐配置（适合正式项目）：**
- CPU：2核
- 内存：4GB
- 硬盘：80GB SSD
- 带宽：3Mbps（国内）/ 2TB流量（国外）
- 系统：Ubuntu 22.04 LTS

#### 购买步骤（以阿里云为例）

1. **注册账号**
   - 访问 [阿里云官网](https://www.aliyun.com/)
   - 点击右上角"免费注册"
   - 完成实名认证（需要身份证）

2. **购买服务器**
   - 搜索"云服务器 ECS"
   - 点击"立即购买"
   - 选择配置：
     - 付费模式：包年包月（长期用）或按量付费（测试用）
     - 地域：选择离你用户最近的（如华东1-杭州）
     - 实例：共享标准型 s6，1核2G
     - 镜像：Ubuntu 22.04 64位
     - 存储：40GB高效云盘
     - 带宽：1Mbps
   - 设置密码（记住这个密码！）
   - 确认订单并支付

3. **获取服务器信息**
   购买成功后，在控制台找到：
   - **公网IP**：类似 `123.45.67.89` 的数字
   - **用户名**：通常是 `root`
   - **密码**：你刚才设置的密码

---

### 1.2 购买域名

#### 什么是域名？
域名就是网站的地址，比如 `google.com`、`baidu.com`。用户通过域名访问你的网站，而不是记住复杂的IP地址。

#### 域名购买步骤

1. **选择域名注册商**
   - 国内：阿里云、腾讯云、华为云
   - 国外：Namecheap、GoDaddy、Google Domains

2. **查询并购买域名**
   - 访问 [阿里云域名注册](https://wanwang.aliyun.com/)
   - 输入想要的域名（如 `myflowcode`）
   - 选择后缀：
     - `.com`：￥60-70/年（最常用，推荐）
     - `.cn`：￥30-40/年（中国域名）
     - `.net`：￥70-80/年
   - 加入购物车并支付
   - 完成实名认证（国内域名需要）

3. **域名备案（仅国内服务器）**
   - 如果使用国内服务器，必须进行ICP备案
   - 在阿里云控制台搜索"ICP备案"
   - 按提示填写信息，上传证件
   - 等待审核（通常7-20个工作日）
   - **注意**：备案期间网站不能访问

---

### 1.3 准备工具

#### Windows用户

1. **SSH客户端**（连接服务器用）
   - 推荐：[Termius](https://termius.com/)（免费，界面友好）
   - 或：[PuTTY](https://www.putty.org/)（经典工具）
   - 或：Windows自带的 PowerShell / CMD

2. **文件传输工具**
   - 推荐：[WinSCP](https://winscp.net/)（免费，图形界面）
   - 或：Termius自带SFTP功能

3. **代码编辑器**（可选）
   - [VS Code](https://code.visualstudio.com/)（推荐）

#### Mac用户

Mac自带终端，可以直接使用：
- 按 `Command + 空格`，输入 "终端"
- 或使用 [iTerm2](https://iterm2.com/)（更强大）

#### 安装 Termius（推荐初学者）

1. 访问 https://termius.com/
2. 下载对应版本
3. 安装并注册账号
4. 点击"新建主机"：
   - 地址：你的服务器公网IP
   - 用户名：root
   - 密码：你设置的密码
   - 标签：FlowCode Server（方便识别）

---

## 2. 服务器基础配置

### 2.1 连接服务器

#### 使用 Termius 连接

1. 打开 Termius
2. 双击你创建的主机
3. 首次连接会提示保存密钥，点击"接受"
4. 看到类似下面的提示表示连接成功：

```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0 x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com

root@iZbp1xxxxxxxxxZ:~#
```

#### 使用命令行连接（Windows/Mac/Linux）

打开终端，输入：

```bash
ssh root@你的服务器IP
```

例如：
```bash
ssh root@123.45.67.89
```

输入密码（输入时不会显示，这是正常的），回车。

---

### 2.2 开放端口

#### 什么是端口？
端口就像服务器的"门"，不同的服务走不同的门：
- 80端口：HTTP网站（必需）
- 443端口：HTTPS网站（必需）
- 22端口：SSH远程连接（必需）

#### 阿里云开放端口步骤

1. 登录阿里云控制台
2. 进入"云服务器 ECS"
3. 点击你的服务器实例
4. 点击"安全组" → "配置规则"
5. 点击"手动添加"，添加以下规则：

| 类型 | 端口范围 | 授权对象 | 说明 |
|------|----------|----------|------|
| 自定义TCP | 80/80 | 0.0.0.0/0 | HTTP访问 |
| 自定义TCP | 443/443 | 0.0.0.0/0 | HTTPS访问 |
| 自定义TCP | 22/22 | 你的IP/32 | SSH连接（可选，限制更安全）|

**注意**：
- `0.0.0.0/0` 表示允许所有IP访问
- 如果要限制SSH访问，把"你的IP"换成你当前网络的公网IP（可在 https://ip.sb/ 查询）

#### 腾讯云开放端口步骤

1. 登录腾讯云控制台
2. 进入"云服务器"
3. 点击实例右侧的"更多" → "安全组" → "配置安全组"
4. 点击"添加规则"，添加上述相同的端口

#### 验证端口是否开放

在服务器上执行：

```bash
# 安装 net-tools
apt update
apt install -y net-tools

# 查看端口状态
netstat -tlnp
```

应该能看到 `*:80` 和 `*:443` 的监听状态。

---

### 2.3 创建新用户（推荐）

**为什么？**
一直使用 root 用户有风险，建议创建一个普通用户用于日常操作。

**操作步骤：**

```bash
# 创建新用户（把 "yourname" 换成你的名字）
adduser yourname

# 设置密码
passwd yourname

# 添加到 sudo 组（可以使用管理员权限）
usermod -aG sudo yourname

# 切换到新用户
su - yourname

# 测试 sudo 权限
sudo whoami
# 应该输出：root
```

以后连接服务器时，使用 `yourname` 而不是 `root`。

---

## 3. 环境安装

### 3.1 系统更新

连接服务器后，首先更新系统：

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件
sudo apt upgrade -y

# 安装常用工具
sudo apt install -y curl wget vim git ufw
```

### 3.2 安装 Node.js

```bash
# 使用 NodeSource 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
# 输出：v18.x.x

npm -v
# 输出：9.x.x
```

### 3.3 安装 pnpm

```bash
# 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm -v
# 输出：9.x.x
```

### 3.4 安装 Nginx

```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 查看状态
sudo systemctl status nginx
```

**验证 Nginx 是否运行：**

在浏览器访问你的服务器IP，应该看到 "Welcome to nginx!" 页面。

例如：在浏览器输入 `http://123.45.67.89`

---

## 4. 项目部署

### 4.1 创建项目目录

```bash
# 创建目录
sudo mkdir -p /var/www/flowcode

# 设置权限（使用你的用户名）
sudo chown -R $USER:$USER /var/www/flowcode

# 进入目录
cd /var/www/flowcode
```

### 4.2 上传项目代码

**方法一：使用 Git（推荐，如果你有代码仓库）**

```bash
cd /var/www/flowcode

# 克隆代码
git clone https://github.com/your-username/flowcode.git .

# 如果仓库是私有的，需要输入用户名和密码/Token
```

**方法二：使用 WinSCP（Windows）**

1. 下载并安装 [WinSCP](https://winscp.net/)
2. 打开 WinSCP，新建会话：
   - 文件协议：SFTP
   - 主机名：你的服务器IP
   - 用户名：root 或你的用户名
   - 密码：服务器密码
3. 点击"登录"
4. 左侧是你电脑的文件，右侧是服务器的文件
5. 在本地找到项目文件夹，拖到右侧 `/var/www/flowcode` 目录

**方法三：使用 SCP 命令**

在本地终端执行：

```bash
# 压缩项目文件夹
cd /path/to/your/flowcode
zip -r flowcode.zip . -x "node_modules/*" ".next/*" "dist/*"

# 上传到服务器
scp flowcode.zip root@你的服务器IP:/var/www/flowcode/

# 连接服务器解压
ssh root@你的服务器IP
cd /var/www/flowcode
unzip flowcode.zip
rm flowcode.zip
```

### 4.3 安装依赖并构建

```bash
cd /var/www/flowcode

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 查看构建输出
ls -la dist/web/
```

**构建成功标志：**
- 看到 `dist/web/index.html` 文件
- 没有红色错误信息

### 4.4 配置 Nginx

```bash
# 复制配置文件
sudo cp /var/www/flowcode/nginx.conf /etc/nginx/sites-available/flowcode

# 编辑配置文件
sudo nano /etc/nginx/sites-available/flowcode
```

**需要修改的地方：**

1. **第7行**：修改为你的域名
   ```nginx
   server_name your-domain.com www.your-domain.com;
   ```

2. **第18-19行**：暂时注释掉（等配置HTTPS时再启用）
   ```nginx
   # ssl_certificate /path/to/your/fullchain.pem;
   # ssl_certificate_key /path/to/your/privkey.pem;
   ```

3. **保存退出**：
   - 按 `Ctrl + X`
   - 按 `Y` 确认
   - 按 `Enter` 保存

**启用站点：**

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/flowcode /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 5. 域名配置

### 5.1 添加 DNS 解析

1. 登录你的域名注册商控制台
2. 找到域名管理 → DNS解析
3. 添加以下记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|----------|----------|--------|-----|
| @ | A | 你的服务器IP | 600 |
| www | A | 你的服务器IP | 600 |

**说明：**
- `@` 表示主域名（如 `your-domain.com`）
- `www` 表示 www 子域名（如 `www.your-domain.com`）
- TTL 是缓存时间，600秒 = 10分钟

### 5.2 等待 DNS 生效

DNS 传播需要时间，通常：
- 10分钟 - 2小时：大部分地区生效
- 最长 48小时：全球完全生效

**检查是否生效：**

```bash
# 在本地电脑执行
ping your-domain.com

# 应该显示你的服务器IP
```

或者在浏览器访问 `http://your-domain.com`，应该能看到你的网站。

---

## 6. HTTPS配置

### 6.1 什么是 HTTPS？

HTTPS 是加密的 HTTP，可以：
- 保护数据传输安全
- 提高搜索引擎排名
- 显示安全锁图标，增加用户信任

### 6.2 使用 Let's Encrypt（免费）

Let's Encrypt 提供免费的 SSL 证书，有效期90天，可以自动续期。

**安装 Certbot：**

```bash
# 安装 Certbot 和 Nginx 插件
sudo apt install -y certbot python3-certbot-nginx
```

**获取证书：**

```bash
# 自动配置 Nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**按提示操作：**
1. 输入邮箱地址（用于接收续期提醒）
2. 同意服务条款（输入 `A`）
3. 是否分享邮箱（输入 `N`）
4. 选择是否重定向 HTTP 到 HTTPS（输入 `2` 推荐）

**验证 HTTPS：**

在浏览器访问 `https://your-domain.com`，应该看到：
- 地址栏显示安全锁图标 🔒
- 网址以 `https://` 开头

### 6.3 自动续期

Let's Encrypt 证书有效期90天，Certbot 会自动续期。

**测试自动续期：**

```bash
sudo certbot renew --dry-run
```

如果显示 "Congratulations, all renewals succeeded"，说明配置成功。

---

## 7. 部署验证

### 7.1 检查服务状态

```bash
# 检查 Nginx
sudo systemctl status nginx

# 检查 Nginx 配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 查看访问日志
sudo tail -f /var/log/nginx/access.log
```

### 7.2 功能测试清单

- [ ] 访问 `http://your-domain.com` 能打开网站
- [ ] 访问 `https://your-domain.com` 显示安全锁
- [ ] HTTP 自动跳转到 HTTPS
- [ ] 流程图编辑器正常加载
- [ ] 可以创建和编辑流程图
- [ ] 代码生成功能正常
- [ ] 导出功能可用
- [ ] 刷新页面不报错（单页应用路由正常）

### 7.3 性能检查

在浏览器按 `F12` 打开开发者工具：

1. **Network 标签**：
   - 刷新页面
   - 检查资源加载时间
   - 确认没有 404 错误

2. **Console 标签**：
   - 检查是否有红色错误信息
   - 确认没有 JavaScript 报错

3. **Lighthouse（Chrome）**：
   - 点击右上角菜单 → 更多工具 → Lighthouse
   - 生成报告，查看性能评分

---

## 8. 常见问题

### Q1: 浏览器显示 "无法访问此网站"

**可能原因：**
1. 服务器未启动
2. 端口未开放
3. Nginx 配置错误

**排查步骤：**

```bash
# 1. 检查 Nginx 是否运行
sudo systemctl status nginx

# 2. 如果没有运行，启动它
sudo systemctl start nginx

# 3. 检查端口监听
sudo netstat -tlnp | grep :80

# 4. 检查防火墙
sudo ufw status

# 5. 如果防火墙开启，允许80和443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Q2: 显示 403 Forbidden

**原因：** 文件权限问题

**解决：**

```bash
# 设置正确的权限
sudo chown -R www-data:www-data /var/www/flowcode/dist/web
sudo chmod -R 755 /var/www/flowcode/dist/web

# 重启 Nginx
sudo systemctl reload nginx
```

### Q3: 刷新页面显示 404

**原因：** Nginx 没有配置单页应用路由

**解决：**

确保 nginx.conf 中有：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Q4: HTTPS 证书错误

**原因：** 证书未正确配置或过期

**解决：**

```bash
# 重新申请证书
sudo certbot --nginx -d your-domain.com

# 强制续期
sudo certbot renew --force-renewal
```

### Q5: 网站打开很慢

**优化建议：**
1. 启用 Gzip 压缩（已在 nginx.conf 配置）
2. 使用 CDN 加速（如阿里云CDN、Cloudflare）
3. 升级服务器带宽
4. 优化图片大小

### Q6: 如何更新网站？

**更新步骤：**

```bash
cd /var/www/flowcode

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
pnpm install

# 重新构建
pnpm build

# 重启 Nginx（可选）
sudo systemctl reload nginx
```

---

## 附录

### 常用命令速查表

```bash
# 服务管理
sudo systemctl start nginx      # 启动 Nginx
sudo systemctl stop nginx       # 停止 Nginx
sudo systemctl restart nginx    # 重启 Nginx
sudo systemctl reload nginx     # 重载配置
sudo systemctl status nginx     # 查看状态

# 文件操作
ls -la                          # 列出文件
cd /var/www/flowcode            # 切换目录
rm -rf foldername               # 删除文件夹
chmod 755 file                  # 修改权限
chown user:group file           # 修改所有者

# 网络
ping your-domain.com            # 测试连通性
curl -I http://localhost        # 测试HTTP
netstat -tlnp                   # 查看端口

# 日志查看
tail -f /var/log/nginx/error.log    # 实时查看错误日志
tail -n 100 /var/log/nginx/access.log   # 查看最近100行访问日志
```

### 重要文件位置

| 文件/目录 | 路径 | 说明 |
|-----------|------|------|
| 网站根目录 | `/var/www/flowcode/dist/web` | 网站文件存放位置 |
| Nginx 配置 | `/etc/nginx/sites-available/flowcode` | 站点配置 |
| Nginx 主配置 | `/etc/nginx/nginx.conf` | 全局配置 |
| 错误日志 | `/var/log/nginx/error.log` | 错误信息 |
| 访问日志 | `/var/log/nginx/access.log` | 访问记录 |
| SSL 证书 | `/etc/letsencrypt/live/` | 证书文件 |

### 安全建议

1. **定期更新系统**：
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **设置防火墙**：
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   ```

3. **定期备份**：
   - 备份代码到 GitHub
   - 备份数据库（如果有）
   - 备份配置文件

4. **监控服务**：
   - 使用阿里云监控
   - 或安装 [Uptime Kuma](https://github.com/louislam/uptime-kuma) 自助监控

---

## 总结

恭喜你！如果按照本指南操作，现在你应该已经：

✅ 拥有一台配置好的云服务器  
✅ 购买并配置好了域名  
✅ 成功部署了 FlowCode Platform  
✅ 启用了 HTTPS 加密  
✅ 网站可以正常访问

如果在部署过程中遇到问题，可以：
1. 查看错误日志定位问题
2. 搜索错误信息查找解决方案
3. 在 GitHub 提交 Issue 寻求帮助

**祝你部署顺利！** 🎉

---

## 9. 局域网部署指南

### 9.1 局域网 vs 公网部署的区别

| 对比项 | 公网部署 | 局域网部署 |
|--------|----------|------------|
| **访问范围** | 全球互联网用户 | 仅限内网用户（机房/公司/学校内部） |
| **服务器位置** | 云服务商（阿里云/腾讯云等） | 本地机房/公司服务器 |
| **域名** | 需要购买（如 .com/.cn） | 不需要购买公网域名 |
| **HTTPS证书** | 需要（Let's Encrypt免费） | 不需要，或使用自签名证书 |
| **备案** | 国内服务器需要 | 不需要 |
| **网络要求** | 需要公网IP | 只需要内网IP |
| **安全性** | 面临互联网攻击风险 | 相对安全，仅限内网访问 |
| **成本** | 服务器租金 + 域名费用 | 仅需服务器硬件/电费 |

**简单理解：**
- **公网部署** = 把网站放在"大街上"，谁都能访问
- **局域网部署** = 把网站放在"公司内部"，只有公司员工能访问

### 9.2 机房服务器准备

#### 你需要什么？

1. **一台物理服务器** 或 **虚拟机**
   - 可以是旧电脑、工控机、服务器主机
   - 配置建议：2核CPU / 4GB内存 / 50GB硬盘
   - 系统：Ubuntu 22.04 LTS（推荐）

2. **网络环境**
   - 服务器需要接入机房网络
   - 获取内网IP地址（如 `192.168.1.100`）
   - 确保和其他设备在同一网段

3. **无需购买**
   - ❌ 不需要购买云服务器
   - ❌ 不需要购买域名
   - ❌ 不需要备案
   - ❌ 不需要HTTPS证书（可选）

#### 获取服务器信息

联系机房管理员获取：
- **内网IP地址**：如 `192.168.1.100`
- **用户名**：通常是 `root` 或管理员分配的账号
- **密码**：服务器登录密码
- **SSH端口**：通常是 `22`（可能已被修改）

### 9.3 内网域名配置（可选）

#### 方案一：直接使用IP访问（最简单）

用户直接在浏览器输入：
```
http://192.168.1.100
```

**优点：**
- 无需任何额外配置
- 立即生效

**缺点：**
- IP地址难记
- 如果IP变了需要重新告知所有人

#### 方案二：配置内网DNS（推荐）

让管理员在机房DNS服务器上添加记录：

| 域名 | 类型 | 指向 |
|------|------|------|
| flowcode.local | A记录 | 192.168.1.100 |
| flow | CNAME | flowcode.local |

然后用户可以通过以下地址访问：
```
http://flowcode.local
http://flow
```

**如何配置（需要管理员权限）：**

如果是Windows Server DNS：
1. 打开"DNS管理器"
2. 右键正向查找区域 → 新建区域
3. 创建主区域，命名为 `local`
4. 在 `local` 区域新建A记录：
   - 名称：`flowcode`
   - IP地址：`192.168.1.100`

如果是路由器DNS（如OpenWrt）：
1. 登录路由器管理界面
2. 找到"DHCP/DNS"设置
3. 在"主机名"中添加：
   - 主机名：`flowcode`
   - IP地址：`192.168.1.100`

#### 方案三：修改每台电脑的 hosts 文件

如果无法修改DNS，可以在每台访问的电脑上配置：

**Windows 电脑：**
1. 打开文件：`C:\Windows\System32\drivers\etc\hosts`
2. 用记事本编辑（需要管理员权限）
3. 添加一行：
   ```
   192.168.1.100  flowcode.local
   ```
4. 保存文件
5. 打开CMD执行：`ipconfig /flushdns`

**Mac/Linux 电脑：**
```bash
sudo echo "192.168.1.100  flowcode.local" >> /etc/hosts
```

### 9.4 局域网部署步骤

局域网部署和公网部署的步骤**基本相同**，区别如下：

#### 步骤1：连接服务器

```bash
# 使用内网IP连接
ssh root@192.168.1.100

# 如果端口被修改（如改为2222）
ssh -p 2222 root@192.168.1.100
```

#### 步骤2：无需开放安全组端口

因为是内网，不需要在云控制台开放端口。

但可能需要：
- 关闭服务器防火墙，或开放80端口：
```bash
# 查看防火墙状态
sudo ufw status

# 如果开启，允许80端口
sudo ufw allow 80/tcp

# 或者关闭防火墙（内网相对安全）
sudo ufw disable
```

#### 步骤3：安装环境（与公网相同）

按照第3节"环境安装"执行：
```bash
sudo apt update
sudo apt install -y nginx nodejs npm
npm install -g pnpm
```

#### 步骤4：部署项目（与公网相同）

```bash
cd /var/www/flowcode
pnpm install
pnpm build
```

#### 步骤5：配置Nginx（简化版）

创建简化版Nginx配置（无需HTTPS）：

```bash
sudo nano /etc/nginx/sites-available/flowcode
```

添加内容：
```nginx
server {
    listen 80;
    server_name 192.168.1.100 flowcode.local flow;
    
    root /var/www/flowcode/dist/web;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/javascript;
}
```

**注意：**
- `server_name` 可以是IP地址或内网域名
- 不需要SSL证书配置
- 不需要HTTP重定向到HTTPS

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/flowcode /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.5 内网访问方式

部署完成后，用户可以通过以下方式访问：

| 方式 | 地址 | 说明 |
|------|------|------|
| IP直接访问 | `http://192.168.1.100` | 最简单，但IP难记 |
| 内网域名 | `http://flowcode.local` | 需要DNS或hosts配置 |
| 短域名 | `http://flow` | 需要DNS配置 |

#### 如何告知用户

可以发一封邮件或在内部群公告：

```
📢 FlowCode平台已部署完成！

访问地址：http://192.168.1.100
或：http://flowcode.local（如已配置DNS）

使用说明：
1. 确保连接公司内网/WiFi
2. 在浏览器输入上述地址
3. 开始创建流程图！

技术支持：联系IT部门
```

### 9.6 局域网部署常见问题

#### Q1: 其他电脑无法访问

**排查步骤：**

```bash
# 1. 在服务器上检查Nginx是否运行
curl http://localhost
# 应该能看到网站内容

# 2. 检查防火墙
sudo ufw status
# 如果active，需要允许80端口

# 3. 检查网络连通性
# 在其他电脑上ping服务器
ping 192.168.1.100

# 4. 检查端口监听
sudo netstat -tlnp | grep :80
# 应该显示 *:80
```

#### Q2: 如何限制特定人员访问？

**方法一：IP白名单（Nginx配置）**

```nginx
server {
    listen 80;
    
    # 只允许特定IP段访问
    allow 192.168.1.0/24;  # 允许192.168.1.x网段
    deny all;              # 拒绝其他所有
    
    # ...其他配置
}
```

**方法二：添加登录认证**

```bash
# 创建密码文件
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
# 输入密码
```

Nginx配置：
```nginx
server {
    listen 80;
    
    auth_basic "FlowCode Login";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    # ...其他配置
}
```

#### Q3: 服务器IP变了怎么办？

**方案一：设置静态IP**

编辑网络配置：
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

添加内容：
```yaml
network:
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [192.168.1.1, 8.8.8.8]
  version: 2
```

应用配置：
```bash
sudo netplan apply
```

**方案二：使用DHCP保留**

联系网络管理员，在路由器/DHCP服务器上将服务器MAC地址与IP绑定。

#### Q4: 如何让外网也能访问？（内网穿透）

如果后期需要让外网访问，可以考虑：

**方案一：申请公网IP**
- 联系网络运营商申请固定公网IP
- 在路由器上做端口映射

**方案二：使用内网穿透工具**
- [frp](https://github.com/fatedier/frp)（免费开源）
- [ngrok](https://ngrok.com/)（有免费版）
- [花生壳](https://hsk.oray.com/)（国内服务）

**方案三：迁移到云服务器**
- 按照本文档第1-8节进行公网部署

---

## 部署方案选择建议

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| 仅供公司内部使用 | 局域网部署 | 成本低、安全性高、无需备案 |
| 需要外网访问 | 公网部署 | 全球可访问、专业形象 |
| 预算有限 | 局域网部署 | 无需购买云服务器和域名 |
| 快速原型测试 | 局域网部署 | 部署快、配置简单 |
| 正式商业项目 | 公网部署 | 专业、可扩展、有HTTPS |

**总结：**
- **局域网部署**更简单、成本更低，适合内部使用
- **公网部署**更专业、可全球访问，适合对外服务

根据你的实际需求选择合适的方案即可！
