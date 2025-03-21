import { readdirSync } from 'fs';
import path from 'path';

interface Background {
  name: string;
  path: string;
}

export async function GET() {
  try {
    // This would be the absolute path to your public directory
    const publicDir = path.join(process.cwd(), 'public');
    const backgroundsDir = path.join(publicDir, 'images', 'taustat');
    
    let backgroundFiles: Background[] = [];
    
    try {
      // Read directory to get all background files
      backgroundFiles = readdirSync(backgroundsDir)
        .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
        .map(file => ({
          name: file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          path: `/images/taustat/${file}`
        }));
    } catch (err) {
      console.error('Error reading backgrounds directory:', err);
      backgroundFiles = []; // Fallback to empty array
    }
    
    return new Response(JSON.stringify({
      backgrounds: backgroundFiles
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in backgrounds API:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch background images' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}