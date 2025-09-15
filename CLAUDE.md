# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chinese podcast audio upload interface for "达芬Qi说" (DaVinci Qi Talk), built as a pure frontend web application that enables users to upload MP3/WAV audio files along with podcast metadata to Supabase storage and database.

## Architecture

### Technology Stack
- **Frontend**: Pure HTML5, CSS3, vanilla JavaScript (no frameworks)
- **UI Library**: None (custom implementation following DaVinci Qi design system)
- **Backend**: Supabase (Storage + Database)
- **Deployment**: GitHub Pages

### Core Components
- `AudioUploaderApp` class: Main application controller with state management
- `Semaphore` class: Controls upload concurrency (max 3 parallel uploads)
- `AudioUtils` module: Audio file processing utilities
- `SUPABASE_CONFIG`: Database and storage configuration

### File Structure
```
index.html              # Main page with complete UI structure
css/style.css          # DaVinci Qi design system styles
js/app.js              # Main application logic and UI controllers
js/audio-utils.js      # Audio file validation and metadata extraction
js/supabase-config.js  # Supabase client configuration
```

## Storage Architecture (Updated 2025-09-15)

### New Directory Structure
```
podcast-audios/
├── channels/                          # Channel-based organization
│   ├── qiji-signals/                  # 奇绩前沿信号
│   │   └── YYYY/MM/                   # Year/Month structure
│   ├── classic-papers/                # 经典论文解读
│   │   └── YYYY/MM/                   # Year/Month structure
│   └── [future-channels]/             # Future channel expansion
├── temp/                              # Temporary processing
│   ├── uploads/                       # New uploads
│   ├── processing/                    # Files being processed
│   └── failed/                        # Failed uploads
```

### File Naming Conventions
- **奇绩前沿信号**: `qiji_YYYY_MM_DD.mp3`
- **经典论文解读**: `paper_[domain]_[title]_YYYYMMDD.mp3`
- **Generic**: `[prefix]_[timestamp].mp3`

## Development Commands

### Local Development
```bash
# Serve locally (any HTTP server)
python -m http.server 8000
# or
npx http-server
```

### Testing Audio Files
- **Supported formats**: MP3, WAV
- **Maximum file size**: 100MB per file
- **Validation**: Format, size, and duration extraction

### Deployment
```bash
# Deploy to GitHub Pages
git add .
git commit -m "Update audio upload interface"
git push origin main
```

## Key Implementation Details

### Upload Flow
1. **File Selection**: Drag & drop or file picker
2. **Validation**: Format, size, audio metadata extraction
3. **Form Data**: Podcast metadata including paper information
4. **Preview**: Complete upload preview with audio player
5. **Upload**: Parallel uploads (max 3) with progress tracking
6. **Results**: Success/failure summary with retry options

### Storage Path Generation
```javascript
// New intelligent path generation based on channel configuration
generateStoragePath(fileName) {
    const channel = this.channels.find(c => c.id === this.formData.channel_id);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `channels/${channel.storage_path}/${year}/${month}/${fileName}`;
}
```

### Enhanced Validation
- **Channel-specific requirements**: Paper title required for classic-papers channel
- **Unique title checking**: Prevents duplicate podcast titles
- **File format optimization**: WAV automatically converted to MP3

### Supabase Integration
- **Storage bucket**: `podcast-audios` with new channel-based structure
- **Database table**: `podcasts` with full metadata
- **Cover images**: Stored in `static-images` bucket under `covers/` prefix
- **Channel configuration**: Extended channels table with storage_path and naming_prefix

### State Management
- Files are stored in `this.files` array with status tracking
- Upload states: `pending`, `uploading`, `success`, `error`
- Progress tracking per file and overall
- Form data collected in `this.formData` object

### Error Handling
- Comprehensive validation for audio files
- Network error recovery
- User-friendly error messages in Chinese
- Graceful degradation for missing metadata

## Supabase Configuration

### Database Schema
The app expects these tables:

#### podcasts table (core)
- `title` (required)
- `description`
- `audio_url` (required)
- `duration` (seconds)
- `channel_id` (required, foreign key to channels table)
- `cover_url`
- `paper_title`, `paper_url`, `arxiv_id`, `doi`
- `authors` (JSON array)
- `institution`, `publish_date`
- `status` (default: 'published')

#### channels table (extended)
- `id`, `name`, `description`
- `storage_path` (NEW: defines storage directory)
- `naming_prefix` (NEW: defines file naming pattern)
- `file_format` (NEW: default file format)

### Storage Buckets
- `podcast-audios`: Audio files with new channel-based structure
- `static-images`: Cover images with public access

### Security Notes
- Uses Supabase anonymous key (safe for client-side)
- Requires proper RLS policies for security
- No authentication required (anonymous uploads enabled)

## Design System

Follows the DaVinci Qi design language:
- **Primary color**: `#0884FF` (brand blue)
- **Typography**: SF Pro, WeChat Sans Std fallbacks
- **Spacing**: 8px grid system
- **Border radius**: 8-12px consistent
- **Animations**: 0.3s cubic-bezier transitions

## Common Tasks

### Adding New Channels
1. Insert channel record with `storage_path` and `naming_prefix`
2. Directory structure automatically created on first upload
3. Frontend automatically adapts to new channel configuration

### Modifying Upload Limits
1. Change `maxSize` parameter in `validateFileSize()` function
2. Update UI text in `index.html:15`

### Adding Form Fields
1. Add HTML form fields in the `form-section`
2. Update `collectFormData()` method in `app.js:456`
3. Update preview generation in `generatePreview()` method
4. Ensure database schema supports new fields

### Customizing File Naming
1. Modify `generateNewFileName()` method in `app.js:144`
2. Add new naming patterns for different channel types
3. Update `generateStoragePath()` for directory structure

### Performance Optimization
- Implement WAV to MP3 conversion for space savings
- Add file deduplication based on content hash
- Implement progressive upload with resume capability

## Troubleshooting

### Common Issues
1. **Supabase connection errors**: Check network and configuration
2. **File upload failures**: Verify bucket permissions and RLS policies
3. **Audio duration extraction**: Ensure files are valid audio formats
4. **Progress tracking**: Check semaphore implementation for concurrency
5. **Path generation errors**: Verify channel configuration in database

### Development Tips
- Use browser dev tools Network tab to debug Supabase calls
- Test with various audio file sizes and formats
- Verify mobile responsiveness on different screen sizes
- Check console for detailed error messages
- Test channel-specific validation logic

## Performance Considerations

- Uses object URLs for audio preview (properly cleaned up)
- Implements upload concurrency control (3 parallel uploads)
- Lazy loads audio metadata only when needed
- Optimized CSS animations using transform/opacity
- Efficient DOM updates with targeted element selection
- Intelligent path generation reduces redundant database queries

## Recent Updates (2025-09-15)

- **Storage Architecture Redesign**: Implemented channel-based directory structure
- **Enhanced Validation**: Added channel-specific field requirements
- **Path Generation**: Intelligent file naming based on channel configuration
- **Database Schema**: Extended channels table with storage configuration
- **File Organization**: Migrated existing files to new structure
- **Upload Interface**: Updated to support new architecture