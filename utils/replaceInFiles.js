const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const config = require('../config.json');
const mutations = require('../data/search-map.json');

const exportDir = path.join(__dirname, '../export');
const isDryRun = process.argv.includes('--dry-run');

// Tracks how many times each search-map row actually fired, so unused/typo'd
// rows (0 matches) surface in the report instead of failing silently.
const stats = new Map(mutations.map(mutation => [mutation, { matches: 0, elements: 0, files: new Set() }]));

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
async function applyGlobalReplacements(content, mutations, filePath) {
  let updatedContent = content;
  mutations.forEach(mutation => {
    const regex = createFlexibleRegex(mutation.searchValue);
    const stat = stats.get(mutation);
    updatedContent = updatedContent.replace(regex, () => {
      stat.matches += 1;
      stat.files.add(filePath);
      return mutation.replaceValue;
    });
  });
  return updatedContent;
}

// Recursively replaces matches in a node's own attributes/text and its descendants,
// mutating in place so structural tags (html/head/body) are never re-parsed/re-inserted.
function applyRegexToNode(node, regex, replaceValue, stat, filePath) {
  if (node.type === 'text') {
    node.data = node.data.replace(regex, () => {
      stat.matches += 1;
      stat.files.add(filePath);
      return replaceValue;
    });
    return;
  }

  if (node.attribs) {
    Object.keys(node.attribs).forEach(attr => {
      node.attribs[attr] = node.attribs[attr].replace(regex, () => {
        stat.matches += 1;
        stat.files.add(filePath);
        return replaceValue;
      });
    });
  }

  if (node.children) {
    node.children.forEach(child => applyRegexToNode(child, regex, replaceValue, stat, filePath));
  }
}

// Function to process selector-based replacements for HTML files
async function applySelectorReplacements(content, mutations, filePath) {
  const $ = cheerio.load(content);

  mutations.forEach(mutation => {
    const elements = $(mutation.selector);
    const regex = createFlexibleRegex(mutation.searchValue);
    const stat = stats.get(mutation);
    stat.elements += elements.length;

    elements.each((index, element) => {
      applyRegexToNode(element, regex, mutation.replaceValue, stat, filePath);
    });
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

  updatedContent = await applyGlobalReplacements(updatedContent, globalMutations, currentFilePath);

  if (selectorMutations.length > 0 && ext === '.html') {
    updatedContent = await applySelectorReplacements(updatedContent, selectorMutations, currentFilePath);
  }

  if (!isDryRun) {
    await fs.writeFile(currentFilePath, updatedContent, 'utf-8');
  }
  console.log(`${isDryRun ? '[dry run] Would update' : 'Updated file'}: ${currentFilePath}`);
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

function printReport() {
  const rows = mutations.map((mutation, index) => ({ index: index + 1, mutation, stat: stats.get(mutation) }));
  const zeroMatchRows = rows.filter(({ mutation, stat }) => stat.matches === 0 && !(mutation.selector && stat.elements === 0));
  const zeroElementRows = rows.filter(({ mutation, stat }) => mutation.selector && stat.elements === 0);

  console.log(`\n${isDryRun ? '=== Dry-run report (no files written) ===' : '=== Replacement report ==='}`);
  rows.forEach(({ index, mutation, stat }) => {
    const label = mutation.selector ? `selector "${mutation.selector}"` : 'global';
    const flag = stat.matches === 0 ? '  ⚠ no matches' : '';
    console.log(
      `  ${index}. [${label}] "${mutation.searchValue}" → "${mutation.replaceValue}": ` +
      `${stat.matches} match(es) in ${stat.files.size} file(s)${flag}`
    );
  });

  if (zeroElementRows.length > 0) {
    console.log(`\n⚠ ${zeroElementRows.length} rule(s) had a selector that matched no elements in any .html file:`);
    zeroElementRows.forEach(({ index, mutation }) => console.log(`  Row ${index}: selector "${mutation.selector}"`));
  }
  if (zeroMatchRows.length > 0) {
    console.log(`\n⚠ ${zeroMatchRows.length} rule(s) matched elements/files but found no searchValue to replace:`);
    zeroMatchRows.forEach(({ index, mutation }) => console.log(`  Row ${index}: "${mutation.searchValue}"`));
  }
  console.log('');
}

async function startReplaceProcessing() {
  try {
    await processFiles(exportDir); // Pass excluded folders from config
    printReport();
    console.log(isDryRun ? 'Dry run complete — no files were modified.' : 'All files processed successfully.');
  } catch (error) {
    console.error('Error during processing:', error);
  }
}

startReplaceProcessing()
  .catch(err => console.error('Error during file processing:', err));
