import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
    startupId: string;
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({ startupId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize Terminal
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#0f172a', // slate-900
                foreground: '#e2e8f0', // slate-200
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect Socket
        // Assuming backend is at the same host or proxied correctly. 
        // If dev server is on 3000 and backend on 5000, we might need full URL.
        // Trying relative path first, assuming proxy. If fails, we might need env var.
        const socket = io('http://localhost:5000/terminal', {
            transports: ['websocket'],
            path: '/socket.io'
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            term.write('\r\n\x1b[32mConnected to Startup Environment\x1b[0m\r\n');
            socket.emit('start_terminal', { startup_id: startupId });
        });

        socket.on('disconnect', () => {
            term.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n');
        });

        socket.on('output', (data: { data: string }) => {
            term.write(data.data);
        });

        // Handle Input
        // Handle Input - Forward raw data to PTY
        term.onData((data) => {
            socket.emit('input', { startup_id: startupId, data: data });
        });

        // Handle Resize
        const handleResize = () => {
            if (fitAddonRef.current && termRef.current) {
                // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
                // and ensure the DOM is ready.
                requestAnimationFrame(() => {
                    try {
                        fitAddonRef.current?.fit();
                        // Emit resize event to backend if socket is connected
                        if (socketRef.current && termRef.current) {
                            socketRef.current.emit('resize', {
                                cols: termRef.current.cols,
                                rows: termRef.current.rows
                            });
                        }
                    } catch (e) {
                        // Ignore resize errors if terminal is hidden or not yet rendered
                        console.log("Terminal fit error (likely hidden or not ready):", e);
                    }
                });
            }
        };
        window.addEventListener('resize', handleResize);

        // Initial fit after a short delay to ensure container is rendered
        setTimeout(() => {
            handleResize();
        }, 100);

        return () => {
            socket.disconnect();
            if (termRef.current) {
                termRef.current.dispose();
                termRef.current = null;
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [startupId]);

    return (
        <div className="h-full w-full bg-slate-900 p-2 overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default TerminalComponent;
