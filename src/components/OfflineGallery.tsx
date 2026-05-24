"use client";

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Masonry from '@mui/lab/Masonry';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashRoundedIcon from '@mui/icons-material/RestoreFromTrashRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { getGalleryMemes, deleteMemeFromGallery, updateMemeStatus, emptyTrash } from '@/utils/storage';
import { signData } from '@/utils/crypto';
import { useRouter } from 'next/navigation';

function ConfirmIconButton({ onConfirm, icon, className, positionClass, hoverReveal, size, title, 'aria-label': ariaLabel }: any) {
  const [confirming, setConfirming] = useState(false);
  
  if (confirming) {
    return (
      <div className={`flex items-center bg-red-100 dark:bg-red-900/90 rounded shadow-lg z-10 ${positionClass}`} onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-red-800 dark:text-red-100 pl-2 font-bold whitespace-nowrap">Delete?</span>
        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onConfirm(e); setConfirming(false); }}>
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" className="text-gray-600 dark:text-gray-300" onClick={(e) => { e.stopPropagation(); setConfirming(false); }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    );
  }

  const wrapperClass = hoverReveal 
    ? `${positionClass} opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-10`
    : `${positionClass} z-10`;

  return (
    <div className={wrapperClass}>
      <IconButton onClick={(e) => { e.stopPropagation(); setConfirming(true); }} className={className} size={size} title={title} aria-label={ariaLabel}>
        {icon}
      </IconButton>
    </div>
  );
}

function ConfirmButton({ onConfirm, children, icon, color, variant }: any) {
  const [confirming, setConfirming] = useState(false);
  
  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 font-medium whitespace-nowrap">Are you sure?</span>
        <Button size="small" variant="contained" color="error" onClick={(e) => { onConfirm(e); setConfirming(false); }}>Yes</Button>
        <Button size="small" variant="outlined" onClick={() => setConfirming(false)}>No</Button>
      </div>
    );
  }
  
  return (
    <Button variant={variant} color={color} startIcon={icon} onClick={() => setConfirming(true)}>
      {children}
    </Button>
  );
}

export default function OfflineGallery() {
  const [memes, setMemes] = useState<any[]>([]);
  const router = useRouter();

  const loadMemes = () => {
    getGalleryMemes().then(saved => {
      setMemes(saved.sort((a, b) => b.createdAt - a.createdAt));
    }).catch(console.error);
  };

  useEffect(() => {
    loadMemes();
    window.addEventListener('meme-saved', loadMemes);
    return () => window.removeEventListener('meme-saved', loadMemes);
  }, []);

  /* istanbul ignore next */
  if (memes.length === 0) {
    return null;
  }

  const handleEdit = async (configStr: string) => {
    try {
      const sig = await signData(configStr);
      router.push(`/?config=${encodeURIComponent(configStr)}&sig=${encodeURIComponent(sig)}`);
    } catch (err) {
      console.error('Failed to sign config for editing', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await updateMemeStatus(id, true);
      loadMemes();
    } catch (err) {
      console.error('Failed to move meme to trash', err);
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await updateMemeStatus(id, false);
      loadMemes();
    } catch (err) {
      console.error('Failed to restore meme', err);
    }
  };

  const handlePermanentDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteMemeFromGallery(id);
      loadMemes();
    } catch (err) {
      console.error('Failed to permanently delete meme', err);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
      loadMemes();
    } catch (err) {
      console.error('Failed to empty trash', err);
    }
  };

  /* istanbul ignore next */
  if (memes.length === 0) {
    return null;
  }

  const activeMemes = memes.filter(m => !m.inTrash);
  const trashedMemes = memes.filter(m => m.inTrash);

  return (
    <Box sx={{ width: '100%', mt: 8, pb: 8 }}>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Your Offline Gallery</h2>
      {activeMemes.length > 0 && (
      <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2}>
        {activeMemes.map((meme, index) => (
          <div 
            key={meme.id || index} 
            className="group cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative" 
            onClick={() => meme.config && handleEdit(meme.config)}
          >
            <img
              src={meme.image}
              alt={`Saved Meme ${index}`}
              style={{
                display: 'block',
                width: '100%',
              }}
            />
            
            {meme.id && (
              <ConfirmIconButton 
                onConfirm={(e: any) => handleDelete(e, meme.id)}
                positionClass="absolute top-1 right-1"
                hoverReveal={true}
                className="bg-black/50 hover:bg-black/70 text-white"
                size="small"
                aria-label="delete"
                icon={<DeleteIcon fontSize="small" />}
              />
            )}

            {meme.config ? (
              <div className="p-2 text-xs font-semibold text-blue-600 dark:text-blue-400 text-center bg-gray-50 dark:bg-gray-900">
                Click to Edit
              </div>
            ) : (
              <div className="p-2 text-xs text-gray-500 text-center bg-gray-50 dark:bg-gray-900">
                Read-only
              </div>
            )}
          </div>
        ))}
      </Masonry>
      )}

      {trashedMemes.length > 0 && (
        <Accordion sx={{ mt: 4, background: 'transparent', boxShadow: 'none', '&:before': { display: 'none' } }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="trash-content"
            id="trash-header"
            sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
          >
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Trash ({trashedMemes.length})</h3>
          </AccordionSummary>
          <AccordionDetails>
            <div className="flex justify-end mb-4">
              <ConfirmButton 
                variant="outlined" 
                color="error" 
                icon={<DeleteForeverRoundedIcon />}
                onConfirm={handleEmptyTrash}
              >
                Empty Trash
              </ConfirmButton>
            </div>
            <Masonry columns={{ xs: 2, sm: 3, md: 4 }} spacing={2}>
              {trashedMemes.map((meme, index) => (
                <div 
                  key={meme.id || index} 
                  className="group flex flex-col overflow-hidden rounded-lg shadow-sm bg-gray-100 dark:bg-gray-900 border border-red-200 dark:border-red-900 opacity-70 hover:opacity-100 transition-opacity" 
                >
                  <img
                    src={meme.image}
                    alt={`Trashed Meme ${index}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      filter: 'grayscale(100%)'
                    }}
                  />
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800">
                    <span className="text-xs text-red-500">In Trash</span>
                    {meme.id && (
                      <div className="flex gap-1">
                        <IconButton 
                          onClick={(e) => handleRestore(e, meme.id)}
                          className="text-gray-900 dark:text-gray-100"
                          color="inherit"
                          size="large"
                          title="Restore meme"
                          aria-label="restore"
                        >
                          <RestoreFromTrashRoundedIcon fontSize="medium" />
                        </IconButton>
                        <ConfirmIconButton 
                          onConfirm={(e: any) => handlePermanentDelete(e, meme.id)}
                          className="text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400"
                          size="large"
                          title="Delete forever"
                          aria-label="delete forever"
                          icon={<DeleteForeverRoundedIcon fontSize="medium" />}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Masonry>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}