// scripts/upload_logs.js
import fs from 'fs';
import {Octokit} from '@octokit/rest';

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

async function uploadLogs(newLogs) {
  let existingLogs = [];
  try {
    const {data} = await octokit.repos.getContent({
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data',
      path: 'predictpulse_realdata.json',
      branch: 'data'
    });
    existingLogs = JSON.parse(Buffer.from(data.content, 'base64').toString());
  } catch (error) {
    if (error.status !== 404) {
      console.error('Failed to fetch existing logs:', error);
    }
  }

  const updatedLogs = [...existingLogs, ...newLogs];
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: 'gitgetgotgotten',
      repo: 'predictpulse-data',
      path: 'predictpulse_realdata.json',
      message: 'Append new logs',
      content: Buffer.from(JSON.stringify(updatedLogs, null, 2)).toString('base64'),
      branch: 'data',
      sha: existingLogs.length > 0 ? (await octokit.repos.getContent({
        owner: 'gitgetgotgotten',
        repo: 'predictpulse-data',
        path: 'predictpulse_realdata.json',
        branch: 'data'
      })).data.sha : undefined
    });
    console.log('Logs appended to GitHub:', newLogs.length);
  } catch (error) {
    console.error('Failed to append logs:', error);
  }
}

module.exports = {uploadLogs};