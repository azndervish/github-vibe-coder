/**
 * Fetch the list of files in a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} token - The GitHub access token.
 * @param {string} branch - The branch to fetch the file list from.
 * @returns {Promise<Array>} - A promise that resolves to a list of file paths.
 */
export async function fetchRepoFileList(repoUrl, token, branch) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(treeUrl, {
    headers: { Authorization: `token ${token}` },
  });

  if (!res.ok) throw new Error(`Error fetching file list: ${res.status} ${res.statusText}`);

  const data = await res.json();
  return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || [];
}

/**
 * Fetch the content of a file in a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} filePath - The path to the file in the repository.
 * @param {string} token - The GitHub access token.
 * @param {string} branch - The branch where the file is located.
 * @returns {Promise<string>} - A promise that resolves to the file content.
 */
export async function fetchFileContent(repoUrl, filePath, token, branch) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(fileUrl, {
    headers: { Authorization: `token ${token}` },
  });

  if (!res.ok) throw new Error(`Error reading ${filePath}: ${res.status} ${res.statusText}`);

  const data = await res.json();
  return data.encoding === 'base64' ? atob(data.content) : data.content;
}

/**
 * Commit and push a file to a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} filePath - The path to the file to be committed.
 * @param {string} newContent - The content to be committed.
 * @param {string} commitMessage - The commit message.
 * @param {string} token - The GitHub access token.
 * @param {string} branch - The branch to commit to.
 * @returns {Promise<void>}
 */
export async function commitAndPushFile(repoUrl, filePath, newContent, commitMessage, token, branch) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  let sha = null;

  try {
    const getRes = await fetch(fileUrl, {
      headers: { Authorization: `token ${token}` },
    });

    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`Failed to fetch file details: ${getRes.status} ${getRes.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching file details for ${filePath}: ${error.message}`);
    return; 
  }

  try {
    const headers = {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    };

    const body = JSON.stringify({
      message: commitMessage,
      content: btoa(newContent),
      ...(sha ? { sha } : {}),
      branch,
    });

    const res = await fetch(fileUrl, {
      method: 'PUT',
      headers: headers,
      body: body,
    });

    if (!res.ok) {
      throw new Error(`Failed to commit ${filePath}: ${res.status} ${res.statusText}`);
    } else {
      console.info(`File ${filePath} committed successfully.`);
    }
  } catch (error) {
    console.error(`Error committing file ${filePath}: ${error.message}`);
  }
}

/**
 * Revert the last commit in a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} token - The GitHub access token.
 * @param {string} branch - The branch to revert the commit on.
 * @returns {Promise<string>} - A promise that resolves with the hash of the reverted commit.
 */
export async function revertToPreviousCommit(repoUrl, token, branch) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  try {
    // Step 1: Get previous commit hash
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}`;
    const commitsRes = await fetch(commitsUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const commitsData = await commitsRes.json();
    if (commitsData.length < 2) throw new Error("No previous commit to revert to.");

    const previousCommitHash = commitsData[1].sha;
    const swapBranchName = `temp-revert-${new Date().getTime()}`;

    // Step 2: Create a temporary branch from the previous commit
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${swapBranchName}`,
        sha: previousCommitHash,
      }),
    });

    // Step 3: Delete the current branch
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${token}` },
    });

    // Step 4: Recreate the original branch from the temporary swap
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: previousCommitHash,
      }),
    });

    // Step 5: Delete the swap branch
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${swapBranchName}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${token}` },
    });

    return previousCommitHash;
    
  } catch (error) {
    console.error(`Error during revert: ${error.message}`);
    throw new Error(`Failed to revert to previous commit: ${error.message}`);
  }
}

/**
 * Delete a file from a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} filePath - The path to the file in the repository.
 * @param {string} commitMessage - The commit message for the deletion.
 * @param {string} token - The GitHub access token.
 * @param {string} branch - The branch where the file is located.
 * @returns {Promise<void>}
 */
export async function deleteFile(repoUrl, filePath, commitMessage, token, branch) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // Get the file's SHA
    const getRes = await fetch(`${fileUrl}?ref=${branch}`, {
      headers: { Authorization: `token ${token}` },
    });

    if (!getRes.ok) {
      throw new Error(`Failed to fetch file details: ${getRes.status} ${getRes.statusText}`);
    }

    const getData = await getRes.json();
    const sha = getData.sha;

    // Delete the file
    const res = await fetch(fileUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        sha: sha,
        branch: branch,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to delete ${filePath}: ${res.status} ${res.statusText}`);
    } else {
      console.info(`File ${filePath} deleted successfully.`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}: ${error.message}`);
  }
}

/**
 * Create a new branch in a GitHub repository.
 * 
 * @param {string} repoUrl - The GitHub repository URL.
 * @param {string} newBranchName - The name of the new branch to create.
 * @param {string} token - The GitHub access token.
 * @returns {Promise<void>}
 */
export async function createBranch(repoUrl, newBranchName, token) {
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
  
  try {
    // Step 1: Get the latest commit's SHA from the default branch
    const defaultBranchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`;
    const defaultBranchRes = await fetch(defaultBranchUrl, {
      headers: { Authorization: `token ${token}` },
    });
    
    if (!defaultBranchRes.ok) {
      throw new Error(`Failed to fetch default branch: ${defaultBranchRes.status} ${defaultBranchRes.statusText}`);
    }
    
    const defaultBranchData = await defaultBranchRes.json();
    const latestCommitSha = defaultBranchData.object.sha;

    // Step 2: Create a new branch from the latest commit of the default branch
    const createBranchUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
    const createBranchRes = await fetch(createBranchUrl, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: latestCommitSha,
      }),
    });

    if (!createBranchRes.ok) {
      throw new Error(`Failed to create branch ${newBranchName}: ${createBranchRes.status} ${createBranchRes.statusText}`);
    } else {
      console.info(`Branch ${newBranchName} created successfully.`);
    }
  } catch (error) {
    console.error(`Error creating branch ${newBranchName}: ${error.message}`);
  }
}