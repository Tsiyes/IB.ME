/**
 * Convert Roboto Mono TTFs → subset typeface JSON for Three.FontLoader.
 *
 * Usage:
 *   npm i -D opentype.js@1.3.4
 *   node scripts/convert-engrave-fonts.mjs path/to/RobotoMono-Bold.ttf path/to/RobotoMono-Medium.ttf
 *
 * Only glyphs needed for the faceplate engraving are kept (~36), matching the
 * cheap Helvetiker JSON path (no runtime TTFLoader / CDN opentype.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import opentype from 'opentype.js'

const NEED = new Set(
  Array.from('ISAAC BRISTOWIMPLEMENTATION/PRODUCT/QA/HEALTHCAREisaaclbristow@gmail.com.-_'),
)
NEED.add(' ')

function convert(font, keep) {
  const round = Math.round
  const glyphs = {}
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72)
  const glyphIndexMap = font.encoding.cmap.glyphIndexMap
  for (const unicode of Object.keys(glyphIndexMap)) {
    const ch = String.fromCodePoint(Number(unicode))
    if (keep && !keep.has(ch)) continue
    const glyph = font.glyphs.glyphs[glyphIndexMap[unicode]]
    if (!glyph) continue
    const token = {
      ha: round(glyph.advanceWidth * scale),
      x_min: round((glyph.xMin ?? 0) * scale),
      x_max: round((glyph.xMax ?? 0) * scale),
      o: '',
    }
    for (const command of glyph.path?.commands || []) {
      let type = command.type.toLowerCase()
      if (type === 'c') type = 'b'
      token.o += `${type} `
      if (command.x !== undefined && command.y !== undefined) {
        token.o += `${round(command.x * scale)} ${round(command.y * scale)} `
      }
      if (command.x1 !== undefined && command.y1 !== undefined) {
        token.o += `${round(command.x1 * scale)} ${round(command.y1 * scale)} `
      }
      if (command.x2 !== undefined && command.y2 !== undefined) {
        token.o += `${round(command.x2 * scale)} ${round(command.y2 * scale)} `
      }
    }
    glyphs[ch] = token
  }
  return {
    glyphs,
    familyName: font.names?.fullName?.en || font.names?.fontFamily?.en || 'Roboto Mono',
    ascender: round(font.ascender * scale),
    descender: round(font.descender * scale),
    underlinePosition: font.tables.post.underlinePosition,
    underlineThickness: font.tables.post.underlineThickness,
    boundingBox: {
      xMin: font.tables.head.xMin,
      xMax: font.tables.head.xMax,
      yMin: font.tables.head.yMin,
      yMax: font.tables.head.yMax,
    },
    resolution: 1000,
    original_font_information: font.tables.name,
  }
}

const [boldPath, mediumPath] = process.argv.slice(2)
if (!boldPath || !mediumPath) {
  console.error('Usage: node scripts/convert-engrave-fonts.mjs Bold.ttf Medium.ttf')
  process.exit(1)
}

const outDir = path.resolve('src/assets/fonts')
fs.mkdirSync(outDir, { recursive: true })

for (const [src, name] of [
  [boldPath, 'RobotoMono-Bold.typeface.json'],
  [mediumPath, 'RobotoMono-Medium.typeface.json'],
]) {
  const font = opentype.parse(fs.readFileSync(src).buffer)
  const json = convert(font, NEED)
  const dest = path.join(outDir, name)
  fs.writeFileSync(dest, JSON.stringify(json))
  console.log('wrote', dest, Object.keys(json.glyphs).length, 'glyphs', fs.statSync(dest).size, 'bytes')
}
