import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

interface FileNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

interface FileExplorerProps {
    startupId: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ startupId }) => {
    const [currentPath, setCurrentPath] = useState('.');
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [contentLoading, setContentLoading] = useState(false);

    useEffect(() => {
        fetchFiles(currentPath);
    }, [currentPath, startupId]);

    const fetchFiles = async (path: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/builder/${startupId}/files?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.files) {
                // Sort: directories first, then files
                const sorted = data.files.sort((a: FileNode, b: FileNode) => {
                    if (a.type === b.type) return a.name.localeCompare(b.name);
                    return a.type === 'directory' ? -1 : 1;
                });
                setFiles(sorted);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchFileContent = async (path: string) => {
        setContentLoading(true);
        try {
            const res = await fetch(`/api/builder/${startupId}/files/content?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.content !== undefined) {
                setFileContent(data.content);
            }
        } catch (e) {
            console.error(e);
            setFileContent('Error loading file content.');
        } finally {
            setContentLoading(false);
        }
    };

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
        setSelectedFile(null);
        setFileContent('');
    };

    const handleUp = () => {
        if (currentPath === '.') return;
        const parts = currentPath.split('/');
        parts.pop();
        const newPath = parts.length === 0 ? '.' : parts.join('/');
        handleNavigate(newPath);
    };

    const handleFileClick = (file: FileNode) => {
        if (file.type === 'directory') {
            handleNavigate(file.path);
        } else {
            setSelectedFile(file);
            fetchFileContent(file.path);
        }
    };

    return (
        <div className="flex h-full bg-gray-900 text-gray-300 font-mono text-sm">
            {/* File List */}
            <div className={`flex-col border-r border-gray-800 ${selectedFile ? 'w-1/3 hidden md:flex' : 'w-full'} transition-all`}>
                <div className="h-10 bg-gray-800 flex items-center px-4 justify-between border-b border-gray-700">
                    <div className="flex items-center overflow-hidden">
                        <button
                            onClick={handleUp}
                            disabled={currentPath === '.'}
                            className="mr-2 hover:text-white disabled:opacity-30"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="truncate" title={currentPath}>{currentPath}</span>
                    </div>
                    <button onClick={() => fetchFiles(currentPath)} className="hover:text-white">
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                    ) : (
                        <div className="space-y-1">
                            {files.length === 0 && <div className="text-gray-500 text-center mt-4">Empty directory</div>}
                            {files.map((file) => (
                                <div
                                    key={file.path}
                                    onClick={() => handleFileClick(file)}
                                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-gray-800 ${selectedFile?.path === file.path ? 'bg-gray-800 text-white' : ''}`}
                                >
                                    {file.type === 'directory' ? (
                                        <Folder className="w-4 h-4 mr-2 text-blue-400" />
                                    ) : (
                                        <File className="w-4 h-4 mr-2 text-gray-400" />
                                    )}
                                    <span className="truncate">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* File Content */}
            {selectedFile && (
                <div className="flex-1 flex flex-col w-full md:w-2/3 bg-gray-950">
                    <div className="h-10 bg-gray-800 flex items-center px-4 border-b border-gray-700 justify-between">
                        <div className="flex items-center">
                            <button onClick={() => setSelectedFile(null)} className="md:hidden mr-2">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <File className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="truncate">{selectedFile.name}</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {contentLoading ? (
                            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
                        ) : (
                            <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{fileContent}</pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
