const {Octokit} = require('@octokit/rest');

module.exports = async (req, res) => {
  try {
    const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});
    const filePath = 'predictpulse_realdata.json';
    let fileExists = false;
    let sha = null;

    console.log(`Checking if file ${filePath} exists in the data branch...`);

    try {
      // Try to get the file content
      const {data} = await octokit.repos.getContent({
        owner: 'gitgetgotgotten',
        repo: 'predictpulse-data',
        path: filePath,
        branch: 'data'
      });

      fileExists = true;
      sha = data.sha;
      console.log(`File exists with SHA: ${sha}`);

      // Decode the content
      const content = Buffer.from(data.content, 'base64').toString();
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
        console.log(`File contains valid JSON with ${Array.isArray(parsedContent) ? parsedContent.length : 'non-array'} items`);
      } catch (e) {
        console.log(`File does not contain valid JSON: ${e.message}`);
      }

    } catch (error) {
      if (error.status === 404) {
        console.log('File does not exist, will need to create it');
        fileExists = false;
      } else {
        console.error(`Error checking file: ${error.message}`);
        throw error;
      }
    }

    // Now let's try to create or update the file
    const testData = [{visitId: `test-${Date.now()}`, timestamp: new Date().toISOString()}];

    console.log(`Attempting to ${fileExists ? 'update' : 'create'} the file...`);

    const commitData = {
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data',
      path: filePath,
      message: fileExists ? 'Update test file' : 'Create test file',
      content: Buffer.from(JSON.stringify(testData, null, 2)).toString('base64'),
      branch: 'data'
    };

    if (fileExists && sha) {
      commitData.sha = sha;
    }

    try {
      const result = await octokit.repos.createOrUpdateFileContents(commitData);
      console.log(`File ${fileExists ? 'updated' : 'created'} successfully`);

      return res.status(200).json({
        success: true,
        operation: fileExists ? 'update' : 'create',
        message: `File ${fileExists ? 'updated' : 'created'} successfully`,
        commitSha: result.data.commit.sha
      });
    } catch (error) {
      console.error(`Error ${fileExists ? 'updating' : 'creating'} file:`, error);

      return res.status(500).json({
        error: `Failed to ${fileExists ? 'update' : 'create'} file`,
        message: error.message,
        status: error.status,
        requestData: {
          ...commitData,
          content: `${commitData.content.substring(0, 20)}...` // Truncate for readability
        }
      });
    }
  } catch (error) {
    console.error('Debug file endpoint error:', error);
    return res.status(500).json({
      error: error.message,
      status: error.status,
      stack: error.stack
    });
  }
};
