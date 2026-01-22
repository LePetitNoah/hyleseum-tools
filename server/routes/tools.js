import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all tools for user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tools = await prisma.tool.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tools);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tools' });
    }
});

// Create a new tool
router.post('/', authenticateToken, async (req, res) => {
    const { title, link, description, comment, tags, isFavorite } = req.body;
    try {
        const newTool = await prisma.tool.create({
            data: {
                title,
                link,
                description,
                comment,
                tags: tags || [], // JSON
                isFavorite: isFavorite || false,
                userId: req.user.userId
            }
        });
        res.json(newTool);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create tool' });
    }
});

// Update a tool
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, link, description, comment, tags, isFavorite } = req.body;
    try {
        const updatedTool = await prisma.tool.update({
            where: { id: id, userId: req.user.userId }, // Ensure ownership
            data: { title, link, description, comment, tags, isFavorite }
        });
        res.json(updatedTool);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tool' });
    }
});

// Delete a tool
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.tool.delete({
            where: { id: id, userId: req.user.userId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete tool' });
    }
});

export default router;
