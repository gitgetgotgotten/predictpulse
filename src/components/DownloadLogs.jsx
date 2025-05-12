export default function DownloadLogs() {
  if (!localStorage.getItem('github_token')) return null;

  const exportLogs = async () => {
    try {
      console.info('[DownloadLogs] Retrieving GitHub token...');
      const githubToken = localStorage.getItem('github_token');

      if (!githubToken) {
        console.warn('[DownloadLogs] No GitHub token found in localStorage');
        alert('Please set a GitHub token in localStorage using localStorage.setItem("github_token", "your_token").');
        return;
      }

      console.info('[DownloadLogs] Fetching logs from GitHub API...');

      const response = await fetch(
        'https://api.github.com/repos/gitgetgotgotten/predictpulse-data/contents/predictpulse_realdata.json?ref=data',
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[DownloadLogs] File not found in GitHub repository');
          alert('No logs file found in the GitHub repository. You may need to upload logs first.');
          return;
        }
        throw new Error(`HTTP error! Status: ${response.status}, ${await response.text()}`);
      }

      console.info('[DownloadLogs] Logs fetched, decoding base64...');
      const data = await response.json();

      if (!data.content) {
        throw new Error('No content found in GitHub response');
      }

      const logs = JSON.parse(atob(data.content));

      if (!logs || logs.length === 0) {
        console.warn('[DownloadLogs] No logs found in GitHub repository');
        alert('No logs available to download.');
        return;
      }

      console.info('[DownloadLogs] Creating JSON blob...');
      const jsonString = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonString], {type: 'application/json'});

      console.info('[DownloadLogs] Creating download link...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predictpulse_realdata.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.info('[DownloadLogs] Download triggered');
    } catch (error) {
      console.error('[DownloadLogs] Failed to download logs:', error);
      alert(`Failed to download logs: ${error.message}`);
    }
  };

  return (
    <button
      style={{position: 'fixed', top: '10px', right: '10px', zIndex: 1000}}
      onClick={exportLogs}
    >
      Download Logs
    </button>
  );
}
