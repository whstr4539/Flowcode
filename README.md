# FlowCode Platform

A powerful visual flowchart editor with code generation capabilities, built with Next.js 16, React Flow, and shadcn/ui. Supports both web deployment and desktop application packaging.

## Features

- **Visual Flowchart Editor**: Intuitive drag-and-drop interface for creating flowcharts
- **Code Generation**: Automatically converts flowcharts to Python code
- **Python Execution**: Integrated Python code execution environment
- **Export Options**: Export flowcharts as JSON or PNG images
- **Dual Deployment**: Deploy as web application or package as Windows desktop app
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Type Safety**: Full TypeScript support throughout the codebase

## Tech Stack

- **Framework**: [Next.js 16.1.1](https://nextjs.org/) (App Router)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
- **Flowchart Engine**: [React Flow](https://reactflow.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Code Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Forms**: React Hook Form + Zod validation
- **Icons**: [Lucide React](https://lucide.dev/)
- **Desktop App**: [Electron](https://www.electronjs.org/) + electron-builder
- **Package Manager**: [pnpm](https://pnpm.io/) 9+

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- pnpm 9.x or higher
- Python 3.x (for code execution feature, optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/flowcode.git
cd flowcode

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run TypeScript check
pnpm ts-check

# Run ESLint
pnpm lint
```

### Desktop App Development

```bash
# Development mode (starts both Next.js and Electron)
pnpm electron:dev

# Build Windows installer
pnpm electron:build:win

# Build portable version
pnpm electron:build:portable

# Build all platforms
pnpm electron:build
```

## Project Structure

```
flowcode/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── CodeEditor.tsx    # Code editor component
│   │   ├── FlowchartEditor.tsx # Flowchart editor
│   │   └── FlowCodePlatform.tsx # Main platform component
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   │   ├── flowToPython.ts   # Flowchart to Python converter
│   │   ├── utils.ts          # General utilities
│   │   └── validateFlowchart.ts # Flowchart validation
│   └── types/                # TypeScript type definitions
├── electron/                 # Electron main process files
│   ├── main.js              # Main process entry
│   └── preload.js           # Preload script
├── scripts/                  # Build scripts
│   └── fix-paths.js         # Fix static paths for export
├── public/                   # Static assets
├── dist/                     # Build output
├── next.config.ts           # Next.js configuration
├── nginx.conf               # Nginx configuration template
├── DEPLOYMENT.md            # Deployment guide
└── README.md                # This file
```

## Deployment

### Web Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on:
- Server setup (Ubuntu/CentOS)
- Nginx configuration
- SSL/HTTPS setup with Let's Encrypt
- Performance optimization
- Troubleshooting

### Desktop App Packaging

The project uses Electron and electron-builder for desktop app packaging.

**Build Outputs:**
- `dist/Flowcode Setup 0.1.0.exe` - Windows installer
- `dist/Flowcode-Portable-0.1.0.exe` - Portable executable

## Security Notes

The Python code execution feature includes security restrictions:
- Blocks imports of `os`, `subprocess`, `shutil` modules
- Prevents use of `eval()`, `exec()`, `open()`
- 10-second execution timeout
- Runs in isolated temporary directory

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use **pnpm** exclusively (enforced by preinstall script)
- Follow the existing code style and conventions
- Use shadcn/ui components when available
- Maintain TypeScript type safety
- Write meaningful commit messages

## License

[MIT](LICENSE) - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [React Flow](https://reactflow.dev/) for the flowchart functionality
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Electron](https://www.electronjs.org/) for desktop app capabilities

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/your-repo/flowcode).

---

**Note**: This project uses pnpm as the package manager. Using npm or yarn will result in an error during installation.
