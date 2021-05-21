#!/usr/bin/env node

const depcheck = require('depcheck')
const resolver = require('../packages/@sanity/resolver')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')

const cwd = path.resolve(process.cwd(), process.argv[2] || '.')

const options = {
  ignoreMatches: [
    '@types/jest',
    'typescript-plugin-css-modules',
    'ts-node',
    'config:sanity',
    'part:@sanity',
    'sanity:*',
  ],
  ignoreDirs: ['lib'],
  detectors: [
    depcheck.detector.exportDeclaration,
    depcheck.detector.extract,
    depcheck.detector.importCallExpression,
    depcheck.detector.importDeclaration,
    depcheck.detector.requireCallExpression,
    depcheck.detector.requireResolveCallExpression,
    depcheck.detector.typescriptImportEqualsDeclaration,
    depcheck.detector.typescriptImportType,
    partsDetector,
  ],
  specials: [
    depcheck.special.bin,
    depcheck.special.eslint,
    depcheck.special.babel,
    depcheck.special.webpack,
    depcheck.special.jest,
    sanityJSONParser,
    partsParser,
    implicitDepsParser,
    depcheckIgnoreParser,
  ],
}

depcheck(cwd, options).then((unused) => {
  const hasUnusedDeps = unused.dependencies.length > 0 || unused.devDependencies.length > 0
  const missing = Object.keys(unused.missing).map((dep) => ({
    name: dep,
    usages: unused.missing[dep],
  }))
  const hasMissingDeps = missing.length > 0
  const hasInvalidFiles = unused.invalidFiles.length > 0
  const hasInvalidDirs = unused.invalidDirs.length > 0
  if (hasUnusedDeps) {
    console.error(
      [
        chalk.bold('Unused dependencies'),
        ...unused.dependencies.map((dep) => `- ${dep}`),
        ...unused.devDependencies.map((dep) => `- ${dep} (dev)`),
      ].join('\n')
    )
  }
  if (hasMissingDeps) {
    console.error(
      [
        chalk.bold('Missing dependencies'),
        ...missing.flatMap((dep) => [
          `- ${dep.name}`,
          '  used by',
          ...dep.usages.map((u) => `    -- ${path.relative(cwd, u)}`),
        ]),
      ].join('\n')
    )
  }
  if (hasInvalidFiles) {
    console.error(
      [chalk.bold('Invalid files'), ...unused.invalidFiles.map((file) => `- ${file}`)].join('\n')
    )
  }
  if (hasInvalidDirs) {
    console.error(
      [chalk.bold('Invalid dirs'), ...unused.invalidDirs.map((file) => `- ${file}`)].join('\n')
    )
  }
  if (hasMissingDeps || hasUnusedDeps || hasInvalidFiles) {
    process.exit(1)
  }
})

const IMPLICIT_DEPS = {
  '@sanity/cli': ['@sanity/core'],
}

function implicitDepsParser(filePath, deps) {
  return deps.flatMap((dep) => IMPLICIT_DEPS[dep] || [])
}

function depcheckIgnoreParser(filePath, deps) {
  const filename = path.basename(filePath)
  if (filename === '.depcheckignore.json') {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')).ignore
  }
  return []
}

function partsDetector(node) {
  return node.type === 'ImportDeclaration' && node.source?.value
    ? getProvidedPackage(node.source.value)
    : []
}

const resolveResult = tryResolve(cwd)

function getProvidedPackage(partId) {
  return (
    resolveResult?.implementations[partId]
      .map((im) => im.plugin)
      .filter((p) => p !== '(project root)') || []
  )
}

function sanityJSONParser(filePath, deps, dir) {
  const filename = path.basename(filePath)
  if (filename === 'sanity.json') {
    const sanityConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return deps.filter((dep) =>
      sanityConfig.plugins.some((plugin) => plugin === dep || dep === `sanity-plugin-${plugin}`)
    )
  }
  return []
}

function partsParser(filePath, deps, dir) {
  const filename = path.basename(filePath)
  if (filename === 'sanity.json') {
    const implementations = resolveResult?.implementations
    return Object.keys(implementations).map((key) => implementations[key].map((impl) => impl.path))
  }
  return []
}

function tryResolve(basePath) {
  try {
    return resolver.resolveParts({basePath, sync: true})
    // eslint-disable-next-line no-empty
  } catch {}
  return null
}
