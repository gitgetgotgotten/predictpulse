const express = require('express');
const {Octokit} = require('@octokit/rest');
const cors = require('cors');
const app = express();

app.use(cors({origin: 'https://gitgetgotgotten.github.io'}));
app.use(express.json());

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

app.post('/api/upload-logs', async (req, res) => {
  try {
    const newLogs = req.body;
    if (!Array.isArray(newLogs) || newLogs.length === 0) {
      console.error('Invalid or empty logs:', newLogs);
      return res.status(400).send('Invalid or empty logs');
    }

    let existingLogs = [];
    let sha = null;
    try {
      const {data} = await octokit.repos.getContent({
        owner: 'gitgetgotgotten',
        repo: 'predictpulse-data',
        path: 'predictpulse_realdata.json',
        branch: 'data'
      });
      existingLogs = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
    } catch (error) {
      if (error.status === 404) {
        console.warn('predictpulse_realdata.json not found, initializing empty array');
      } else {
        console.error('GitHub API error:', error.message, error.status);
        throw error;
      }
    }

    const updatedLogs = [...existingLogs, ...newLogs].filter(
      (log, idx, self) => idx === self.findIndex(l => l.visitId === log.visitId)
    );

    const commitData = {
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data',
      path: 'predictpulse_realdata.json',
      message: `Append ${newLogs.length} visits`,
      content: Buffer.from(JSON.stringify(updatedLogs, null, 2)).toString('base64'),
      branch: 'data'
    };
    if (sha) commitData.sha = sha; // Only include sha if it exists

    await octokit.repos.createOrUpdateFileContents(commitData);

    res.status(200).send('Logs uploaded');
  } catch (error) {
    console.error('Error uploading logs:', error.message, error.stack);
    res.status(500).send(`Failed to upload logs: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));