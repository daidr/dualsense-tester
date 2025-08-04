import {
  cleanupSVG,
  importDirectory,
  isEmptyColor,
  parseColors,
  runSVGO,
  writeJSONFile,
} from '@iconify/tools'

(async () => {
  const iconSet = await importDirectory('sets', {
    prefix: 'fancy-controller',
  })

  iconSet.forEach((name, type) => {
    if (type !== 'icon') {
      return
    }

    const svg = iconSet.toSVG(name)
    if (!svg) {
      // Invalid icon
      iconSet.remove(name)
      return
    }

    try {
      cleanupSVG(svg)

      parseColors(svg, {
        defaultColor: 'currentColor',
        callback: (attr, colorStr, color) => {
          return !color || isEmptyColor(color)
            ? colorStr
            : 'currentColor'
        },
      })

      runSVGO(svg, {
      })
    }
    catch (err) {
      console.error(`Error parsing ${name}:`, err)
      iconSet.remove(name)
      return
    }

    iconSet.fromSVG(name, svg)
  })

  iconSet.suffixes = {
    '': 'Other',
    'twotone': 'Two-tone',
    'solid': 'Solid',
    'twotone-bordered': 'Two-tone bordered',
    'outline': 'Outline',
  }

  const result = iconSet.export()
  writeJSONFile('icons.json', result)
})()
