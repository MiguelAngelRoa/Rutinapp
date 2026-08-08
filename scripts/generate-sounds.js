const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i]))), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function tone(freq, duration, { volume = 0.4, decay = 0 } = {}) {
  const samples = [];
  const count = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = decay
      ? Math.pow(1 - t / duration, decay)
      : Math.min(1, t / 0.005) * Math.min(1, (duration - t) / 0.01);
    samples.push(volume * envelope * Math.sin(2 * Math.PI * freq * t) * 32767);
  }
  return samples;
}

function silence(duration) {
  return new Array(Math.floor(duration * SAMPLE_RATE)).fill(0);
}

const outDir = path.resolve(__dirname, '..', 'assets', 'sounds');

writeWav(
  path.join(outDir, 'set-done.wav'),
  tone(880, 0.14, { volume: 0.45, decay: 1.2 }),
);

writeWav(
  path.join(outDir, 'rest-finish.wav'),
  [...tone(660, 0.12, { volume: 0.45, decay: 1.2 }), ...silence(0.08), ...tone(990, 0.16, { volume: 0.45, decay: 1.2 })],
);

console.log('Done:', fs.readdirSync(outDir).join(', '));
