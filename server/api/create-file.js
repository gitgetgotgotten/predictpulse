const {Octokit} = require('@octokit/rest');

module.exports = async (req, res) => {
  try {
    const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});
    const owner = 'gitgetgotgotten';
    const repo = 'predictpulse-data';
    const path = 'predictpulse_realdata.json';
    const branch = 'data';

    console.log(`Attempting to create ${path} in ${owner}/${repo} on branch ${branch}`);

    // First, let's get the latest commit SHA for the branch
    const refData = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });

    console.log(`Latest commit SHA for branch ${branch}: ${refData.data.object.sha}`);

    // Get the tree for this commit
    const commitData = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: refData.data.object.sha
    });

    const treeSha = commitData.data.tree.sha;
    console.log(`Tree SHA: ${treeSha}`);

    // Create a blob with our content
    const testData = [{visitId: `test-${Date.now()}`, timestamp: new Date().toISOString()}];
    const content = JSON.stringify(testData, null, 2);

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
      message: 'Create predictpulse_realdata.json',
      tree: newTreeSha,
      parents: [refData.data.object.sha]
    });

    const newCommitSha = newCommitData.data.sha;
    console.log(`Created new commit with SHA: ${newCommitSha}`);

    // Update the reference to point to our new commit
    const updateRefData = await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitSha
    });

    console.log(`Updated branch ${branch} to point to new commit`);

    return res.status(200).json({
      success: true,
      message: 'File created successfully using Git Data API',
      commitSha: newCommitSha
    });
  } catch (error) {
    console.error('Error creating file:', error);
    return res.status(500).json({
      error: error.message,
      status: error.status,
      stack: error.stack
    });
  }
};
