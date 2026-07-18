import AppKit
import Foundation

struct IconVariant {
  let canvasSize: Int
  let artworkSize: Int
}

let scriptURL = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
let extensionRoot = scriptURL
  .deletingLastPathComponent()
  .deletingLastPathComponent()
let repositoryRoot = extensionRoot
  .deletingLastPathComponent()
  .deletingLastPathComponent()
let sourceURL = repositoryRoot
  .appendingPathComponent("apps/mobile/assets/images/splash-icon.png")
let outputDirectory = extensionRoot.appendingPathComponent("public/images")

let variants = [
  IconVariant(canvasSize: 16, artworkSize: 20),
  IconVariant(canvasSize: 32, artworkSize: 39),
  IconVariant(canvasSize: 48, artworkSize: 59),
  IconVariant(canvasSize: 64, artworkSize: 79),
  IconVariant(canvasSize: 128, artworkSize: 118),
  IconVariant(canvasSize: 256, artworkSize: 236),
]

guard let sourceImage = NSImage(contentsOf: sourceURL) else {
  fputs("Unable to load canonical icon at \(sourceURL.path)\n", stderr)
  exit(1)
}

try FileManager.default.createDirectory(
  at: outputDirectory,
  withIntermediateDirectories: true
)

for variant in variants {
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: variant.canvasSize,
    pixelsHigh: variant.canvasSize,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    fputs("Unable to create \(variant.canvasSize)x\(variant.canvasSize) canvas\n", stderr)
    exit(1)
  }

  guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Unable to create graphics context\n", stderr)
    exit(1)
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  context.imageInterpolation = .high
  NSColor.clear.setFill()
  NSRect(
    x: 0,
    y: 0,
    width: variant.canvasSize,
    height: variant.canvasSize
  ).fill()

  let inset = CGFloat(variant.canvasSize - variant.artworkSize) / 2
  sourceImage.draw(
    in: NSRect(
      x: inset,
      y: inset,
      width: CGFloat(variant.artworkSize),
      height: CGFloat(variant.artworkSize)
    ),
    from: .zero,
    operation: .sourceOver,
    fraction: 1
  )
  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()

  guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Unable to encode icon\n", stderr)
    exit(1)
  }

  let outputURL = outputDirectory
    .appendingPathComponent("icon\(variant.canvasSize).png")
  try pngData.write(to: outputURL, options: .atomic)
  print("Generated \(outputURL.lastPathComponent)")
}
