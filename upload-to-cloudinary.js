const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

// Configure via environment variables or edit directly here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Load current albums from albums.js
const albumsContent = fs.readFileSync('albums.js', 'utf8');
const fn = new Function(albumsContent + '; return ALBUMS;');
const albums = fn();

// Collect every unique local image path
const allPaths = new Set();
albums.forEach(album => {
  allPaths.add(album.preview);
  album.files.forEach(f => allPaths.add(f.src));
});

const urlMap = {};
const MAX_BYTES = 9 * 1024 * 1024; // 9MB — stay under Cloudinary's 10MB limit

function resizeIfNeeded(localPath) {
  const size = fs.statSync(localPath).size;
  if (size <= MAX_BYTES) return localPath;

  // Write resized copy to a temp file
  const ext = path.extname(localPath);
  const tmp = path.join(os.tmpdir(), 'cld_upload' + ext);
  execSync(`sips -Z 3000 "${localPath}" --out "${tmp}" > /dev/null 2>&1`);
  return tmp;
}

async function uploadAll() {
  const paths = Array.from(allPaths);
  console.log(`Uploading ${paths.length} images to Cloudinary...\n`);

  for (const localPath of paths) {
    // Skip already-uploaded paths (resume support)
    if (urlMap[localPath]) continue;

    const publicId = 'lowlightcrtv/' + localPath
      .replace(/^imgs\//, '')
      .replace(/\.[^.]+$/, '')
      .replace(/\s+/g, '_');

    process.stdout.write(`  ${localPath} ... `);
    try {
      const uploadPath = resizeIfNeeded(localPath);
      const result = await cloudinary.uploader.upload(uploadPath, {
        public_id: publicId,
        overwrite: false,
        resource_type: 'auto',
      });
      urlMap[localPath] = result.secure_url;
      console.log('done');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  // Rebuild albums structure with Cloudinary URLs
  const newAlbums = albums.map(album => ({
    slug: album.slug,
    name: album.name,
    preview: urlMap[album.preview],
    files: album.files.map(f => ({ src: urlMap[f.src] })),
  }));

  fs.writeFileSync('albums.json', JSON.stringify({ albums: newAlbums }, null, 2));
  console.log('\nAll done. albums.json written with Cloudinary URLs.');
}

uploadAll().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
