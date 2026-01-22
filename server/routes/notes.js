import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// --- FOLDERS ---

// Get all folders
router.get('/folders', authenticateToken, async (req, res) => {
    try {
        const folders = await prisma.obsidianFolder.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(folders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// Create folder
router.post('/folders', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const folder = await prisma.obsidianFolder.create({
            data: {
                name,
                isOpen: true,
                userId: req.user.userId
            }
        });
        res.json(folder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Delete folder (and update user notes to remove folderId?? Or cascade delete? 
// Schema doesn't specify cascade. For now, we'll just delete folder, notes become "unfiled" if not cleaned up manually, 
// OR we should delete notes in folder. Let's delete folder only for now, logic on frontend can handle unfiled)
router.delete('/folders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Optional: First set folderId=null for notes in this folder?
        await prisma.obsidianNote.updateMany({
            where: { folderId: id, userId: req.user.userId },
            data: { folderId: null }
        });

        await prisma.obsidianFolder.delete({
            where: { id: id, userId: req.user.userId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

// Update folder (e.g. toggle open/close)
router.put('/folders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, isOpen } = req.body;
    try {
        const folder = await prisma.obsidianFolder.update({
            where: { id: id, userId: req.user.userId },
            data: {
                ...(name && { name }),
                ...(typeof isOpen === 'boolean' && { isOpen })
            }
        });
        res.json(folder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update folder' });
    }
});


// --- NOTES ---

// Get all notes
router.get('/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await prisma.obsidianNote.findMany({
            where: { userId: req.user.userId },
            orderBy: { lastModified: 'desc' } // or createdAt
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Create note
router.post('/notes', authenticateToken, async (req, res) => {
    const { title, content, folderId, lastModified } = req.body;
    try {
        const note = await prisma.obsidianNote.create({
            data: {
                title: title || 'Untitled',
                content: content || '',
                folderId: folderId || null,
                lastModified: lastModified || new Date().toISOString(),
                userId: req.user.userId
            }
        });
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// Update note
router.put('/notes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, content, folderId, lastModified } = req.body;
    try {
        const note = await prisma.obsidianNote.update({
            where: { id: id, userId: req.user.userId },
            data: {
                ...(title && { title }),
                ...(content !== undefined && { content }),
                ...(folderId !== undefined && { folderId }), // allow null
                ...(lastModified && { lastModified })
            }
        });
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete note
router.delete('/notes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.obsidianNote.delete({
            where: { id: id, userId: req.user.userId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;
