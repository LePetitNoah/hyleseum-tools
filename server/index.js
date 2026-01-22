import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import toolsRoutes from './routes/tools.js';
import projectsRoutes from './routes/projects.js';
import notesRoutes from './routes/notes.js';
import boardsRoutes from './routes/boards.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded from other origins if needed (or same origin)
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs (adjusted for active usage)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(cors());
app.use(express.json());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/tools', toolsRoutes);
app.use('/projects', projectsRoutes);
app.use('/obsidian', notesRoutes);
app.use('/boards', boardsRoutes);
app.use('/upload', uploadRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
