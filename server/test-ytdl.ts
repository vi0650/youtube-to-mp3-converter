import ytdl from '@distube/ytdl-core';

async function test() {
    const url = 'https://www.youtube.com/watch?v=aBlsrtxuwss';
    try {
        console.log('Testing metadata...');
        const info = await ytdl.getBasicInfo(url, {
            requestOptions: {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                }
            }
        });
        console.log('Title:', info.videoDetails.title);
        
        console.log('Testing stream...');
        const stream = ytdl(url, { filter: 'audioonly' });
        stream.on('response', (res) => {
            console.log('Response status:', res.statusCode);
            process.exit(0);
        });
        stream.on('error', (err) => {
            console.error('Stream Error:', err);
            process.exit(1);
        });
    } catch (e) {
        console.error('General Error:', e);
        process.exit(1);
    }
}

test();
