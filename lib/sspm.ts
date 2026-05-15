const MAGIC_0 = 0x53;
const MAGIC_1 = 0x53;
const MAGIC_2 = 0x2b;
const MAGIC_3 = 0x6d;

export type ExtractedAudio = { data: Uint8Array<ArrayBuffer>; mime: string };
export type SspmNote = { ms: number; x: number; y: number };
export type ParsedSspmNotes = { notes: SspmNote[]; lastMs: number };

function checkMagic(buf: Uint8Array<ArrayBuffer>) {
  if (buf.length < 8) throw new Error("file too short");
  if (buf[0] !== MAGIC_0 || buf[1] !== MAGIC_1 || buf[2] !== MAGIC_2 || buf[3] !== MAGIC_3) {
    const got = new TextDecoder().decode(buf.subarray(0, 4));
    throw new Error(`bad magic (got "${got}")`);
  }
}

export function parseSspmAudio(buf: Uint8Array<ArrayBuffer>): ExtractedAudio | null {
  checkMagic(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const version = dv.getUint16(4, true);
  if (version === 2) return audioV2(buf, dv);
  if (version === 1) return audioV1(buf, dv);
  throw new Error(`unsupported sspm version ${version}`);
}

export function parseSspmNotes(buf: Uint8Array<ArrayBuffer>): ParsedSspmNotes {
  checkMagic(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const version = dv.getUint16(4, true);
  if (version === 2) return notesV2(buf, dv);
  if (version === 1) return notesV1(buf, dv);
  throw new Error(`unsupported sspm version ${version}`);
}

function audioV2(buf: Uint8Array<ArrayBuffer>, dv: DataView): ExtractedAudio | null {
  if (buf.length < 128) throw new Error("v2: header truncated");
  if (!buf[45]) return null;
  const audioOffset = Number(dv.getBigUint64(64, true));
  const audioLength = Number(dv.getBigUint64(72, true));
  if (audioLength <= 0) return null;
  if (audioOffset + audioLength > buf.length) throw new Error("v2: audio pointer out of range");
  const data = buf.subarray(audioOffset, audioOffset + audioLength);
  return { data, mime: sniffAudioMime(data) };
}

function notesV2(buf: Uint8Array<ArrayBuffer>, dv: DataView): ParsedSspmNotes {
  if (buf.length < 128) throw new Error("v2: header truncated");
  const lastMs = dv.getUint32(30, true);
  const markersOffset = Number(dv.getBigUint64(112, true));
  const markersLength = Number(dv.getBigUint64(120, true));
  const end = markersOffset + markersLength;
  if (end > buf.length) throw new Error("v2: markers out of range");
  const notes: SspmNote[] = [];
  let p = markersOffset;
  while (p + 5 <= end) {
    const ms = dv.getUint32(p, true); p += 4;
    const type = buf[p++]!;
    if (type !== 0) break;
    if (p + 1 > end) break;
    const isFloat = buf[p++]!;
    if (isFloat) {
      if (p + 8 > end) break;
      const x = dv.getFloat32(p, true); p += 4;
      const y = dv.getFloat32(p, true); p += 4;
      notes.push({ ms, x, y });
    } else {
      if (p + 2 > end) break;
      notes.push({ ms, x: buf[p++]!, y: buf[p++]! });
    }
  }
  notes.sort((a, b) => a.ms - b.ms);
  return { notes, lastMs };
}

function audioV1(buf: Uint8Array<ArrayBuffer>, dv: DataView): ExtractedAudio | null {
  const w = walkV1ToAudio(buf, dv);
  if (!w || w.audioLength <= 0) return null;
  if (w.audioStart + w.audioLength > buf.length) throw new Error("v1: audio data truncated");
  const data = buf.subarray(w.audioStart, w.audioStart + w.audioLength);
  return { data, mime: sniffAudioMime(data) };
}

function notesV1(buf: Uint8Array<ArrayBuffer>, dv: DataView): ParsedSspmNotes {
  const w = walkV1ToAudio(buf, dv);
  if (!w) throw new Error("v1: walk failed");
  let p = w.audioStart + (w.audioLength > 0 ? w.audioLength : 0);
  const notes: SspmNote[] = [];
  for (let i = 0; i < w.noteCount; i++) {
    if (p + 5 > buf.length) break;
    const ms = dv.getUint32(p, true); p += 4;
    const isQuantum = buf[p++]!;
    if (isQuantum) {
      if (p + 8 > buf.length) break;
      const x = dv.getFloat32(p, true); p += 4;
      const y = dv.getFloat32(p, true); p += 4;
      notes.push({ ms, x, y });
    } else {
      if (p + 2 > buf.length) break;
      notes.push({ ms, x: buf[p++]!, y: buf[p++]! });
    }
  }
  notes.sort((a, b) => a.ms - b.ms);
  return { notes, lastMs: w.lastMs };
}

type V1Walk = { audioStart: number; audioLength: number; noteCount: number; lastMs: number };

function walkV1ToAudio(buf: Uint8Array<ArrayBuffer>, dv: DataView): V1Walk | null {
  let pos = 8;
  for (let i = 0; i < 3; i++) {
    const nl = buf.indexOf(0x0a, pos);
    if (nl < 0) throw new Error("v1: missing string terminator");
    pos = nl + 1;
  }
  if (pos + 9 > buf.length) throw new Error("v1: header truncated");
  const lastMs = dv.getUint32(pos, true);
  const noteCount = dv.getUint32(pos + 4, true);
  pos += 9;
  const coverType = buf[pos++]!;
  if (coverType === 1) {
    if (pos + 14 > buf.length) throw new Error("v1: legacy cover header truncated");
    const clen = Number(dv.getBigUint64(pos + 6, true));
    pos = pos + 14 + clen;
  } else if (coverType === 2) {
    if (pos + 8 > buf.length) throw new Error("v1: cover header truncated");
    const clen = Number(dv.getBigUint64(pos, true));
    pos = pos + 8 + clen;
  } else if (coverType !== 0) {
    throw new Error(`v1: unknown cover type ${coverType}`);
  }
  if (pos >= buf.length) throw new Error("v1: missing audio flag");
  const audioType = buf[pos++]!;
  if (audioType !== 1) {
    return { audioStart: pos, audioLength: 0, noteCount, lastMs };
  }
  if (pos + 8 > buf.length) throw new Error("v1: audio length truncated");
  const audioLength = Number(dv.getBigUint64(pos, true));
  pos += 8;
  return { audioStart: pos, audioLength, noteCount, lastMs };
}

function sniffAudioMime(d: Uint8Array): string {
  if (d.length >= 3 && d[0] === 0x49 && d[1] === 0x44 && d[2] === 0x33) return "audio/mpeg";
  if (d.length >= 2 && d[0] === 0xff && (d[1]! & 0xe0) === 0xe0) return "audio/mpeg";
  if (d.length >= 4 && d[0] === 0x4f && d[1] === 0x67 && d[2] === 0x67 && d[3] === 0x53) return "audio/ogg";
  if (d.length >= 4 && d[0] === 0x52 && d[1] === 0x49 && d[2] === 0x46 && d[3] === 0x46) return "audio/wav";
  if (d.length >= 4 && d[0] === 0x66 && d[1] === 0x4c && d[2] === 0x61 && d[3] === 0x43) return "audio/flac";
  return "application/octet-stream";
}
