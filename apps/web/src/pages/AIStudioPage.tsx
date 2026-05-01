import { useEffect, useState } from 'react';
import { CanvasTool } from '@/components/ai/CanvasTool';
import { api } from '@/lib/api';

interface Design {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  templateNumber: string;
  width: number;
  height: number;
  backgroundColor: string;
  objects: string;
  thumbnail?: string;
  tags: string[];
  versions: Array<{
    version: number;
    canvasData: string;
    createdAt: string;
  }>;
  currentVersion: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AISketchAnalysis {
  detectedObjects: Array<{
    type: string;
    confidence: number;
    bounds: Record<string, number>;
  }>;
  suggestedImprovements: string[];
  estimatedComplexity: string;
  recommendedTemplates: string[];
  confidence: number;
}

export function AIStudioPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ thumbnail: string; designName: string } | null>(null);
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AISketchAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    try {
      const data = await api.getDesigns() as Design[];
      setDesigns(data);
    } catch (error) {
      console.error('Failed to load designs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewDesign = () => {
    setCurrentDesign(null);
    setDesignName('');
    setDesignDescription('');
  };

  const handleLoadDesign = (design: Design) => {
    setCurrentDesign(design);
    setDesignName(design.name);
    setDesignDescription(design.description || '');
  };

  const handleSaveDesign = async (canvasData: string) => {
    if (!designName.trim()) {
      alert('Please enter a design name');
      return;
    }

    setSaving(true);
    try {
      if (currentDesign) {
        // Update existing design
        await api.updateDesign(currentDesign._id, {
          name: designName,
          description: designDescription,
          objects: canvasData,
        });
      } else {
        // Create new design
        const newDesign = await api.createDesign({
          name: designName,
          description: designDescription,
          width: 800,
          height: 600,
          backgroundColor: '#ffffff',
          objects: canvasData,
          tags: [],
        }) as Design;
        setCurrentDesign(newDesign);
      }
      await loadDesigns();
      alert('Design saved successfully');
    } catch (error) {
      console.error('Failed to save design:', error);
      alert('Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await api.deleteDesign(designId);
      await loadDesigns();
      if (currentDesign?._id === designId) {
        setCurrentDesign(null);
        setDesignName('');
        setDesignDescription('');
      }
    } catch (error) {
      console.error('Failed to delete design:', error);
      alert('Failed to delete design');
    }
  };

  const handleExportPDF = () => {
    alert('PDF export coming soon');
  };

  const handlePreviewQuote = () => {
    if (!currentDesign) return;

    // Generate preview data for quoting
    const thumbnail = ''; // Would be generated from canvas
    setPreviewData({
      thumbnail,
      designName: currentDesign.name,
    });
    setShowPreview(true);
  };

  const handleAnalyzeSketch = async () => {
    setAnalyzing(true);
    try {
      // Mock AI analysis - in production this would send canvas image
      const result = await api.analyzeSketch({
        imageData: 'data:image/png;base64,...',
        prompt: 'Analyze this design for improvements',
      }) as AISketchAnalysis;
      setAiAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze sketch:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Left Sidebar - Design List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Designs</h2>
          <button
            onClick={handleNewDesign}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + New Design
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {designs.map(design => (
            <div
              key={design._id}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                currentDesign?._id === design._id ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleLoadDesign(design)}
            >
              <div className="font-medium text-sm truncate">{design.name}</div>
              <div className="text-xs text-gray-500">{design.templateNumber}</div>
              {design.thumbnail && (
                <div className="mt-2 h-12 bg-gray-100 rounded overflow-hidden">
                  <img
                    src={design.thumbnail}
                    alt={design.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDesign(design._id);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {designs.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No designs yet. Create your first design!
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={designName}
              onChange={e => setDesignName(e.target.value)}
              placeholder="Design Name"
              className="text-xl font-semibold border-b-2 border-transparent focus:border-blue-500 outline-none bg-transparent px-1"
            />
            <input
              type="text"
              value={designDescription}
              onChange={e => setDesignDescription(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 text-sm border-b-2 border-transparent focus:border-blue-500 outline-none bg-transparent px-1 text-gray-600"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAnalyzeSketch}
                disabled={analyzing}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {analyzing ? 'Analyzing...' : 'AI Analyze'}
              </button>
              <button
                onClick={handlePreviewQuote}
                disabled={!currentDesign}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                Preview Quote
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold mb-2">AI Analysis Results</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Complexity:</span> {aiAnalysis.estimatedComplexity}
                </div>
                <div>
                  <span className="font-medium">Confidence:</span> {(aiAnalysis.confidence * 100).toFixed(0)}%
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Detected Objects:</span>
                  <ul className="mt-1 list-disc list-inside">
                    {aiAnalysis.detectedObjects.map((obj, i) => (
                      <li key={i}>{obj.type} ({(obj.confidence * 100).toFixed(0)}% confidence)</li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Suggested Improvements:</span>
                  <ul className="mt-1 list-disc list-inside">
                    {aiAnalysis.suggestedImprovements.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <CanvasTool
            onSave={handleSaveDesign}
            initialData={currentDesign?.objects}
            width={800}
            height={600}
          />
        </div>
      </div>

      {/* Right Sidebar - Preview */}
      {showPreview && previewData && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Quote Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="aspect-square bg-white rounded mb-4 flex items-center justify-center">
              {previewData.thumbnail ? (
                <img src={previewData.thumbnail} alt="Design preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-gray-400">No preview</span>
              )}
            </div>
            <div className="text-sm">
              <div className="font-medium">{previewData.designName}</div>
              <div className="text-gray-500">Standard Design</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Design Size:</span>
              <span>800 x 600</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Complexity:</span>
              <span>{aiAnalysis?.estimatedComplexity || 'Standard'}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Estimated Price:</span>
              <span>Contact for quote</span>
            </div>
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Request Quote
          </button>
        </div>
      )}
    </div>
  );
}