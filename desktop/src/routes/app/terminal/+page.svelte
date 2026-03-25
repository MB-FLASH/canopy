<!-- src/routes/app/terminal/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PageShell from '$lib/components/layout/PageShell.svelte';

  let terminalEl: HTMLDivElement;
  let terminal: import('@xterm/xterm').Terminal | null = null;
  let socket: WebSocket | null = null;
  let channel: any = null;
  let connected = $state(false);
  let error = $state('');

  onMount(async () => {
    // Import xterm CSS
    await import('@xterm/xterm/css/xterm.css');

    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      theme: {
        background: '#0d0d0d',
        foreground: '#e2e8f0',
        cursor: '#93c5fd',
        selectionBackground: 'rgba(147, 197, 253, 0.2)',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalEl);
    fitAddon.fit();

    // Resize observer
    const observer = new ResizeObserver(() => fitAddon.fit());
    observer.observe(terminalEl);

    // Connect to Phoenix channel
    const token = localStorage.getItem('canopy-auth-token');
    if (!token) {
      terminal.writeln('\r\n\x1b[31mError: Not authenticated. Please log in.\x1b[0m');
      return;
    }

    const wsBase = import.meta.env.VITE_API_URL?.replace('https://', 'wss://').replace('http://', 'ws://') ?? 'wss://main.operiq.net';

    try {
      const { Socket } = await import('phoenix');
      const phxSocket = new Socket(`${wsBase}/socket`, { params: { token } });
      phxSocket.connect();

      const ch = phxSocket.channel('terminal:shell', { token });

      ch.on('output', ({ data }: { data: string }) => {
        terminal?.write(data);
      });

      ch.join()
        .receive('ok', () => {
          connected = true;
          error = '';
          terminal?.writeln('\x1b[32mConnected to server shell\x1b[0m\r\n');
          ch.push('start', {});
        })
        .receive('error', (resp: any) => {
          error = resp?.reason || 'Connection failed';
          terminal?.writeln(`\r\n\x1b[31mFailed to connect: ${error}\x1b[0m`);
        });

      terminal.onData((data) => {
        ch.push('input', { data });
      });

      channel = ch;
    } catch (e) {
      error = String(e);
      terminal?.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m`);
    }

    return () => observer.disconnect();
  });

  onDestroy(() => {
    channel?.leave();
    terminal?.dispose();
  });
</script>

<PageShell title="Terminal" subtitle="Server shell" noPadding={true}>
  <div class="trm-root">
    {#if error}
      <div class="trm-error">{error}</div>
    {/if}
    <div class="trm-container" bind:this={terminalEl}></div>
  </div>
</PageShell>

<style>
  :global(body) { overflow: hidden; }
  .trm-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 56px);
    background: #0d0d0d;
  }
  .trm-error {
    padding: 8px 16px;
    background: rgba(239, 68, 68, 0.15);
    border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    font-size: 12px;
    flex-shrink: 0;
  }
  .trm-container {
    flex: 1;
    padding: 8px 12px;
    min-height: 0;
  }
  .trm-container :global(.xterm) {
    height: 100%;
    width: 100%;
  }
  .trm-container :global(.xterm-screen) {
    width: 100% !important;
  }
</style>
