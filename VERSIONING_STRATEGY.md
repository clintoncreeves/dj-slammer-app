# DJ Slammer - Versioning Strategy

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Active Policy

---

## Table of Contents

1. [Version Numbering Scheme](#version-numbering-scheme)
2. [Release Process](#release-process)
3. [Feature Tracking Methodology](#feature-tracking-methodology)
4. [Branching Strategy](#branching-strategy)
5. [Changelog Management](#changelog-management)
6. [Deployment Versioning](#deployment-versioning)

---

## Version Numbering Scheme

### Semantic Versioning (SemVer)

DJ Slammer follows **Semantic Versioning 2.0.0** specification:

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Example: 1.2.3-beta.1+20251207
```

#### Version Components

**MAJOR** (Breaking Changes)
- Incompatible API changes
- Major UI/UX redesigns
- Complete feature rewrites
- Changes that break existing functionality

**MINOR** (New Features)
- New features added (backwards compatible)
- Significant improvements
- New demo modes or lessons
- New training games

**PATCH** (Bug Fixes)
- Bug fixes
- Performance improvements
- Documentation updates
- Small UI tweaks

**PRERELEASE** (Optional)
- `alpha`: Early development, unstable
- `beta`: Feature complete, testing phase
- `rc`: Release candidate, final testing

**BUILD** (Optional)
- Build date (YYYYMMDD)
- Git commit hash
- Build number

### Current Version

**DJ Slammer v0.1.0**

Why 0.x?
- Still in initial development
- API not stable
- Major features still being added
- Not production-ready for public release

### Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 0.1.0 | 2025-12-07 | Initial | MVP with Slammer Mode, crossfader, BPM sync game |
| 0.0.1 | 2025-11-XX | Alpha | First prototype with dual decks |

---

## Release Process

### Release Workflow

```
Development → Testing → Staging → Production
     ↓           ↓         ↓          ↓
   feature    local     preview    vercel
   branch     build      deploy    deploy
```

### 1. Development Phase

**Goal**: Build new features

```bash
# Create feature branch
git checkout -b feature/volume-controls

# Develop and test locally
npm run dev

# Run build to check for errors
npm run build

# Commit changes
git add .
git commit -m "feat: add individual volume controls to Slammer Mode"
```

**Commit Message Convention** (Conventional Commits):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style (formatting, no logic change)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build process, dependencies

### 2. Testing Phase

**Goal**: Verify functionality

**Local Testing Checklist:**
- [ ] `npm run build` succeeds (zero errors)
- [ ] `npm run dev` works locally
- [ ] All features function as expected
- [ ] No console errors
- [ ] Responsive on multiple screen sizes
- [ ] Test on Chrome, Firefox, Safari

**Automated Testing** (when implemented):
```bash
npm run test        # Run unit tests
npm run test:ui     # Interactive test UI
npm run lint        # Check code style
```

### 3. Staging Phase

**Goal**: Test in production-like environment

**Preview Deployment (Automatic):**
1. Push feature branch to GitHub
2. Create pull request
3. Vercel automatically creates preview deployment
4. Preview URL: `https://dj-slammer-app-git-{branch}-....vercel.app`

**Testing on Preview:**
- [ ] Test all features in preview environment
- [ ] Check audio playback (HTTPS required)
- [ ] Verify crossfader works
- [ ] Test on real mobile devices
- [ ] Check performance metrics

### 4. Production Release

**Goal**: Deploy to production

#### Step 1: Version Bump
```bash
# Update version in package.json
npm version patch   # 0.1.0 → 0.1.1 (bug fix)
npm version minor   # 0.1.0 → 0.2.0 (new feature)
npm version major   # 0.1.0 → 1.0.0 (breaking change)

# This creates a git tag automatically
```

#### Step 2: Update Changelog
```markdown
# CHANGELOG.md

## [0.2.0] - 2025-12-07

### Added
- Individual volume controls for each deck in Slammer Mode
- Kid-friendly volume slider design

### Fixed
- Crossfader not updating volume in real-time

### Changed
- Improved audio mixing algorithm
```

#### Step 3: Merge to Main
```bash
# Merge PR on GitHub
# Or manually:
git checkout main
git merge feature/volume-controls
git push origin main
```

#### Step 4: Tag Release
```bash
# Create release tag
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

#### Step 5: Verify Deployment
- Check Vercel dashboard
- Test production URL
- Monitor for errors

### 5. Post-Release

**Documentation:**
- Update README.md with new features
- Update relevant docs in `/docs`
- Create release notes on GitHub

**Monitoring:**
- Check Vercel analytics
- Monitor error logs
- Track user feedback

---

## Feature Tracking Methodology

### Feature Lifecycle

```
Idea → Planned → In Progress → In Review → Merged → Deployed → Verified
```

### Feature Status Levels

| Status | Symbol | Meaning |
|--------|--------|---------|
| Idea | 💡 | Concept, not yet planned |
| Planned | 📋 | Approved, scheduled for development |
| In Progress | 🔨 | Actively being developed |
| In Review | 👀 | Pull request open, under review |
| Merged | ✅ | Code merged to main branch |
| Deployed | 🚀 | Live in production |
| Verified | ✔️ | Tested and confirmed working |

### Feature Tracking Document

**Location**: `FEATURES.md` (create this file)

```markdown
# DJ Slammer - Feature Tracker

## In Progress 🔨
- [ ] Individual volume controls (KidsModeDemo)
  - Branch: feature/volume-controls
  - Target: v0.2.0
  - Status: 60% complete

## Planned 📋
- [ ] Key Harmony Wheel training game
  - Target: v0.3.0
  - Priority: Medium
  
- [ ] Beat Drop Trainer game
  - Target: v0.3.0
  - Priority: Medium

## Completed ✅
- [x] Crossfader with character animations (v0.1.0)
- [x] BPM Sync Master game (v0.1.0)
- [x] Dual deck system (v0.1.0)
```

### GitHub Integration

**Use GitHub Issues for Features:**
```
Title: [Feature] Individual Volume Controls in Slammer Mode
Labels: enhancement, high-priority
Milestone: v0.2.0

Description:
Add per-deck volume controls to KidsModeDemo component.

Acceptance Criteria:
- [ ] Volume sliders added to UI
- [ ] Volume state integrated with useAudioPlayer
- [ ] Volume affects audio output independently
- [ ] Kid-friendly design matches existing aesthetic
```

**Use GitHub Projects for Tracking:**
- Create project board: "DJ Slammer Roadmap"
- Columns: Backlog, Planned, In Progress, In Review, Done
- Link issues to project
- Automatic tracking via PR status

---

## Branching Strategy

### Branch Types

#### 1. Main Branch (`main`)
- **Purpose**: Production-ready code
- **Protection**: Require PR reviews before merge
- **Auto-Deploy**: Yes (Vercel)
- **Lifetime**: Permanent

#### 2. Feature Branches (`feature/*`)
- **Naming**: `feature/descriptive-name`
- **Examples**:
  - `feature/volume-controls`
  - `feature/harmony-wheel-game`
  - `feature/mobile-optimization`
- **Purpose**: New feature development
- **Lifetime**: Delete after merge

#### 3. Fix Branches (`fix/*`)
- **Naming**: `fix/issue-description`
- **Examples**:
  - `fix/crossfader-audio-sync`
  - `fix/typescript-build-errors`
  - `fix/mobile-audio-playback`
- **Purpose**: Bug fixes
- **Lifetime**: Delete after merge

#### 4. Docs Branches (`docs/*`)
- **Naming**: `docs/what-changed`
- **Examples**:
  - `docs/deployment-guide`
  - `docs/api-reference`
- **Purpose**: Documentation updates only
- **Lifetime**: Delete after merge

#### 5. Release Branches (`release/*`) - Future
- **Naming**: `release/v0.2.0`
- **Purpose**: Prepare for release (when needed)
- **Use Case**: When 0.x → 1.0 or major releases
- **Lifetime**: Delete after merge + tag

### Branch Protection Rules (GitHub Settings)

**For `main` branch:**
- ✅ Require pull request reviews (1 reviewer minimum)
- ✅ Require status checks to pass (build must succeed)
- ✅ Require conversation resolution before merge
- ❌ Allow force pushes (never force push to main)
- ✅ Require linear history (no merge commits)

### Workflow Example

```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/volume-controls

# Make changes
git add src/components/...
git commit -m "feat: add volume state to KidsModeDemo"

# Continue development
git commit -m "feat: create kid-friendly volume slider component"
git commit -m "feat: integrate volume controls with audio player"

# Push to remote
git push origin feature/volume-controls

# Create PR on GitHub
# After approval and CI passes, merge via GitHub UI
# Delete branch after merge
```

---

## Changelog Management

### Changelog Format

**File**: `CHANGELOG.md` (root of repository)

**Format**: Based on [Keep a Changelog](https://keepachangelog.com/)

```markdown
# Changelog

All notable changes to DJ Slammer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Individual volume controls for each deck in Slammer Mode

### Fixed
- Crossfader not updating audio volume in real-time

## [0.1.0] - 2025-12-07

### Added
- Slammer Mode with dual DJ decks (DJ Dog and DJ Cat)
- Character-based crossfader with visual feedback
- BPM Sync Master training game
- Track selection for Deck A and Deck B
- DJ terminology throughout UI
- Tutorial system for lessons
- Professional lesson modes

### Changed
- Initial release

## [0.0.1] - 2025-11-XX (Alpha)

### Added
- Basic dual deck prototype
- Simple audio playback
```

### Change Categories

**Added**: New features
**Changed**: Changes to existing functionality
**Deprecated**: Features to be removed in future
**Removed**: Features removed in this version
**Fixed**: Bug fixes
**Security**: Security vulnerability fixes

### Updating Changelog

**When**: Before every release

**Process**:
1. Review all commits since last release
2. Group changes by category
3. Write user-facing descriptions (not technical)
4. Link to issues/PRs if relevant
5. Update `[Unreleased]` section
6. On release, move to versioned section

---

## Deployment Versioning

### Deployment Tracking

**Where Version is Stored:**
- `package.json` → `"version": "0.1.0"`
- Git tags → `v0.1.0`
- UI footer (optional) → "DJ Slammer v0.1.0"

### Version in UI

**Display Version (Optional):**
```typescript
// KidsModeDemo.tsx footer
<div style={styles.footer}>
  <div style={styles.footerText}>
    🎵 DJ Slammer v{import.meta.env.PACKAGE_VERSION} - Slammer Mode 🎮
  </div>
</div>

// vite.config.ts - expose version
export default defineConfig({
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(
      process.env.npm_package_version
    ),
  },
  // ... rest of config
});
```

### Deployment Metadata

**Track Deployments in Vercel:**
- Deployment ID (automatic)
- Git commit SHA (automatic)
- Branch name (automatic)
- Deploy timestamp (automatic)

**Access Deployment Info:**
```typescript
// Check Vercel environment variables
const deploymentURL = import.meta.env.VERCEL_URL;
const gitCommitSHA = import.meta.env.VERCEL_GIT_COMMIT_SHA;
const gitBranch = import.meta.env.VERCEL_GIT_COMMIT_REF;
```

---

## Version Milestones

### Roadmap to v1.0

```
v0.1.0 (Current)
  └─ MVP: Slammer Mode, crossfader, one training game

v0.2.0 (Next)
  ├─ Individual volume controls
  └─ Improved mobile experience

v0.3.0
  ├─ Key Harmony Wheel game
  ├─ Beat Drop Trainer game
  └─ More tracks in library

v0.4.0
  ├─ Progress tracking (local storage)
  ├─ Achievement system
  └─ Tutorial improvements

v0.5.0
  ├─ Mobile optimization
  ├─ Touch gesture controls
  └─ Performance improvements

v1.0.0 (Public Release)
  ├─ Production-ready
  ├─ Full test coverage
  ├─ Documentation complete
  ├─ User accounts (optional)
  └─ Stable API
```

### Version Decision Criteria

**When to increment MAJOR (0.x → 1.0):**
- Feature complete for target audience
- Stable, well-tested codebase
- Ready for public announcement
- Breaking changes from 0.x API

**When to increment MINOR (0.1 → 0.2):**
- New feature added
- New training game
- New demo mode
- Significant UI improvements

**When to increment PATCH (0.1.0 → 0.1.1):**
- Bug fixes
- Performance tweaks
- Documentation updates
- Small UI adjustments

---

## Release Checklist Template

### Pre-Release Checklist

**Code Quality:**
- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Code linted (`npm run lint`)

**Functionality:**
- [ ] All new features work as expected
- [ ] No regressions in existing features
- [ ] Audio playback works
- [ ] Crossfader responds smoothly
- [ ] Volume controls work (when implemented)
- [ ] Mobile responsive

**Testing:**
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on Safari
- [ ] Tested on mobile device
- [ ] Tested on preview deployment

**Documentation:**
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)
- [ ] New features documented
- [ ] API changes documented (if applicable)

**Version Management:**
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes written

### Post-Release Checklist

**Deployment:**
- [ ] Production deployment successful
- [ ] Production URL accessible
- [ ] No errors in Vercel dashboard
- [ ] Vercel analytics enabled

**Verification:**
- [ ] Test core features in production
- [ ] Audio plays in production
- [ ] HTTPS enabled
- [ ] Check loading performance

**Communication:**
- [ ] Team notified of release
- [ ] GitHub release created
- [ ] Version number visible (if displayed in UI)

**Monitoring:**
- [ ] Check for errors in first 24 hours
- [ ] Monitor Vercel analytics
- [ ] Gather user feedback

---

## Automation Opportunities (Future)

### Automated Version Bumping
```bash
# Using standard-version (npm package)
npm install --save-dev standard-version

# Add to package.json scripts
"scripts": {
  "release": "standard-version",
  "release:minor": "standard-version --release-as minor",
  "release:major": "standard-version --release-as major"
}

# Automatically:
# - Bumps version in package.json
# - Updates CHANGELOG.md
# - Creates git commit
# - Creates git tag
```

### Automated Changelog Generation
```bash
# Using conventional-changelog
npm install --save-dev conventional-changelog-cli

# Generate changelog from commit messages
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### GitHub Actions (Future CI/CD)
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: CHANGELOG.md
```

---

## Best Practices

### Commit Messages
✅ **Good:**
```
feat: add individual volume controls to Slammer Mode

- Created VolumeSlider component for kids
- Integrated with useAudioPlayer hook
- Added volume state to KidsModeDemo
- Updated audio mixing algorithm

Closes #42
```

❌ **Bad:**
```
updates
```

### Version Tags
✅ **Good:**
```bash
git tag -a v0.2.0 -m "Add volume controls and mobile improvements"
```

❌ **Bad:**
```bash
git tag v2
```

### Release Notes
✅ **Good:**
```markdown
## What's New in v0.2.0

🎚️ **Individual Volume Controls**: Each deck now has its own volume slider!
📱 **Mobile Improvements**: Better touch controls on phones and tablets
🐛 **Bug Fixes**: Crossfader now updates audio smoothly

[Full Changelog](link)
```

❌ **Bad:**
```markdown
## v0.2.0
- stuff
- things
```

---

## Support and Maintenance

### Version Support Policy

**Current Release (v0.x.latest)**:
- Full support
- Bug fixes released as patches
- Security updates prioritized

**Previous Minor (v0.x-1.latest)**:
- Critical bug fixes only
- Security updates
- No new features

**Older Versions**:
- No support
- Users encouraged to upgrade

### Deprecation Policy

**When deprecating a feature:**
1. Announce in CHANGELOG (version N)
2. Mark as deprecated in code (version N)
3. Show warnings in console (version N)
4. Remove in next MAJOR version (version N+1)

**Example:**
```typescript
// Version 0.5.0
/**
 * @deprecated Use useAudioEngine instead. Will be removed in v1.0.0
 */
function useAudioPlayer() {
  console.warn('useAudioPlayer is deprecated. Use useAudioEngine instead.');
  // ... implementation
}
```

---

## Change Log (This Document)

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-07 | 1.0 | Initial versioning strategy created | Kiro Agent |

---

**Status:** Active Policy  
**Review Schedule:** Quarterly or when approaching major version  
**Last Updated:** December 7, 2025
