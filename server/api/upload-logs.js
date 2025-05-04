const {Octokit} = require('@octokit/rest');

// Create a more permissive CORS handler
const cors = require('micro-cors')({
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  origin: '*'  // Allow all origins for now
});

async function handler(req, res) {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    // Set CORS headers manually for preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const newLogs = req.body;

    if (!Array.isArray(newLogs) || newLogs.length === 0) {
      console.error('Invalid or empty logs:', newLogs);
      return res.status(400).json({error: 'Invalid or empty logs'});
    }

    console.log(`Received ${newLogs.length} logs to upload`);

    const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});
    const owner = 'gitgetgotgotten';
    const repo = 'predictpulse-data';
    const path = 'predictpulse_realdata.json';
    const branch = 'data';

    let existingLogs = [];
    let fileExists = false;

    try {
      // Try to get the existing file content
      const {data} = await octokit.repos.getContent({
        owner,
        repo,
        path,
        branch
      });

      existingLogs = JSON.parse(Buffer.from(data.content, 'base64').toString());
      fileExists = true;
      console.log(`Found existing file with ${existingLogs.length} logs`);

      // Merge logs and remove duplicates
      const updatedLogs = [...existingLogs, ...newLogs].filter(
        (log, idx, self) => idx === self.findIndex(l => l.visitId === log.visitId)
      );

      console.log(`Uploading ${updatedLogs.length} logs (${existingLogs.length} existing + ${newLogs.length} new)`);

      // Update the existing file
      const result = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Update with ${newLogs.length} new logs`,
        content: Buffer.from(JSON.stringify(updatedLogs, null, 2)).toString('base64'),
        sha: data.sha,
        branch
      });

      console.log('File updated successfully');
      return res.status(200).json({success: true, message: 'Logs uploaded successfully'});

    } catch (error) {
      // If file doesn't exist, create it using the Git Data API
      if (error.status === 404) {
        console.log('File does not exist, creating it using Git Data API');

        // Get the latest commit SHA for the branch
        const refData = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`
        });

        const latestCommitSha = refData.data.object.sha;
        console.log(`Latest commit SHA: ${latestCommitSha}`);

        // Get the tree for this commit
        const commitData = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: latestCommitSha
        });

        const treeSha = commitData.data.tree.sha;
        console.log(`Tree SHA: ${treeSha}`);

        // Create a blob with our content
        const content = JSON.stringify(newLogs, null, 2);

        const blobData = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64'
        });

        const blobSha = blobData.data.sha;
        console.log(`Created blob with SHA: ${blobSha}`);

        // Create a new tree with our file
        const treeData = await octokit.git.createTree({
          owner,
          repo,
          base_tree: treeSha,
          tree: [
            {
              path,
              mode: '100644', // file mode
              type: 'blob',
              sha: blobSha
            }
          ]
        });

        const newTreeSha = treeData.data.sha;
        console.log(`Created new tree with SHA: ${newTreeSha}`);

        // Create a commit with this tree
        const newCommitData = await octokit.git.createCommit({
          owner,
          repo,
          message: `Create file with ${newLogs.length} logs`,
          tree: newTreeSha,
          parents: [latestCommitSha]
        });

        const newCommitSha = newCommitData.data.sha;
        console.log(`Created new commit with SHA: ${newCommitSha}`);

        // Update the reference to point to our new commit
        await octokit.git.updateRef({
          owner,
          repo,
          ref: `heads/${branch}`,
          sha: newCommitSha
        });

        console.log(`Updated branch ${branch} to point to new commit`);
        return res.status(200).json({success: true, message: 'Logs uploaded successfully (new file created)'});
      } else {
        // If it's another error, throw it
        console.error('GitHub API error:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error uploading logs:', error);
    return res.status(500).json({error: `Failed to upload logs: ${error.message}`});
  }
}

module.exports = cors(handler);
