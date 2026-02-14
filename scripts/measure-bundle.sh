#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="${1:-dist}"
OUTPUT="${2:-bundle-size.json}"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: $DIST_DIR does not exist. Run 'pnpm build' first." >&2
  exit 1
fi

# Total size of JS/CSS/HTML files in bytes
total=0
while IFS= read -r -d '' f; do
  size=$(wc -c < "$f")
  total=$((total + size))
done < <(find "$DIST_DIR" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -print0)

# Per-chunk JS sizes
chunks="{"
first=true
if [ -d "$DIST_DIR/assets" ]; then
  for f in "$DIST_DIR"/assets/*.js; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    size=$(wc -c < "$f")
    if [ "$first" = true ]; then
      first=false
    else
      chunks="$chunks,"
    fi
    chunks="$chunks \"$name\": $size"
  done
fi
chunks="$chunks }"

cat > "$OUTPUT" <<EOF
{
  "total_bytes": $total,
  "chunks": $chunks
}
EOF

echo "Bundle size measured: total=${total} bytes -> $OUTPUT"
