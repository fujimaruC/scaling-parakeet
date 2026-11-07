"""Deterministic platform-free pixel-star PNGs; public identity, no user data."""
import struct
import zlib
from pathlib import Path
STAR = ['000010000','000010000','000111000','111111111','011111110','001111100','011101110','011000110','110000011']
def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
def icon(size):
    # Keep all artwork inside the maskable safe circle (central 60% square).
    scale = size // 18
    start = (size - 9 * scale) // 2
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            a, b = (x - start) // scale, (y - start) // scale
            ink = 0 <= a < 9 and 0 <= b < 9 and STAR[b][a] == '1'
            row.extend((47,84,235) if ink else (244,242,236))
        rows.append(row)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(b''.join(rows),9)) + chunk(b'IEND',b'')
if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'apps/web/public'
    for size in (192,512):
        (root / f'icon-{size}.png').write_bytes(icon(size))
