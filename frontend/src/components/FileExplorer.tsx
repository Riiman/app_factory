import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

interface FileNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

interface FileExplorerProps {
    startupId: string;
    refreshKey?: number;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ startupId, refreshKey }) => {
    const [currentPath, setCurrentPath] = useState('.');
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [contentLoading, setContentLoading] = useState(false);

    useEffect(() => {
        fetchFiles(currentPath);
    }, [currentPath, startupId, refreshKey]);

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
            {/* File Node List - Always Full Width */}
            <div className="flex-col w-full h-full border-r border-gray-800 transition-all">
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

            {/* File Content Modal */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
                    <div className="bg-gray-900 w-full max-w-5xl h-full md:h-[90vh] rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="h-12 bg-gray-800 flex items-center px-4 border-b border-gray-700 justify-between shrink-0">
                            <div className="flex items-center gap-2 text-gray-200">
                                <File className="w-5 h-5 text-blue-400" />
                                <span className="font-semibold">{selectedFile.name}</span>
                                <span className="text-xs text-gray-500 ml-2 font-mono">{selectedFile.path}</span>
                            </div>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="p-1 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-auto p-4 bg-gray-950 custom-scrollbar">
                            {contentLoading ? (
                                <div className="flex justify-center items-center h-full text-blue-400 gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span>Loading content...</span>
                                </div>
                            ) : (
                                <div className="text-sm font-mono text-gray-300">
                                    { /* Check if it's an image based on extension */}
                                    {selectedFile.name.match(/\.(png|jpg|jpeg|gif|svg)$/i) ? (
                                        <div className="flex justify-center p-10">
                                            <img
                                                src={`/api/builder/${startupId}/file?path=${encodeURIComponent(selectedFile.path)}`}
                                                alt={selectedFile.name}
                                                className="max-w-full rounded border border-gray-800 shadow-lg"
                                            />
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap leading-relaxed">{fileContent}</pre>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer (Optional) */}
                        <div className="bg-gray-800 h-8 flex items-center justify-end px-4 text-xs text-gray-500 border-t border-gray-700">
                            {fileContent.length} bytes
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
