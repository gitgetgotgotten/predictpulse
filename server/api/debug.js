const {Octokit} = require('@octokit/rest');

module.exports = async (req, res) => {
  try {
    // Mask the token for security while still showing enough to debug
    const token = process.env.GITHUB_TOKEN || 'not-set';
    const maskedToken = token === 'not-set' ? 'not-set' :
      `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;

    console.log(`GitHub Token (masked): ${maskedToken}`);
    console.log(`Token length: ${token.length}`);

    if (token === 'not-set') {
      return res.status(500).json({error: 'GitHub token not set in environment variables'});
    }

    const octokit = new Octokit({auth: token});

    // Try to get repository info first
    const repoInfo = await octokit.repos.get({
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data'
    });

    console.log('Repository info retrieved successfully');
    console.log(`Repository name: ${repoInfo.data.name}`);
    console.log(`Default branch: ${repoInfo.data.default_branch}`);

    // Try to list branches
    const branches = await octokit.repos.listBranches({
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data'
    });

    console.log('Branches:');
    branches.data.forEach(branch => {
      console.log(`- ${branch.name}`);
    });

    // Check if data branch exists
    const dataBranchExists = branches.data.some(branch => branch.name === 'data');

    if (!dataBranchExists) {
      return res.status(400).json({
        error: 'Data branch does not exist in the repository',
        branches: branches.data.map(b => b.name)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'GitHub API connection successful',
      repo: repoInfo.data.name,
      branches: branches.data.map(b => b.name)
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      error: error.message,
      status: error.status,
      stack: error.stack
    });
  }
};
