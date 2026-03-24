// Script pour générer les .prm des plugins exemples
// Usage : node examples/build-zip.cjs
//
// Format .prm :
//   [MAGIC_START: "PRISME" 6 octets] [ZIP payload] [MAGIC_END: "BY KÉLIAN" 9 octets]

const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')

const MAGIC_START = Buffer.from([0x50, 0x52, 0x49, 0x53, 0x4D, 0x45])
const MAGIC_END = Buffer.from([0x42, 0x59, 0x20, 0x4B, 0xC9, 0x4C, 0x49, 0x41, 0x4E])

async function buildPrm(dir) {
  const zip = new JSZip()
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8')
    zip.file(file, content)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  // Retirer le magic ZIP "PK" (2 octets) et le remplacer par "PRISME"
  const zipPayload = zipBuffer.slice(2)
  const prm = Buffer.concat([MAGIC_START, zipPayload, MAGIC_END])

  const name = path.basename(dir)
  const outPath = path.join(__dirname, `${name}.prm`)
  fs.writeFileSync(outPath, prm)
  console.log(`-> ${outPath} (${prm.length} octets)`)
}

async function main() {
  const examplesDir = __dirname
  const dirs = fs.readdirSync(examplesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(examplesDir, d.name))

  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) {
      await buildPrm(dir)
    }
  }
}

main().catch(console.error)
