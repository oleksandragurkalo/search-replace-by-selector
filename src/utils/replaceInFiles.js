const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const config = require('../config.json');
const mutations = require('../data/search-map.json');

const exportDir = path.join(__dirname, '../export');

function isRegexPattern(string) {
  const regexChars = /[.*+?^${}|[\]\\]/;
  return regexChars.test(string);
}

function createFlexibleRegex(searchString) {
  if (isRegexPattern(searchString)) {
    return new RegExp(searchString, 'gi');
  } else {
    const escapedString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedString.replace(/\s+/g, '\\s*'), 'gi'); // 'gi' added here
  }
}

// Function to process non-selector-based replacements
async function applyGlobalReplacements(content, mutations) {
  let updatedContent = content;
  mutations.forEach(mutation => {
    const regex = createFlexibleRegex(mutation.searchValue);
    updatedContent = updatedContent.replace(regex, mutation.replaceValue);
  });
  return updatedContent;
}

// Function to process selector-based replacements for HTML files
async function applySelectorReplacements(content, mutations) {
  const $ = cheerio.load(content);

  mutations.forEach(mutation => {
    const element = $(mutation.selector);
    const string = element.prop('outerHTML');

    if (string) {
      const regex = createFlexibleRegex(mutation.searchValue);
      const updatedString = string.replace(regex, mutation.replaceValue);
      element.replaceWith(updatedString);
    }
  });

  return $.html();
}

async function replaceInFile(currentFilePath) {
  const ext = path.extname(currentFilePath).toLowerCase();
  const textFileExtensions = config?.textFileExtensions || [];

  if (!textFileExtensions.includes(ext)) return; // Skip if file extension isn't in the list

  const content = await fs.readFile(currentFilePath, 'utf-8');
  let updatedContent = content;

  const globalMutations = mutations.filter(mutation => !mutation.selector);
  const selectorMutations = mutations.filter(mutation => mutation.selector);

  updatedContent = await applyGlobalReplacements(updatedContent, globalMutations);

  if (selectorMutations.length > 0 && ext === '.html') {
    updatedContent = await applySelectorReplacements(updatedContent, selectorMutations);
  }

  await fs.writeFile(currentFilePath, updatedContent, 'utf-8');
  console.log(`Updated file: ${currentFilePath}`);
}

async function processFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (config?.excludedFolders.includes(entry.name)) {
          console.log(`Skipping excluded folder: ${fullPath}`);
          continue;
        }
        await processFiles(fullPath);
      } else if (entry.isFile()) {
        await replaceInFile(fullPath);
      }
    }
  } catch (error) {
    console.error('Error processing files:', error);
  }
}

async function startReplaceProcessing() {
  try {
    await processFiles(exportDir); // Pass excluded folders from config
    console.log('All files processed successfully.');
  } catch (error) {
    console.error('Error during processing:', error);
  }
}

startReplaceProcessing()
  .catch(err => console.error('Error during file processing:', err));
