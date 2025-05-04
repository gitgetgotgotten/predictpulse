const express = require('express');
const {Octokit} = require('@octokit/rest');
const cors = require('cors');
const app = express();

// Allow requests from your GitHub Pages site
app.use(cors({
  origin: ['https://gitgetgotgotten.github.io', 'http://localhost:5173'],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({limit: '10mb'}));

// Create Octokit instance with GitHub token from environment variable
const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

app.post('/api/upload-logs', async (req, res) => {
  try {
    const newLogs = req.body;

    if (!Array.isArray(newLogs) || newLogs.length === 0) {
      console.error('Invalid or empty logs:', newLogs);
      return res.status(400).send('Invalid or empty logs');
    }

    console.log(`Received ${newLogs.length} logs to upload`);

    let existingLogs = [];
    let sha = null;

    try {
      // Try to get the existing file content and SHA
      const {data} = await octokit.repos.getContent({
        owner: 'gitgetgotgotten',
        repo: 'predictpulse-data',
        path: 'predictpulse_realdata.json',
        branch: 'data'
      });

      existingLogs = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
      console.log('Found existing file with SHA:', sha);
    } catch (error) {
      // If file doesn't exist (404) we'll create it
      if (error.status === 404) {
        console.log('predictpulse_realdata.json not found, will create new file');
      } else {
        console.error('GitHub API error:', error.message, error.status);
        throw error;
      }
    }

    // Merge logs and remove duplicates
    const updatedLogs = [...existingLogs, ...newLogs].filter(
      (log, idx, self) => idx === self.findIndex(l => l.visitId === log.visitId)
    );

    console.log(`Uploading ${updatedLogs.length} logs (${existingLogs.length} existing + ${newLogs.length} new)`);

    // Prepare commit data
    const commitData = {
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data',
      path: 'predictpulse_realdata.json',
      message: `Append ${newLogs.length} visits`,
      content: Buffer.from(JSON.stringify(updatedLogs, null, 2)).toString('base64'),
      branch: 'data'
    };

    // Only include SHA if we found an existing file
    if (sha) {
      commitData.sha = sha;
    }

    // Create or update the file
    const result = await octokit.repos.createOrUpdateFileContents(commitData);
    console.log('GitHub API response:', result.status);

    res.status(200).send('Logs uploaded successfully');
  } catch (error) {
    console.error('Error uploading logs:', error.message, error.stack);
    res.status(500).send(`Failed to upload logs: ${error.message}`);
  }
});

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
