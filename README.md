# Search-Replace-By-Selector Script

This script supports targeted replacements of HTML elements with specified search-and-replace values, creating customized template variations in bulk.

## Setup Instructions

1. **Prepare the `search-map.xlsx` File**:
    - Add the styles and content changes to be applied by filling out the `search-map.xlsx` table.
    - **Columns**:
        - `selector` (CSS selector): Specify a CSS selector for targeted changes. Leave empty if the change should apply globally.
        - `searchValue`: The current text or style to be found in the template.
        - `replaceValue`: The new text or style to replace `searchValue` with.

2. **Configuration Options** (`config.json`):
    - **`excludedFolders`**: Specify any folder names that should be ignored during processing.
    - **`textFileExtensions`**:
      ```json
      [
        ".html",
        ".css",
        ".js",
        ".json"
      ]
      ```
      Add or remove file types to control which files should be processed.

3. **Project Folders**:
    - Place the folder with files where replacement is needed in the `entry` folder.
    - Processed files will be saved in the `export` folder.

## Commands

Only 1 command is needed to execute the entire script:

```bash
npm run start search-replace-by-selector
```

Which sequentially runs:

```bash
node utils/convertExcelToJSON.js && node utils/copyFiles.js && node utils/replaceInFiles.js
```
