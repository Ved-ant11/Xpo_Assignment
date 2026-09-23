const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();
const jobs = new Map();

app.use(cors());
app.use(express.json());

app.get('/clusters', async (req, res) => {
    try {
        const clusters = await prisma.cluster.findMany({
            include: {
                _count: {
                    select: { articles: true }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        
        const result = clusters.map(c => ({
            id: c.id,
            label: c.label,
            startTime: c.startTime,
            endTime: c.endTime,
            articleCount: c._count.articles
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/clusters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cluster = await prisma.cluster.findUnique({
            where: { id: parseInt(id) },
            include: {
                articles: {
                    orderBy: {
                        publishedAt: 'asc'
                    }
                }
            }
        });
        
        if (!cluster) {
            return res.status(404).json({ error: 'Not found' });
        }
        
        res.json(cluster);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/timeline', async (req, res) => {
    try {
        const clusters = await prisma.cluster.findMany({
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        });
        
        const result = clusters.map(c => ({
            id: c.id,
            label: c.label,
            start: c.startTime,
            end: c.endTime,
            articleCount: c._count.articles,
            intensity: c._count.articles
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/ingest/trigger', (req, res) => {
    const jobId = Date.now().toString();
    jobs.set(jobId, { status: 'running', error: null });
    
    const pythonScript = path.join(__dirname, 'ingest', 'main.py');
    
    let pythonExecutable = 'python';
    const venvWindowsPath = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
    const venvLinuxPath = path.join(__dirname, '..', '.venv', 'bin', 'python');
    
    if (fs.existsSync(venvWindowsPath)) {
        pythonExecutable = venvWindowsPath;
    } else if (fs.existsSync(venvLinuxPath)) {
        pythonExecutable = venvLinuxPath;
    }
    
    const pythonProcess = spawn(pythonExecutable, [pythonScript]);
    
    pythonProcess.on('close', (code) => {
        if (code === 0) {
            jobs.set(jobId, { status: 'completed', error: null });
        } else {
            jobs.set(jobId, { status: 'failed', error: `Process exited with code ${code}` });
        }
    });
    
    pythonProcess.on('error', (err) => {
        jobs.set(jobId, { status: 'failed', error: err.message });
    });
    
    res.json({ jobId });
});

app.get('/ingest/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
