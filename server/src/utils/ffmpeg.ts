import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore
import ffmpegStatic from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export default ffmpeg;
