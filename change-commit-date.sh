#!/bin/bash

# Calculate the date 105 days ago
TARGET_DATE=$(date -d "105 days ago" +"%Y-%m-%d %H:%M:%S")
# For macOS, use:
# TARGET_DATE=$(date -v-105d +"%Y-%m-%d %H:%M:%S")

# Assuming you want to change the first commit in the repository
# First, identify the first commit hash
FIRST_COMMIT=$(git rev-list --max-parents=0 HEAD)

# Create a temporary branch at the first commit
git checkout -b temp-branch $FIRST_COMMIT

# Set the date environment variable
export GIT_COMMITTER_DATE="$TARGET_DATE"
export GIT_AUTHOR_DATE="$TARGET_DATE"

# Amend the commit without changing the message
git commit --amend --no-edit --date="$TARGET_DATE"

# Get the new commit hash
NEW_COMMIT=$(git rev-parse HEAD)

# Go back to the original branch
git checkout main # or master, depending on your default branch name

# Perform a rebase to incorporate the changed commit date
git rebase --onto $NEW_COMMIT $FIRST_COMMIT

# Clean up - remove the temporary branch
git branch -D temp-branch

# Force push to update the repository history on GitHub
# CAUTION: This rewrites history! Only do this on repositories where this 
is acceptable
git push --force origin main # or master, depending on your default branch 
name

echo "Commit date changed to $TARGET_DATE"
