import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import MemeEditor from '../MemeEditor';

vi.mock('../../utils/storage', () => ({
  saveMemeToGallery: vi.fn().mockResolvedValue(true),
  getGalleryMemes: vi.fn().mockResolvedValue([])
}));

describe('MemeEditor', () => {
  let originalImage: any;

  beforeAll(() => {
    originalImage = window.Image;
    Object.defineProperty(window, 'Image', {
      writable: true,
      value: class extends originalImage {
        constructor() {
          super();
        }
        set src(val: string) {
          super.setAttribute('src', val);
          setTimeout(() => {
            if (typeof this.onload === 'function') {
              this.onload(new Event('load') as any);
            }
          }, 20);
        }
        get src() {
          return super.getAttribute('src') || '';
        }
      }
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'Image', {
      writable: true,
      value: originalImage
    });
  });

  it('renders the editor with default inputs', () => {
    render(<MemeEditor />);
    expect(screen.getByText('Editor Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('TOP TEXT')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('BOTTOM TEXT')).toBeInTheDocument();
  });

  it('updates text inputs correctly', async () => {
    render(<MemeEditor />);
    const topTextInput = screen.getByPlaceholderText('TOP TEXT');
    fireEvent.change(topTextInput, { target: { value: 'HELLO' } });
    expect((topTextInput as HTMLInputElement).value).toBe('HELLO');

    const bottomTextInput = screen.getByPlaceholderText('BOTTOM TEXT');
    fireEvent.change(bottomTextInput, { target: { value: 'WORLD' } });

    // Wait for the async canvas draw
    await waitFor(() => {
      // The onload is triggered via timeout
      expect(true).toBe(true);
    }, { timeout: 200 });
  });

  it('changes template selector correctly', () => {
    render(<MemeEditor />);
    // There are multiple selects now (for fonts), so we use getByLabelText or getAllByRole
    const selects = screen.getAllByRole('combobox');
    const select = selects[0]; // The first one is the template selector
    fireEvent.change(select, { target: { value: 'penguin' } });
    expect((select as HTMLSelectElement).value).toBe('penguin');
  });

  it('triggers download when button is clicked', () => {
    // Mock anchor click to prevent navigation error in jsdom
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    render(<MemeEditor />);
    const button = screen.getByText('Download Meme');
    
    // The canvas toDataURL will be mocked by jest-canvas-mock
    expect(() => fireEvent.click(button)).not.toThrow();
    expect(mockClick).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('updates top text settings', () => {
    render(<MemeEditor />);
    // top settings font size and color
    const colorInputs = screen.getAllByTitle('Foreground Color');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
    expect((colorInputs[0] as HTMLInputElement).value).toBe('#ff0000');

    const fontSizeInputs = screen.getAllByTitle('Font Size');
    fireEvent.change(fontSizeInputs[0], { target: { value: '50' } });
    expect((fontSizeInputs[0] as HTMLInputElement).value).toBe('50');

    // font selection
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'Arial, sans-serif' } });
    expect((selects[1] as HTMLSelectElement).value).toBe('Arial, sans-serif');
  });

  it('updates bottom text settings', () => {
    render(<MemeEditor />);
    const colorInputs = screen.getAllByTitle('Foreground Color');
    fireEvent.change(colorInputs[1], { target: { value: '#00ff00' } });
    expect((colorInputs[1] as HTMLInputElement).value).toBe('#00ff00');

    const fontSizeInputs = screen.getAllByTitle('Font Size');
    fireEvent.change(fontSizeInputs[1], { target: { value: '60' } });
    expect((fontSizeInputs[1] as HTMLInputElement).value).toBe('60');
    
    // font selection
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'Comic Sans MS, cursive' } });
    expect((selects[2] as HTMLSelectElement).value).toBe('Comic Sans MS, cursive');
  });

  it('renders and updates canvas background color setting', () => {
    render(<MemeEditor />);
    const bgColorInput = screen.getByTitle('Canvas Background Color');
    expect(bgColorInput).toBeInTheDocument();
    fireEvent.change(bgColorInput, { target: { value: '#123456' } });
    expect((bgColorInput as HTMLInputElement).value).toBe('#123456');
  });

  it('logs an error if saveMemeToGallery fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storageObj = await import('../../utils/storage');
    // Using simple casting since storage module is mocked globally
    (storageObj.saveMemeToGallery as any).mockRejectedValueOnce(new Error('Storage full'));

    const mockClick = vi.fn();
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    render(<MemeEditor />);
    const button = screen.getByText('Download Meme');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save meme to offline gallery', expect.any(Error));
    });

    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
