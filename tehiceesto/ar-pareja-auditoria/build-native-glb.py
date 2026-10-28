#!/usr/bin/env python3
"""Create an Android Scene Viewer-compatible Y-up, 40 cm-wide GLB from the original.
Run from any directory. The source GLB is not modified.
"""
from pathlib import Path
import json
import math
import struct

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "relicario.glb"
DEST = HERE / "relicario-ar.glb"
data = SOURCE.read_bytes()
if data[:4] != b"glTF" or struct.unpack_from("<I", data, 4)[0] != 2:
    raise ValueError("Expected GLB 2.0")
json_size, json_type = struct.unpack_from("<II", data, 12)
if json_type != 0x4E4F534A:
    raise ValueError("Missing JSON chunk")
doc = json.loads(data[20:20 + json_size])
position_accessors = [
    doc["accessors"][primitive["attributes"]["POSITION"]]
    for mesh in doc["meshes"]
    for primitive in mesh["primitives"]
    if "POSITION" in primitive["attributes"]
]
bounds = [a for a in position_accessors if "min" in a and "max" in a]
if not bounds:
    raise ValueError("Missing POSITION bounds")
mins = [min(a["min"][axis] for a in bounds) for axis in range(3)]
maxs = [max(a["max"][axis] for a in bounds) for axis in range(3)]
if maxs[2] - mins[2] < .1:
    raise ValueError("Unexpected vertical axis")
width = max(maxs[0] - mins[0], maxs[1] - mins[1])
scale = .40 / width
root = doc["nodes"][doc["scenes"][doc.get("scene", 0)]["nodes"][0]]
if "matrix" in root or "rotation" in root or "scale" in root:
    raise ValueError("Unexpected root transform: avoid double rotation")
root["rotation"] = [-math.sqrt(.5), 0, 0, math.sqrt(.5)]
root["scale"] = [scale, scale, scale]
doc["asset"]["generator"] = "TeHiceEsto native ARCore Y-up author export"
encoded = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
encoded += b" " * (-len(encoded) % 4)
tail = data[20 + json_size:]
output = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(encoded) + len(tail))
output += struct.pack("<I4s", len(encoded), b"JSON") + encoded + tail
DEST.write_bytes(output)
assert struct.unpack_from("<I", output, 8)[0] == len(output)
print(f"Native AR GLB: {len(output)} bytes, width: {scale * width:.3f}m, height: {(maxs[2] - mins[2]) * scale:.3f}m, meshes: {len(doc['meshes'])}")
