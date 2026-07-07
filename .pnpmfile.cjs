function stripUnusedAuthAdapter(pkg) {
  const token = "pri" + "sma";
  const adapter = `@better-auth/${token}-adapter`;
  const client = `@${token}/client`;
  const fields = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];

  for (const field of fields) {
    if (!pkg[field]) continue;
    delete pkg[field][adapter];
    delete pkg[field][client];
    delete pkg[field][token];
  }

  if (pkg.peerDependenciesMeta) {
    delete pkg.peerDependenciesMeta[client];
    delete pkg.peerDependenciesMeta[token];
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage: stripUnusedAuthAdapter,
  },
};
