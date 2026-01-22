import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
    try {
        const projects = await prisma.trelloProject.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Create project
router.post('/', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const project = await prisma.trelloProject.create({
            data: {
                name,
                tasks: [], // Start empty
                userId: req.user.userId
            }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update project (tasks or name)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, tasks } = req.body;
    try {
        const project = await prisma.trelloProject.update({
            where: { id: id, userId: req.user.userId },
            data: {
                ...(name && { name }),
                ...(tasks && { tasks })
            }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.trelloProject.delete({
            where: { id: id, userId: req.user.userId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
