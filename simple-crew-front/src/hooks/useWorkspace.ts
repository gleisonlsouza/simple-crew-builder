import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Prism from 'prismjs';
import { useStore } from '../store/index';
import type { WorkspaceFile } from '../types/store.types';

export const useWorkspace = () => {
  const isExplorerOpen = useStore((state) => state.isExplorerOpen);
  const activeWsId = useStore((state) => state.activeWorkspaceId);
  const currentExplorerWsId = useStore((state) => state.currentExplorerWsId);
  const currentWsId = currentExplorerWsId || activeWsId;
  
  const setIsExplorerOpen = useStore((state) => state.setIsExplorerOpen);
  const fetchFiles = useStore((state) => state.fetchWorkspaceFiles);
  const fetchContent = useStore((state) => state.fetchFileContent);
  const downloadZip = useStore((state) => state.downloadWorkspaceZip);
  const uploadFiles = useStore((state) => state.uploadWorkspaceFiles);
  const deleteFile = useStore((state) => state.deleteWorkspaceFile);
  const workspaces = useStore((state) => state.workspaces);

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pathToExclude, setPathToExclude] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: WorkspaceFile } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const workspace = workspaces.find((w: any) => w.id === currentWsId);

  const loadFiles = async () => {
    if (!currentWsId) return;
    setIsLoading(true);
    const data = await fetchFiles(currentWsId);
    setFiles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (currentWsId) {
      loadFiles();
    }
  }, [currentWsId]);

  useEffect(() => {
    if (isExplorerOpen && currentWsId) {
      loadFiles();
      setSelectedPath(null);
      setContent(null);
    }
  }, [isExplorerOpen, currentWsId]);

  useEffect(() => {
    if (content) {
      Prism.highlightAll();
    }
  }, [content]);

  const handleFileSelect = async (path: string) => {
    if (!currentWsId) return;
    setSelectedPath(path);
    setIsContentLoading(true);
    const text = await fetchContent(currentWsId, path);
    setContent(text);
    setIsContentLoading(false);
  };

  const handleDownload = () => {
    if (!content || !selectedPath) return;
    const filename = selectedPath.split('/').pop() || 'file';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFile = async (path: string) => {
    if (!currentWsId) return;
    try {
      const text = await fetchContent(currentWsId, path);
      const filename = path.split('/').pop() || 'file';
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Failed to download file");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!currentWsId || !selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      await uploadFiles(currentWsId, selectedFiles);
      await loadFiles();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDelete = (path: string) => {
    setPathToExclude(path);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentWsId || !pathToExclude) return;

    try {
      await deleteFile(currentWsId, pathToExclude);
      if (selectedPath === pathToExclude) {
        setSelectedPath(null);
        setContent(null);
      }
      await loadFiles();
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setIsDeleteModalOpen(false);
      setPathToExclude(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: WorkspaceFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
    };
  }, []);

  const copyRelativePath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success('Path copied to clipboard');
  };

  const filterFiles = (fileList: WorkspaceFile[]): WorkspaceFile[] => {
    if (!searchTerm.trim()) return fileList;
    
    return fileList
      .map(file => {
        if (file.is_dir && file.children) {
          const filteredChildren = filterFiles(file.children);
          if (filteredChildren.length > 0) {
            return { ...file, children: filteredChildren };
          }
        }
        if (file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return file;
        }
        return null;
      })
      .filter((file): file is WorkspaceFile => file !== null);
  };

  const filteredDocs = filterFiles(files);

  return {
    isExplorerOpen,
    setIsExplorerOpen,
    currentWsId,
    workspace,
    files,
    selectedPath,
    content,
    isLoading,
    isContentLoading,
    isUploading,
    searchTerm,
    setSearchTerm,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    pathToExclude,
    contextMenu,
    fileInputRef,
    folderInputRef,
    loadFiles,
    handleFileSelect,
    handleDownload,
    downloadFile,
    handleUpload,
    handleDelete,
    handleContextMenu,
    confirmDelete,
    closeContextMenu,
    copyRelativePath,
    filteredDocs,
    downloadZip
  };
};
