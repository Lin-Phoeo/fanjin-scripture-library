import hashlib, json, pathlib, stat, zipfile
root = pathlib.Path(__file__).resolve().parent
archive = root / "hey_my_buddy-0.69.7-py3-none-any.whl"
expected = "1d94fdeed44b3bc8e7c08f16d44ce559d51f6e11672a13ae51508b2532ab424b"
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected
destination = root / "hmb-0.69.7"
assert not destination.exists(), "Refuse to overwrite existing extraction"
with zipfile.ZipFile(archive) as wheel:
    for member in wheel.infolist():
        relative = pathlib.PurePosixPath(member.filename)
        assert not relative.is_absolute() and ".." not in relative.parts and ":" not in member.filename
        assert not stat.S_ISLNK(member.external_attr >> 16), "No symlink extraction"
        target = (destination / member.filename).resolve()
        assert target.is_relative_to(destination.resolve())
    wheel.extractall(destination)
manifest = {"file":archive.name, "sha256":expected, "destination":destination.name, "files":len(wheel.infolist()), "executedPackage":False}
(root / "hmb-extraction.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
print(json.dumps(manifest))
