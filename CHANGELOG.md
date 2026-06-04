# Changelog

## 1.0.1 (YYYY-MM-DD)

- **Fix**: Addressed an issue where the CKEditor5 build was missing CSS.
```

### Step 3: Commit Changes
Commit the changes to your version control system. Make sure to include both the updated `package.json` and any new or modified release notes files.

```sh
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.1"
```

### Step 4: Tag the Release
Tag the current commit with a semantic version tag.

```sh
git tag v1.0.1
```

### Step 5: Push Changes and Tags
Push the changes and tags to your remote repository.

```sh
git push origin main --tags
```

### Example Workflow in GitHub/GitLab

1. **Update `package.json`:**
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Update Release Notes (`CHANGELOG.md`):**
   ```markdown
   # Changelog

   ## 1.0.1 (YYYY-MM-DD)

   - **Fix**: Addressed an issue where the CKEditor5 build was missing CSS.
   ```

3. **Commit Changes:**
   ```sh
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 1.0.1"
   ```

4. **Tag the Release:**
   ```sh
   git tag v1.0.1
   ```

5. **Push Changes and Tags:**
   ```sh
   git push origin main --tags
   ```

### Example Workflow in GitLab

1. **Update `package.json`:**
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Update Release Notes (`CHANGELOG.md`):**
   ```markdown
   # Changelog

   ## 1.0.1 (YYYY-MM-DD)

   - **Fix**: Addressed an issue where the CKEditor5 build was missing CSS.
   ```

3. **Commit Changes:**
   ```sh
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 1.0.1"
   ```

4. **Tag the Release:**
   ```sh
   git tag v1.0.1
   ```

5. **Push Changes and Tags:**
   ```sh
   git push origin main --tags