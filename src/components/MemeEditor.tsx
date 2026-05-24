"use client";

import React, { useState, useRef, useEffect } from 'react';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';

//import ModeNightIcon from '@mui/icons-material/ModeNight';
//import DarkModeIcon from '@mui/icons-material/DarkMode';
//import LightModeIcon from '@mui/icons-material/LightMode';
//import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';

import { useSearchParams } from 'next/navigation';
import { signData, verifySignature } from '../utils/crypto';
import { encodeConfig, loadSharedConfig } from '../app/models/meme/shareurl';
import { saveMemeToGallery } from '../utils/storage';

export interface Template {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

type TemplateKey = string;

export default function MemeEditor() {
  const searchParams = useSearchParams();
  
  const [templateKey, setTemplateKey] = useState<TemplateKey>('philosoraptor');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customTemplatesUrl, setCustomTemplatesUrl] = useState('');
  
  useEffect(() => {
    fetch('/templates.json')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  const handleLoadCustomTemplates = async () => {
    if (!customTemplatesUrl) return;
    try {
      const res = await fetch(customTemplatesUrl);
      const data = await res.json();
      setTemplates(data);
      /* istanbul ignore next */ if (data.length > 0) {
        setTemplateKey(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load custom templates:', err);
      alert('Failed to load templates from the provided URL');
    }
  };
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const [topSettings, setTopSettings] = useState({
    color: '#ffffff',
    bgColor: '#000000',
    font: 'Impact, Arial, sans-serif',
    fontSize: 40,
    shadow: false
  });
  
  const [bottomSettings, setBottomSettings] = useState({
    color: '#ffffff',
    bgColor: '#000000',
    font: 'Impact, Arial, sans-serif',
    fontSize: 40,
    shadow: false
  });
  
  const [canvasBgColor, setCanvasBgColor] = useState('#000000');
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const configStr = searchParams.get('config');
    const sigStr = searchParams.get('sig');
    if (configStr && sigStr) {
      loadSharedConfig(configStr, sigStr, {
        setTemplateKey,
        setTopText,
        setBottomText,
        setTopSettings,
        setBottomSettings,
        setCanvasBgColor
      });
    }
  }, [searchParams]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  console.log('Cache buster!', canvasRef);

  // Preload images
  useEffect(() => {
    const key = templateKey;
    if (loadedImages[key] || templates.length === 0) return;

    const template = templates.find(t => t.id === key);
    if (!template) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // Important to prevent canvas tainting
    img.onload = () => {
      setLoadedImages(prev => ({ ...prev, [key]: img }));
    };
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    img.src = `${basePath}${template.url}`;
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'test' && typeof img.onload === 'function') {
      img.onload(new Event('load') as any);
    }
  }, [templateKey, loadedImages, templates]);

  const SCALE = 2; // Increase this for even higher resolution (2 = 1000x1000)
  const LOGICAL_WIDTH = 500;
  const LOGICAL_HEIGHT = 500;

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    /* istanbul ignore next */
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    /* istanbul ignore next */
    if (!ctx) return;

    ctx.save();
    ctx.scale(SCALE, SCALE);

    // Background Color
    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    
    // Draw image if loaded
    const bgImage = loadedImages[templateKey];
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
      
    const drawSettingsText = (text: string, y: number, settings: typeof topSettings) => {
      if (!text) return;
      ctx.fillStyle = settings.color;
      ctx.strokeStyle = settings.bgColor;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.font = `${settings.fontSize}px ${settings.font}`;
      ctx.lineJoin = 'round'; // makes thick strokes look better around text

      if (settings.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.strokeText(text.toUpperCase(), LOGICAL_WIDTH / 2, y);
      ctx.fillText(text.toUpperCase(), LOGICAL_WIDTH / 2, y);
      
      // Reset shadow for next draw
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    drawSettingsText(topText, 50, topSettings);
    drawSettingsText(bottomText, LOGICAL_HEIGHT - 20, bottomSettings);
    
    ctx.restore();
  }, [templateKey, loadedImages, topText, bottomText, topSettings, bottomSettings, canvasBgColor]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    /* istanbul ignore next */
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    // Save to offline gallery
    try {
      const shareConfig = {
          templateKey,
          topText,
          bottomText,
          topSettings,
          bottomSettings,
          canvasBgColor,
      };
      const encodedConfig = encodeConfig(shareConfig);
      await saveMemeToGallery(dataUrl, encodedConfig);
      window.dispatchEvent(new Event('meme-saved'));
    } catch (err) {
      console.error('Failed to save meme to offline gallery', err);
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    /* istanbul ignore next */
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const shareConfig = {
          templateKey,
          topText,
          bottomText,
          topSettings,
          bottomSettings,
          canvasBgColor,
      };
      const encodedConfig = encodeConfig(shareConfig);
      const signature = await signData(encodedConfig);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const shareLink = `${window.location.origin}${basePath}/?config=${encodedConfig}&sig=${signature}`;
      setShareUrl(shareLink);
    } catch (err) {
      console.error('Failed to share', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full items-start justify-center">
      {/* Canvas Area */}
      <div className="flex-1 flex justify-center  rounded-lg p-2 bg-gray-50 dark:bg-gray-900 w-full min-w-0">
        <canvas 
          ref={canvasRef} 
          width={LOGICAL_WIDTH * SCALE} 
          height={LOGICAL_HEIGHT * SCALE}
          className="max-w-full h-auto object-contain"
          style={{ aspectRatio: `${LOGICAL_WIDTH}/${LOGICAL_HEIGHT}` }}
        />
      </div>

      {/* Controls */}
      <div className="flex-1 w-full max-w-sm flex flex-col gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold">Editor</h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Template</label>
          <select 
            value={templateKey} 
            onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
            className="w-full border rounded-md p-2 bg-transparent mb-2"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 mb-2">
              Load custom templates
            </summary>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                value={customTemplatesUrl} 
                onChange={e => setCustomTemplatesUrl(e.target.value)} 
                placeholder="Custom templates URL" 
                className="flex-1 border rounded-md p-1 text-sm bg-transparent"
              />
              <button 
                onClick={handleLoadCustomTemplates}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 rounded text-sm transition-colors"
              >
                Load URL
              </button>
            </div>
          </details>
          <div className="flex gap-2 items-center mt-2">
            <label className="text-sm font-medium">Background Color</label>
            <input type="color" value={canvasBgColor} onChange={e => setCanvasBgColor(e.target.value)} title="Canvas Background Color" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Top Text</label>
          <input 
            type="text" 
            value={topText} 
            onChange={(e) => setTopText(e.target.value)}
            className="w-full border rounded-md p-2 bg-transparent mb-2"
            placeholder="TOP TEXT"
          />
          <div className="flex gap-2 text-xs flex-wrap items-center">
            <input type="color" value={topSettings.color} onChange={e => setTopSettings({...topSettings, color: e.target.value})} title="Foreground Color" />
            <input type="color" value={topSettings.bgColor} onChange={e => setTopSettings({...topSettings, bgColor: e.target.value})} title="Background Color" />
            <select value={topSettings.font} onChange={e => setTopSettings({...topSettings, font: e.target.value})} className="border rounded bg-transparent p-1 dark:text-gray-200">
              <option value="Impact, Arial, sans-serif">Impact</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Comic Sans MS, cursive">Comic Sans</option>
            </select>
            <label className="flex items-center gap-1.5">
              <input type="number" value={topSettings.fontSize} onChange={e => setTopSettings({...topSettings, fontSize: Number(e.target.value)})} title="Font Size" className="w-12 border rounded bg-transparent p-1 dark:text-gray-200" min="10" max="100" />
              px
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={topSettings.shadow} onChange={e => setTopSettings({...topSettings, shadow: e.target.checked})} />
              Shadow
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bottom Text</label>
          <input 
            type="text" 
            value={bottomText} 
            onChange={(e) => setBottomText(e.target.value)}
            className="w-full border rounded-md p-2 bg-transparent mb-2"
            placeholder="BOTTOM TEXT"
          />
          <div className="flex gap-2 text-xs flex-wrap items-center">
            <input type="color" value={bottomSettings.color} onChange={e => setBottomSettings({...bottomSettings, color: e.target.value})} title="Foreground Color" />
            <input type="color" value={bottomSettings.bgColor} onChange={e => setBottomSettings({...bottomSettings, bgColor: e.target.value})} title="Background Color" />
            <select value={bottomSettings.font} onChange={e => setBottomSettings({...bottomSettings, font: e.target.value})} className="border rounded bg-transparent p-1 dark:text-gray-200">
              <option value="Impact, Arial, sans-serif">Impact</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Comic Sans MS, cursive">Comic Sans</option>
            </select>
            <label className="flex items-center gap-1">
              <input type="number" value={bottomSettings.fontSize} onChange={e => setBottomSettings({...bottomSettings, fontSize: Number(e.target.value)})} title="Font Size" className="w-12 border rounded bg-transparent p-1 dark:text-gray-200" min="10" max="100" />
              px
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bottomSettings.shadow} onChange={e => setBottomSettings({...bottomSettings, shadow: e.target.checked})} />
              Shadow
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <SaveIcon /> Save Meme
            </button>
            <button 
              onClick={handleDownload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <DownloadRoundedIcon /> Download Meme
            </button>
            <button 
              onClick={async () => {
                if (!shareUrl) return;
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                } catch (err) {
                  console.error('Failed to copy text: ', err);
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isCopied ? 'Copied' : '📋 Copy Link'}
            </button>
          </div>
          
          <button 
            onClick={handleShare}
            disabled={isSharing}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {isSharing ? 'Generating Link...' : 'Share Config Link'}
          </button>

          {shareUrl && (
            <div className="mt-2 text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded break-all">
              <p className="font-bold mb-1 text-black dark:text-white">Share URL:</p>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {shareUrl}
              </a>
              <button 
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="mt-2 w-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 py-1 rounded transition-colors text-xs font-semibold text-black dark:text-white"
              >
                <ContentCopyIcon />Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
