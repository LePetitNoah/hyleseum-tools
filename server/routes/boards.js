import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all boards for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const boards = await prisma.milanoteBoard.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'asc' }
        });
        // If no boards, maybe creates a default one? Or let frontend handle it.
        // Frontend expects at least one board usually.
        res.json(boards);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
});

// Create a board
router.post('/', authenticateToken, async (req, res) => {
    const { title, elements, connections, parentId } = req.body;
    try {
        const board = await prisma.milanoteBoard.create({
            data: {
                title: title || 'New Board',
                elements: elements || [], // JSON
                connections: connections || [], // JSON
                parentId: parentId || null,
                userId: req.user.userId
            }
        });
        res.json(board);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create board' });
    }
});

// Update a board (save elements/connections)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, elements, connections, parentId } = req.body;
    try {
        const board = await prisma.milanoteBoard.update({
            where: { id: id, userId: req.user.userId },
            data: {
                ...(title && { title }),
                ...(elements && { elements }), // Prisma handles JSON automatically if mapped correctly
                ...(connections && { connections }),
                ...(parentId !== undefined && { parentId })
            }
        });
        res.json(board);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update board' });
    }
});

// Delete a board
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.milanoteBoard.delete({
            where: { id: id, userId: req.user.userId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete board' });
    }
});

export default router;
