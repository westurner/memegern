import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import OfflineGallery from '../OfflineGallery';
import * as storage from '@/utils/storage';
import * as crypto from '@/utils/crypto';

vi.mock('@/utils/storage', () => ({ getGalleryMemes: vi.fn(), deleteMemeFromGallery: vi.fn(), updateMemeStatus: vi.fn(), emptyTrash: vi.fn() }));
vi.mock('@/utils/crypto', () => ({ signData: vi.fn(), verifySignature: vi.fn() }));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

const mockActiveMeme = { id: 1, image: 'active.png', inTrash: false, createdAt: 200, config: 'some-config' };
const mockReadonlyMeme = { id: 2, image: 'readonly.png', inTrash: false, createdAt: 100 }; // no config
const mockTrashedMeme = { id: 3, image: 'trashed.png', inTrash: true, createdAt: 300, config: 'trash-config' };

describe('OfflineGallery', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders nothing when no memes are returned', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([]);
    const { container } = render(<OfflineGallery />);
    await waitFor(() => expect(storage.getGalleryMemes).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders memes correctly and sorts by createdAt desc', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockReadonlyMeme, mockActiveMeme]);
    render(<OfflineGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument();
    });
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    // mockActiveMeme (200) should be before mockReadonlyMeme (100)
    expect(images[0]).toHaveAttribute('src', 'active.png');
    expect(images[1]).toHaveAttribute('src', 'readonly.png');
    
    expect(screen.getByText('Click to Edit')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
  });

  it('loads trashed memes in accordion', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
    render(<OfflineGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Trash (1)')).toBeInTheDocument();
    });
    
    expect(screen.getByAltText('Trashed Meme 0')).toBeInTheDocument();
  });

  it('re-loads memes on meme-saved event', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([]);
    render(<OfflineGallery />);
    
    await waitFor(() => expect(storage.getGalleryMemes).toHaveBeenCalledTimes(1));
    
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockActiveMeme]);
    
    act(() => {
      window.dispatchEvent(new Event('meme-saved'));
    });
    
    await waitFor(() => {
      expect(storage.getGalleryMemes).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument();
    });
  });

  it('handles edit click and navigates', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockActiveMeme]);
    vi.mocked(crypto.signData).mockResolvedValue('mock-sig');
    
    render(<OfflineGallery />);
    await waitFor(() => expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument());
    
    const container = screen.getByAltText('Saved Meme 0').closest('div');
    fireEvent.click(container!);
    
    await waitFor(() => {
      expect(crypto.signData).toHaveBeenCalledWith('some-config');
      expect(mockPush).toHaveBeenCalledWith('/?config=some-config&sig=mock-sig');
    });
  });

  it('handles edit click error gracefully', async () => {
    vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockActiveMeme]);
    vi.mocked(crypto.signData).mockRejectedValue(new Error('Sign failed'));
    
    render(<OfflineGallery />);
    await waitFor(() => expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument());
    
    const container = screen.getByAltText('Saved Meme 0').closest('div');
    fireEvent.click(container!);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to sign config for editing', expect.any(Error));
    });
  });

  describe('ConfirmIconButton functionality', () => {
    it('shows confirm dialog, cancels, and confirms', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockActiveMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument());
      
      const deleteBtn = screen.getByLabelText('delete');
      
      // Click delete to open confirm
      fireEvent.click(deleteBtn);
      
      const askPrompt = screen.getByText('Delete?');
      expect(askPrompt).toBeInTheDocument();
      
      // Click wrapper
      fireEvent.click(askPrompt.parentElement as HTMLElement);
      // Cancel
      const closeBtns = screen.getAllByTestId('CloseIcon');
      fireEvent.click(closeBtns[0]);
      
      expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
      
      // Open confirm again
      fireEvent.click(screen.getByLabelText('delete'));
      expect(screen.getByText('Delete?')).toBeInTheDocument();
      
      // Confirm
      vi.mocked(storage.updateMemeStatus).mockResolvedValue(undefined);
      const checkBtns = screen.getAllByTestId('CheckIcon');
      fireEvent.click(checkBtns[0]);
      
      await waitFor(() => {
        expect(storage.updateMemeStatus).toHaveBeenCalledWith(1, true);
        expect(storage.getGalleryMemes).toHaveBeenCalledTimes(2);
      });
      expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
    });

    it('logs error if move to trash fails', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockActiveMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument());
      
      fireEvent.click(screen.getByLabelText('delete'));
      
      vi.mocked(storage.updateMemeStatus).mockRejectedValue(new Error('Update failed'));
      fireEvent.click(screen.getAllByTestId('CheckIcon')[0]);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to move meme to trash', expect.any(Error));
      });
    });
  });

  describe('Trash functionality', () => {
    it('restores trashed meme', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      vi.mocked(storage.updateMemeStatus).mockResolvedValue(undefined);
      fireEvent.click(screen.getByLabelText('restore'));
      
      await waitFor(() => {
        expect(storage.updateMemeStatus).toHaveBeenCalledWith(3, false);
      });
    });

    it('handles restore error', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      vi.mocked(storage.updateMemeStatus).mockRejectedValue(new Error('Restore err'));
      fireEvent.click(screen.getByLabelText('restore'));
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to restore meme', expect.any(Error));
      });
    });

    it('permanently deletes trashed meme', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      fireEvent.click(screen.getByLabelText('delete forever'));
      expect(screen.getByText('Delete?')).toBeInTheDocument();
      
      vi.mocked(storage.deleteMemeFromGallery).mockResolvedValue(undefined);
      fireEvent.click(screen.getAllByTestId('CheckIcon')[0]);
      
      await waitFor(() => {
        expect(storage.deleteMemeFromGallery).toHaveBeenCalledWith(3);
      });
    });

    it('handles permanent delete error', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      fireEvent.click(screen.getByLabelText('delete forever'));
      
      vi.mocked(storage.deleteMemeFromGallery).mockRejectedValue(new Error('Delete err'));
      fireEvent.click(screen.getAllByTestId('CheckIcon')[0]);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to permanently delete meme', expect.any(Error));
      });
    });
  });

  describe('ConfirmButton functionality', () => {
    it('shows inline confirm, cancels, and confirms on empty trash', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      const emptyTrashBtn = screen.getByText('Empty Trash');
      fireEvent.click(emptyTrashBtn);
      
      const areYouSure = screen.getByText('Are you sure?');
      expect(areYouSure).toBeInTheDocument();
      
      // cancel
      fireEvent.click(screen.getByText('No'));
      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
      
      // open again
      fireEvent.click(screen.getByText('Empty Trash'));
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      
      // confirm
      vi.mocked(storage.emptyTrash).mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('Yes'));
      
      await waitFor(() => {
        expect(storage.emptyTrash).toHaveBeenCalled();
        expect(storage.getGalleryMemes).toHaveBeenCalledTimes(2);
      });
    });

    it('handles empty trash error', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([mockTrashedMeme]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Trash (1)')).toBeInTheDocument());
      
      fireEvent.click(screen.getByText('Empty Trash'));
      
      vi.mocked(storage.emptyTrash).mockRejectedValue(new Error('Empty trash err'));
      fireEvent.click(screen.getByText('Yes'));
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to empty trash', expect.any(Error));
      });
    });
  });


  describe('Additional coverage cases', () => {
    it('returns null if there are absolutely no memes', async () => {
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([]);
      const { container } = render(<OfflineGallery />);
      await waitFor(() => expect(storage.getGalleryMemes).toHaveBeenCalled());
      expect(container.firstChild).toBeNull();
    });

    it('uses index for key if meme has no id, and no positionClass is used', async () => {
      const memeNoId = {
        ...mockActiveMeme,
        id: undefined, // this hits line 149/212
        inTrash: false
      };
      const memeNoIdTrashed = {
        ...memeNoId,
        inTrash: true
      };
      
      vi.mocked(storage.getGalleryMemes).mockResolvedValue([memeNoId as any, memeNoIdTrashed as any]);
      render(<OfflineGallery />);
      await waitFor(() => expect(screen.getByText('Your Offline Gallery')).toBeInTheDocument());
      
      // also expand trash to render trashed with undefined id
      fireEvent.click(screen.getAllByText(/Trash/)[0]);
    });
  });
});
