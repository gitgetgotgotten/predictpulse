const {Octokit} = require('@octokit/rest');
const cors = require('micro-cors')({
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  origin: '*'
});

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.error(`Invalid method: ${req.method}`);
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const newLogs = req.body;

    if (!Array.isArray(newLogs) || newLogs.length === 0) {
      console.error('Invalid input: newLogs is not a non-empty array');
      return res.status(400).json({error: 'Invalid or empty logs'});
    }

    console.log(`Received ${newLogs.length} logs:`, newLogs.map(log => log.visitId));

    const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});
    const owner = 'gitgetgotgotten';
    const repo = 'predictpulse-data';
    const path = 'predictpulse_realdata.json';
    const branch = 'data';
    const maxRetries = 3;

    async function tryUpdateLogs(attempt = 1) {
      try {
        // Step 1: Fetch latest commit and file content
        const refData = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`
        });
        const latestCommitSha = refData.data.object.sha;

        let existingLogs = [];
        let sha = null;
        let fileExists = false;

        try {
          const {data} = await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref: latestCommitSha // Ensure latest commit
          });
          const content = Buffer.from(data.content, 'base64').toString();
          existingLogs = JSON.parse(content);
          if (!Array.isArray(existingLogs)) {
            console.warn('Existing file is not an array, resetting to empty array');
            existingLogs = [];
          }
          sha = data.sha;
          fileExists = true;
          console.log(`Fetched ${existingLogs.length} existing logs:`, existingLogs.map(log => log.visitId));
        } catch (error) {
          if (error.status !== 404) {
            throw new Error(`Failed to fetch file: ${error.message}`);
          }
          console.log('No existing file, will create new file');
        }

        // Step 2: Append new logs
        const updatedLogs = [...existingLogs, ...newLogs];
        console.log(`Appended ${newLogs.length} new logs, total: ${updatedLogs.length}`);

        // Step 3: Send compiled data
        const content = JSON.stringify(updatedLogs, null, 2);
        const contentBase64 = Buffer.from(content).toString('base64');

        if (fileExists) {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Append ${newLogs.length} logs (total: ${updatedLogs.length})`,
            content: contentBase64,
            sha,
            branch
          });
        } else {
          const commitData = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: latestCommitSha
          });
          const treeSha = commitData.data.tree.sha;

          const blobData = await octokit.git.createBlob({
            owner,
            repo,
            content: contentBase64,
            encoding: 'base64'
          });

          const treeData = await octokit.git.createTree({
            owner,
            repo,
            base_tree: treeSha,
            tree: [{path, mode: '100644', type: 'blob', sha: blobData.data.sha}]
          });

          const newCommitData = await octokit.git.createCommit({
            owner,
            repo,
            message: `Create file with ${newLogs.length} logs`,
            tree: treeData.data.sha,
            parents: [latestCommitSha]
          });

          await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommitData.data.sha
          });
        }

        console.log(`Successfully appended ${newLogs.length} logs, total in file: ${updatedLogs.length}`);
        return res.status(200).json({
          success: true,
          message: `Appended ${newLogs.length} logs`,
          totalLogs: updatedLogs.length
        });
      } catch (error) {
        if (error.status === 409 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Conflict on attempt ${attempt}: ${error.message}, retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return tryUpdateLogs(attempt + 1);
        }
        throw new Error(`Update failed: ${error.message}`);
      }
    }

    return await tryUpdateLogs();
  } catch (error) {
    console.error('Failed to process logs:', error.message);
    return res.status(500).json({error: `Failed to process logs: ${error.message}`});
  }
}

module.exports = cors(handler);