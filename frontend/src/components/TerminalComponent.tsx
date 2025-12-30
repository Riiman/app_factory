import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { getWebSocketUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
    startupId: string;
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({ startupId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { user, token } = useAuth();
    // Using a ref to track socket to avoid re-creation issues if we used state, though effect dependency handles it.
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalRef.current || !token) return;

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

        // Connect Native Socket
        const wsUrl = getWebSocketUrl('/ws/terminal');
        const socket = new WebSocket(`${wsUrl}?startup_id=${startupId}&token=${token}`);
        socketRef.current = socket;

        socket.onopen = () => {
            term.write('\r\n\x1b[32mConnected to Startup Environment\x1b[0m\r\n');
        };

        socket.onclose = () => {
            term.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n');
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.data) {
                    term.write(message.data);
                }
            } catch (e) {
                console.error("Terminal WS parse error:", e);
            }
        };

        socket.onerror = (e) => {
            console.error("Terminal WS Error:", e);
            term.write('\r\n\x1b[31mConnection Error\x1b[0m\r\n');
        };

        // Handle Input
        term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'input', data: data }));
            }
        });

        // Handle Resize
        const handleResize = () => {
            if (fitAddonRef.current && termRef.current) {
                requestAnimationFrame(() => {
                    try {
                        fitAddonRef.current?.fit();
                        if (socket.readyState === WebSocket.OPEN && termRef.current) {
                            socket.send(JSON.stringify({
                                type: 'resize',
                                cols: termRef.current.cols,
                                rows: termRef.current.rows
                            }));
                        }
                    } catch (e) {
                        console.log("Terminal fit error:", e);
                    }
                });
            }
        };
        window.addEventListener('resize', handleResize);

        // Initial fit
        setTimeout(() => {
            handleResize();
        }, 100);

        return () => {
            socket.close();
            if (termRef.current) {
                termRef.current.dispose();
                termRef.current = null;
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [startupId, user]); // Depend on user object

    return (
        <div className="h-full w-full bg-slate-900 p-2 overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default TerminalComponent;
