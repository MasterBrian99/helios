// @ts-check
/** @type {import("lage").ConfigFileOptions} */
const config = {
  // Define your tasks and their dependencies here
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
  },
  npmClient: "pnpm",
  // Update these according to your repo's build setup
  cacheOptions: {
    // Generated files in each package that will be saved into the cache
    // (relative to package root; folders must end with **/*)
    outputGlob: ["lib/**/*"],
    // Changes to any of these files/globs will invalidate the cache (relative to repo root;
    // folders must end with **/*). This should include your lock file and any other repo-wide
    // configs or scripts that are outside a package but could invalidate previous output.
    environmentGlob: ["package.json","pnpm-lock.yaml","lage.config.js"],
  },
};
module.exports = config;
