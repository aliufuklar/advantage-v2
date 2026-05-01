import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Circle, Textbox, Line, FabricObject, PencilBrush } from 'fabric';

interface Tool {
  id: string;
  name: string;
  icon: string;
}

const TOOLS: Tool[] = [
  { id: 'select', name: 'Select', icon: '↖' },
  { id: 'rect', name: 'Rectangle', icon: '▢' },
  { id: 'circle', name: 'Circle', icon: '○' },
  { id: 'line', name: 'Line', icon: '/' },
  { id: 'text', name: 'Text', icon: 'T' },
  { id: 'pencil', name: 'Draw', icon: '✏' },
];

interface CanvasToolProps {
  onSave?: (canvasData: string) => void;
  initialData?: string;
  width?: number;
  height?: number;
}

export function CanvasTool({ onSave, initialData, width = 800, height = 600 }: CanvasToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Colors for picker
  const colors = [
    '#000000', '#ffffff', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  ];

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    // Enable free drawing mode
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = selectedColor;

    fabricRef.current = canvas;

    // Load initial data if provided
    if (initialData) {
      try {
        const objects = JSON.parse(initialData);
        canvas.loadFromJSON({ objects }, () => {
          canvas.renderAll();
        });
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    }

    // Save initial state
    saveToHistory();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [canvasRef]);

  // Update free drawing color
  useEffect(() => {
    if (fabricRef.current && fabricRef.current.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.color = selectedColor;
    }
  }, [selectedColor]);

  // Handle tool changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset selection mode
    canvas.selection = true;
    canvas.defaultCursor = 'default';

    switch (selectedTool) {
      case 'select':
        // Default selection mode
        break;
      case 'rect':
        canvas.defaultCursor = 'crosshair';
        setupShapeTool('rect');
        break;
      case 'circle':
        canvas.defaultCursor = 'crosshair';
        setupShapeTool('circle');
        break;
      case 'line':
        canvas.defaultCursor = 'crosshair';
        setupShapeTool('line');
        break;
      case 'text':
        canvas.defaultCursor = 'text';
        setupTextTool();
        break;
      case 'pencil':
        canvas.isDrawingMode = true;
        break;
      default:
        canvas.isDrawingMode = false;
    }

    return () => {
      canvas.off('mouse:down');
    };
  }, [selectedTool]);

  const setupShapeTool = (type: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    let startX = 0, startY = 0;
    let tempShape: FabricObject | null = null;

    canvas.on('mouse:down', (opt) => {
      const pointer = canvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (type === 'rect') {
        tempShape = new Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: selectedColor,
          stroke: '#000',
          strokeWidth: 1,
        });
      } else if (type === 'circle') {
        tempShape = new Circle({
          left: startX,
          top: startY,
          radius: 0,
          fill: selectedColor,
          stroke: '#000',
          strokeWidth: 1,
        });
      } else if (type === 'line') {
        tempShape = new Line([startX, startY, startX, startY], {
          stroke: selectedColor,
          strokeWidth: 2,
        });
      }

      if (tempShape) {
        canvas.add(tempShape);
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!tempShape) return;
      const pointer = canvas.getPointer(opt.e);

      if (type === 'rect') {
        const width = pointer.x - startX;
        const height = pointer.y - startY;
        tempShape.set({
          left: width > 0 ? startX : pointer.x,
          top: height > 0 ? startY : pointer.y,
          width: Math.abs(width),
          height: Math.abs(height),
        });
      } else if (type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
        );
        tempShape.set({
          left: startX - radius,
          top: startY - radius,
          radius,
        });
      } else if (type === 'line') {
        (tempShape as Line).set({ x2: pointer.x, y2: pointer.y });
      }

      canvas.renderAll();
    });

    canvas.on('mouse:up', () => {
      if (tempShape) {
        saveToHistory();
      }
      tempShape = null;
    });
  };

  const setupTextTool = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;

    canvas.on('mouse:down', (opt) => {
      const pointer = canvas.getPointer(opt.e);
      const textbox = new Textbox('Text', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 16,
        fill: selectedColor,
        fontFamily: 'Arial',
      });
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      textbox.enterEditing();
      saveToHistory();
    });
  };

  const saveToHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => [...prev.slice(0, historyIndex + 1), json]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0 || !fabricRef.current) return;

    const newIndex = historyIndex - 1;
    const json = history[newIndex];
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current?.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !fabricRef.current) return;

    const newIndex = historyIndex + 1;
    const json = history[newIndex];
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current?.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Delete selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          saveToHistory();
        }
      }

      // Undo (Ctrl+Z)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y)
      if ((e.key === 'z' && e.shiftKey) || (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        redo();
      }

      // Save (Ctrl+S)
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveToHistory]);

  const handleSave = () => {
    const canvas = fabricRef.current;
    if (!canvas || !onSave) return;

    const json = JSON.stringify(canvas.toJSON());
    onSave(json);
  };

  const handleZoomIn = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const newZoom = Math.min(zoom * 1.2, 5);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const newZoom = Math.max(zoom / 1.2, 0.2);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.setZoom(1);
    setZoom(1);
  };

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (confirm('Clear canvas?')) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      saveToHistory();
    }
  };

  const handleExportPNG = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement('a');
    link.download = 'design.png';
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-100 border-b border-gray-300">
        {/* Tools */}
        <div className="flex gap-1">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`w-8 h-8 flex items-center justify-center rounded text-lg ${
                selectedTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-gray-200'
              }`}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Colors */}
        <div className="flex gap-1">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded border-2 ${
                selectedColor === color ? 'border-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
            className="w-6 h-6 cursor-pointer"
          />
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded disabled:opacity-50"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded"
            title="Clear"
          >
            🗑
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded"
          >
            -
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded"
          >
            +
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-1 bg-white hover:bg-gray-200 rounded text-xs"
          >
            Reset
          </button>
        </div>

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={handleExportPNG}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Export PNG
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        <div className="shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}