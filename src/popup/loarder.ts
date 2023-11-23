import JSZip from 'jszip';
import browser from 'webextension-polyfill';

function extractAndFormatVersionFromUrl(url: string): string | null {
  const versionRegex = /\/releases\/download\/([^\/]+)\//;
  const match = url.match(versionRegex);

  if (match && match[1]) {
    let formattedVersion = match[1].replace(/\./g, '_');

    if (formattedVersion.endsWith('_01')) {
      formattedVersion = formattedVersion.substring(0, formattedVersion.length - 3);
    }

    return formattedVersion;
  }

  return null;
}

async function downloadAndStoreZip(url: string): Promise<void> {
  let storageKey = extractAndFormatVersionFromUrl(url)
  if (!storageKey) {
    return
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const zip = new JSZip();
    const zipContents = await zip.loadAsync(blob);
    const extractedData: { [key: string]: string } = {};

    for (const fileName of Object.keys(zipContents.files)) {
      const fileData = await zipContents.files[fileName].async("string");
      extractedData[fileName] = fileData;
    }

    await browser.storage.local.set({ [storageKey]: extractedData });
  } catch (error) {
    console.error('Error downloading or storing zip file:', error);
  }
}

export const load = downloadAndStoreZip
